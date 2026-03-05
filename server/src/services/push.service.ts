import * as admin from 'firebase-admin';
import pool from '../config/database';

try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath) {
        // Build the absolute path from the project root or use the provided exact path
        const path = require('path');
        const absolutePath = path.resolve(process.cwd(), serviceAccountPath);
        const serviceAccount = require(absolutePath);

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('[PushService] Firebase Admin initialized using Service Account JSON.');
        }
    } else {
        console.warn('[PushService] Warning: FIREBASE_SERVICE_ACCOUNT_PATH is not set in .env. Notifications will be simulated.');
    }
} catch (e) {
    console.error('[PushService] Error initializing Firebase Admin:', e);
}

class PushService {
    async sendNotification(pushToken: string, title: string, body: string, data?: any): Promise<boolean> {
        if (!pushToken) return false;

        console.log(`[PushService] Preparing push notification for token: ${pushToken}`);

        try {
            if (!admin.apps.length) {
                console.warn('[PushService] Firebase Admin is NOT initialized. Simulating success.');
                console.log(`[PushService] Simulated Web/Mobile Push -> Title: "${title}", Body: "${body}"`);
                return true;
            }

            const message = {
                notification: {
                    title,
                    body,
                },
                // Data payload must be strings specifically for FCM.
                data: this.sanitizeData(data || {}),
                token: pushToken
            };

            const response = await admin.messaging().send(message);
            console.log(`[PushService] Notification sent:`, response);
            return true;
        } catch (error: any) {
            console.error('[PushService] Push Sending Error:', error.message);
            return false;
        }
    }

    private sanitizeData(data: any): { [key: string]: string } {
        const cleanData: { [key: string]: string } = {};
        for (const [key, value] of Object.entries(data)) {
            if (value !== null && value !== undefined) {
                cleanData[key] = String(value);
            }
        }
        return cleanData;
    }

    async getPushTokenByPhone(phone: string): Promise<string | null> {
        try {
            const result = await pool.query(
                `SELECT push_token FROM customer_devices 
                 WHERE customer_phone = $1 AND push_token IS NOT NULL 
                 ORDER BY last_sync DESC LIMIT 1`,
                [phone]
            );
            return result.rows[0]?.push_token || null;
        } catch (error) {
            console.error('[PushService] Error fetching push token:', error);
            return null;
        }
    }
}

export default new PushService();
