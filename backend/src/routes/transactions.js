const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { db, admin } = require('../config/firebase');
const { verifySignature } = require('../utils/crypto');
const verifyToken = require('../middleware/auth');
const { syncSchema } = require('../middleware/validation');
const razorpay = require('../config/razorpay');

// Rate limiter for sync: 10 requests per minute
const syncLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: { success: false, error_code: 'RATE_LIMIT_EXCEEDED', message: 'Too many sync attempts' }
});

const { settleOfflineToken } = require('../services/syncService');

// POST /api/transactions/validate - Process a single transaction token
router.post('/validate', verifyToken, syncLimiter, syncSchema, async (req, res) => {
    const { txn } = req.body;

    try {
        const result = await settleOfflineToken(txn);
        res.json({ 
            success: true, 
            txnId: txn.id, 
            status: result.status, 
            payoutId: result.payoutId 
        });
    } catch (error) {
        console.error('Sync Error:', error.message);
        const errorCode = error.message.split(':')[0] || 'SERVER_ERROR';
        res.json({ 
            success: false, 
            error_code: errorCode, 
            message: error.message 
        });
    }
});

// GET /api/transactions/history
// GET /api/transactions/history
router.get('/history', verifyToken, async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    try {
        const txnsSnapshot = await db.collection('transactions')
            .where('senderId', '==', req.user.id)
            .orderBy('settledAt', 'desc')
            .limit(parseInt(limit))
            .get();

        const txns = txnsSnapshot.docs.map(doc => doc.data());
        res.json({ success: true, transactions: txns });
    } catch (error) {
        res.status(500).json({ success: false, error_code: 'SERVER_ERROR' });
    }
});

// POST /api/transactions/report
router.post('/report', verifyToken, async (req, res) => {
    const { txnId, reason, metadata } = req.body;
    try {
        await db.collection('reports').add({
            txnId,
            reason,
            metadata,
            reportedBy: req.user.id,
            reportedAt: new Date().toISOString()
        });
        res.json({ success: true, message: 'Report submitted' });
    } catch (error) {
        res.status(500).json({ success: false, error_code: 'SERVER_ERROR' });
    }
});

module.exports = router;
