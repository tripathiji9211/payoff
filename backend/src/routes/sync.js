const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { syncLimiter } = require('../middleware/rateLimit');
const fraudCheck = require('../middleware/fraudCheck');
const { settleOfflineToken } = require('../services/syncService');

// POST /api/sync/validate - Process a single transaction token
router.post('/validate', verifyToken, syncLimiter, fraudCheck, async (req, res) => {
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
        res.status(400).json({ 
            success: false, 
            error_code: errorCode, 
            message: error.message 
        });
    }
});

// POST /api/sync/batch - Sync multiple transactions at once
router.post('/batch', verifyToken, syncLimiter, async (req, res) => {
    const { txns } = req.body;

    if (!Array.isArray(txns)) {
        return res.status(400).json({ success: false, message: 'Expected array of transactions' });
    }

    const results = [];
    for (const txn of txns) {
        try {
            const result = await settleOfflineToken(txn);
            results.push({ txnId: txn.id, success: true, status: result.status });
        } catch (error) {
            results.push({ txnId: txn.id, success: false, error: error.message });
        }
    }

    res.json({ success: true, results });
});

module.exports = router;
