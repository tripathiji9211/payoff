const fraudService = require('../services/fraudService');

const fraudCheck = async (req, res, next) => {
    const { senderId, amount } = req.body.txn || {};
    
    if (!senderId || !amount) return next();

    try {
        await fraudService.validateTransaction(senderId, amount);
        next();
    } catch (error) {
        res.status(403).json({
            success: false,
            error_code: error.message.split(':')[0] || 'FRAUD_CHECK_FAILED',
            message: error.message
        });
    }
};

module.exports = fraudCheck;
