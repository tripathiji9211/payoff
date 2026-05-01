const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const verifyToken = require('../middleware/auth');
const razorpay = require('../config/razorpay');

// GET /api/wallet/balance
router.get('/balance', verifyToken, async (req, res) => {
    try {
        const userRef = db.collection('users').doc(req.user.id);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error_code: 'USER_NOT_FOUND' });
        }

        res.json({
            success: true,
            balance: doc.data().balance
        });
    } catch (error) {
        res.status(500).json({ success: false, error_code: 'SERVER_ERROR' });
    }
});

// POST /api/wallet/add-money
router.post('/add-money', verifyToken, async (req, res) => {
    const { amount } = req.body; // Amount in paise

    if (!amount || amount < 100) {
        return res.status(400).json({ success: false, message: 'Invalid amount (min ₹1)' });
    }

    try {
        const options = {
            amount: amount,
            currency: "INR",
            receipt: `topup_${req.user.id}_${Date.now()}`,
            notes: {
                userId: req.user.id
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency
        });
    } catch (error) {
        console.error('Razorpay Order Error:', error);
        res.status(500).json({ success: false, error_code: 'PAYMENT_ERROR', message: 'Failed to create order' });
    }
});

module.exports = router;
