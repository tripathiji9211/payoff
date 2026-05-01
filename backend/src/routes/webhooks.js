const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db, admin } = require('../config/firebase');

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

/**
 * Validates the Razorpay webhook signature
 */
const validateWebhookSignature = (body, signature, secret) => {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
    return expectedSignature === signature;
};

/**
 * Credits the receiver's Firestore balance after a successful payout
 */
async function creditReceiver(txnId) {
    const txnRef = db.collection('transactions').doc(txnId);
    const txnDoc = await txnRef.get();
    if (txnDoc.exists) {
        const { receiverId, amount } = txnDoc.data();
        const receiverRef = db.collection('users').doc(receiverId);
        await receiverRef.update({
            balance: admin.firestore.FieldValue.increment(amount)
        });
        console.log(`Credited receiver ${receiverId} for txn ${txnId}`);
    }
}

/**
 * Refunds the sender's Firestore balance after a failed payout
 */
async function refundSender(txnId) {
    const txnRef = db.collection('transactions').doc(txnId);
    const txnDoc = await txnRef.get();
    if (txnDoc.exists) {
        const { senderId, amount } = txnDoc.data();
        const senderRef = db.collection('users').doc(senderId);
        await senderRef.update({
            balance: admin.firestore.FieldValue.increment(amount)
        });
        console.log(`Refunded sender ${senderId} for txn ${txnId}`);
        await txnRef.update({ status: 'FAILED', settledAt: new Date().toISOString() });
    }
}

// POST /api/webhooks/razorpay
// Use express.raw() to get the raw body for signature verification
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body.toString();

    if (!validateWebhookSignature(rawBody, signature, WEBHOOK_SECRET)) {
        console.warn('Invalid Razorpay Webhook Signature');
        return res.status(400).send('Invalid signature');
    }

    let event;
    try {
        event = JSON.parse(rawBody);
    } catch (e) {
        return res.status(400).send('Invalid JSON');
    }

    const eventName = event.event;
    const payload = event.payload;

    try {
        if (eventName === 'payout.processed') {
            const txnId = payload.payout.entity.reference_id;
            // Mark COMPLETED, credit receiver
            await db.collection('transactions').doc(txnId).update({
                status: 'COMPLETED',
                settledAt: new Date().toISOString()
            });
            await creditReceiver(txnId);
        }
        
        if (eventName === 'payout.failed') {
            const txnId = payload.payout.entity.reference_id;
            // Mark FAILED, refund sender
            await refundSender(txnId);
        }

        if (eventName === 'payment.captured') {
            const payment = payload.payment.entity;
            const userId = payment.notes ? payment.notes.userId : null;
            if (userId) {
                const amountRupees = payment.amount / 100;
                await db.collection('users').doc(userId).update({
                    balance: admin.firestore.FieldValue.increment(amountRupees)
                });
                console.log(`Wallet top-up successful for ${userId}: ₹${amountRupees}`);
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
