const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { db } = require('../config/firebase');

// POST /api/merchant/generate-qr
router.post('/generate-qr', verifyToken, async (req, res) => {
    const { amount, note } = req.body;
    
    try {
        const merchantRef = db.collection('merchants').doc(req.user.id);
        const doc = await merchantRef.get();

        if (!doc.exists) {
            return res.status(403).json({ success: false, message: 'Not a registered merchant' });
        }

        const qrData = {
            merchantId: req.user.id,
            businessName: doc.data().businessName,
            upiId: doc.data().upiId,
            amount: amount,
            note: note,
            timestamp: Date.now()
        };

        // In a real app, you might sign this or store it
        res.json({ success: true, qrData });
    } catch (error) {
        res.status(500).json({ success: false, error_code: 'SERVER_ERROR' });
    }
});

// GET /api/merchant/analytics
router.get('/analytics', verifyToken, async (req, res) => {
    try {
        const txnsSnapshot = await db.collection('transactions')
            .where('receiverId', '==', req.user.id)
            .get();

        let totalVolume = 0;
        let txnCount = 0;
        txnsSnapshot.forEach(doc => {
            totalVolume += doc.data().amount;
            txnCount++;
        });

        res.json({
            success: true,
            analytics: {
                totalVolume,
                txnCount,
                period: 'ALL_TIME'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error_code: 'SERVER_ERROR' });
    }
});

module.exports = router;
