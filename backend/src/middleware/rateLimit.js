const rateLimit = require('express-rate-limit');

const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { success: false, error_code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' }
});

const syncLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Limit sync attempts
    message: { success: false, error_code: 'SYNC_RATE_LIMIT', message: 'Too many sync attempts' }
});

module.exports = { standardLimiter, syncLimiter };
