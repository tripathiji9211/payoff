const { db } = require('../config/firebase');

class FraudService {
    /**
     * Checks if a transaction is fraudulent based on rules
     */
    async validateTransaction(senderId, amount) {
        const userRef = db.collection('users').doc(senderId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) throw new Error('ERR_007: User not found');
        
        const userData = userDoc.data();

        // 1. Check if account is frozen
        if (userData.status === 'FROZEN') {
            throw new Error('ERR_005: Account frozen');
        }

        // 2. Check daily limit (rule engine)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dailyTxns = await db.collection('transactions')
            .where('senderId', '==', senderId)
            .where('settledAt', '>=', today.toISOString())
            .get();

        let dailyTotal = 0;
        dailyTxns.forEach(doc => {
            dailyTotal += doc.data().amount;
        });

        const DAILY_LIMIT = userData.dailyLimit || 50000; // Default 50k
        if (dailyTotal + amount > DAILY_LIMIT) {
            throw new Error('ERR_006: Daily limit exceeded');
        }

        // 3. Trust Score Check
        if (userData.trustScore < 30) {
            // Low trust score requires manual review or higher scrutiny
            // For now, we just log it
            console.warn(`Low trust score for user ${senderId}: ${userData.trustScore}`);
        }

        return true;
    }

    /**
     * Updates trust score after a transaction
     */
    async updateTrustScore(userId, delta) {
        const userRef = db.collection('users').doc(userId);
        await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const currentScore = doc.data().trustScore || 50;
            t.update(userRef, { trustScore: Math.max(0, Math.min(100, currentScore + delta)) });
        });
    }
}

module.exports = new FraudService();
