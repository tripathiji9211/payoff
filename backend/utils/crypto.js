const CryptoJS = require('crypto-js');

const generateSignature = (data) => {
    // Systematic secret for signing (must match frontend for verification)
    const SECRET = 'offline_pay_system_signature_secret_2026';
    return CryptoJS.SHA256(JSON.stringify(data) + SECRET).toString();
};

const verifySignature = (data, signature) => {
    const expectedSignature = generateSignature(data);
    return expectedSignature === signature;
};

module.exports = {
    generateSignature,
    verifySignature
};
