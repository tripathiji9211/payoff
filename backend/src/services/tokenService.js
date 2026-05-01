const CryptoJS = require('crypto-js');

const SYSTEM_SECRET = process.env.TOKEN_SECRET || 'offline_pay_production_secret_2026';

class TokenService {
    /**
     * Verifies the cryptographic signature of an offline token
     * @param {Object} token - The transaction token
     * @param {string} signature - The signature to verify
     */
    verifyTokenSignature(token, signature) {
        const dataToSign = JSON.stringify({
            id: token.id,
            senderId: token.senderId,
            senderName: token.senderName,
            amount: token.amount,
            timestamp: token.timestamp,
            expiresAt: token.expiresAt,
            type: token.type
        });
        
        const expectedSignature = CryptoJS.SHA256(dataToSign + SYSTEM_SECRET).toString();
        return expectedSignature === signature;
    }

    /**
     * Decrypts an encrypted token (if applicable)
     */
    decryptToken(encryptedData, key) {
        const bytes = CryptoJS.AES.decrypt(encryptedData, key);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    }

    /**
     * Generates a hash for token tracking
     */
    generateTokenHash(token) {
        return CryptoJS.SHA256(JSON.stringify(token)).toString();
    }
}

module.exports = new TokenService();
