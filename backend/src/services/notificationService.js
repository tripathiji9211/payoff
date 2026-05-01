const { admin } = require('../config/firebase');

class NotificationService {
    /**
     * Sends a push notification via FCM
     */
    async sendPushNotification(userId, title, body, data = {}) {
        try {
            const userRef = admin.firestore().collection('users').doc(userId);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) return;
            
            const fcmToken = userDoc.data().fcmToken;
            if (!fcmToken) return;

            const message = {
                notification: { title, body },
                data: data,
                token: fcmToken
            };

            const response = await admin.messaging().send(message);
            console.log('Successfully sent message:', response);
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }

    /**
     * Helper for payment alerts
     */
    async sendPaymentAlert(userId, amount, status) {
        const title = status === 'COMPLETED' ? 'Payment Successful' : 'Payment Failed';
        const body = status === 'COMPLETED' 
            ? `You have successfully paid ₹${amount}.`
            : `Your payment of ₹${amount} failed.`;
            
        await this.sendPushNotification(userId, title, body, { type: 'PAYMENT_STATUS', status });
    }
}

module.exports = new NotificationService();
