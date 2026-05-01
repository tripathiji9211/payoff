const { db, admin } = require('../config/firebase');
const razorpay = require('../config/razorpay');
const { verifySignature } = require('../utils/crypto');

/**
 * Settles an offline transaction token via Razorpay Payouts
 * @param {Object} token - The transaction token data
 */
async function settleOfflineToken(token) {
    const { id, signature, expiresAt, senderId, receiverId, amount } = token;

    // Step 1: Verify token integrity
    const signedFields = {
        id: token.id,
        senderId: token.senderId,
        senderName: token.senderName,
        amount: token.amount,
        timestamp: token.timestamp,
        expiresAt: token.expiresAt,
        type: token.type
    };
    const isValid = verifySignature(signedFields, signature);
    if (!isValid) throw new Error('ERR_001: Invalid signature');

    // Step 2: Check token not expired
    if (Date.now() > new Date(expiresAt).getTime()) {
        throw new Error('ERR_002: Token expired');
    }

    // Step 3: Check duplicate in Firestore
    const usedRef = db.collection('usedTokens').doc(id);
    const usedDoc = await usedRef.get();
    if (usedDoc.exists) throw new Error('ERR_004: Duplicate transaction');

    // Step 4: Check sender balance in Firestore
    const senderRef = db.collection('users').doc(senderId);
    const senderDoc = await senderRef.get();
    if (!senderDoc.exists || senderDoc.data().balance < amount) {
        throw new Error('ERR_003: Insufficient balance');
    }

    // Get Receiver's Fund Account ID
    const receiverRef = db.collection('users').doc(receiverId);
    const receiverDoc = await receiverRef.get();
    if (!receiverDoc.exists) throw new Error('ERR_005: Receiver not found');
    
    const receiverFundAccountId = receiverDoc.data().razorpay_fund_account_id;
    if (!receiverFundAccountId) throw new Error('ERR_006: Receiver payment not setup');

    // Step 5: Call Razorpay Payout API
    const payout = await razorpay.payouts.create({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: receiverFundAccountId,
        amount: amount * 100, // convert to paise
        currency: 'INR',
        mode: 'UPI',
        purpose: 'payout',
        reference_id: id,
        narration: `OfflinePay ${id.slice(0, 8)}`
    });

    // Step 6: Mark token as used (prevent replay)
    await usedRef.set({
        processedAt: Date.now(),
        payoutId: payout.id,
        status: 'PROCESSING'
    });

    // Step 7: Debit sender in Firestore (Temporary debit until processed or failed)
    await senderRef.update({
        balance: admin.firestore.FieldValue.increment(-amount)
    });

    // Record the transaction in history
    await db.collection('transactions').doc(id).set({
        ...token,
        status: 'PROCESSING',
        razorpay_payout_id: payout.id,
        settledAt: new Date().toISOString()
    });

    return { status: 'PROCESSING', payoutId: payout.id };
}

module.exports = {
    settleOfflineToken
};
