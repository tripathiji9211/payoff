import CryptoJS from 'crypto-js';

// Fallback key if PIN is not provided (shouldn't happen in the new flow)
const DEFAULT_KEY = 'offline_pay_secure_fallback_key';

export const encryptToken = (data, pin) => {
    const key = pin || DEFAULT_KEY;
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

export const decryptToken = (token, pin) => {
    try {
        const key = pin || DEFAULT_KEY;
        const bytes = CryptoJS.AES.decrypt(token, key);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedString) return null;
        return JSON.parse(decryptedString);
    } catch (error) {
        console.error('Decryption failed:', error);
        return null;
    }
};

export const generateSignature = (data) => {
    // Systematic secret for signing (must match across app for verification)
    const SECRET = 'offline_pay_system_signature_secret_2026';
    return CryptoJS.SHA256(JSON.stringify(data) + SECRET).toString();
};
