import * as admin from 'firebase-admin';
import pool from '../config/database';

try {
    if (!admin.apps.length) {
        // Option 1: JSON string or base64 from environment variable (for Railway/production)
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        // Option 2: Local JSON file path (for local development)
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

        if (serviceAccountJson) {
            let serviceAccount: any;
            try {
                // Try plain JSON first
                serviceAccount = JSON.parse(serviceAccountJson);
            } catch {
                // Try base64 decode
                serviceAccount = JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString('utf8'));
            }
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            console.log('[PushService] Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT_JSON env var.');
        } else if (serviceAccountPath) {
            const path = require('path');
            const absolutePath = path.resolve(process.cwd(), serviceAccountPath);
            const serviceAccount = require(absolutePath);
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            console.log('[PushService] Firebase Admin initialized via JSON file:', absolutePath);
        } else {
            console.warn('[PushService] Warning: No Firebase credentials found. Push notifications will be simulated.');
        }
    }
} catch (e) {
    console.error('[PushService] Error initializing Firebase Admin:', e);
}


class PushService {
    async sendNotification(pushToken: string, title: string, body: string, data?: any, phone?: string): Promise<boolean> {
        if (!pushToken) return false;

        console.log(`[PushService] Preparing push notification for token: ${pushToken}`);

        try {
            if (!admin.apps.length) {
                console.warn('[PushService] Firebase Admin is NOT initialized. Simulating success.');
                console.log(`[PushService] Simulated Web/Mobile Push -> Title: "${title}", Body: "${body}"`);

                await pool.query(
                    'INSERT INTO push_logs (phone_number, title, body, status, error_message) VALUES ($1, $2, $3, $4, $5)',
                    [phone || null, title, body, 'simulated', 'Firebase not initialized']
                );
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

            console.log(`[PushService] Payload:`, JSON.stringify(message, null, 2));

            const response = await admin.messaging().send(message);
            console.log(`[PushService] Notification sent:`, response);

            await pool.query(
                'INSERT INTO push_logs (phone_number, title, body, status) VALUES ($1, $2, $3, $4)',
                [phone || null, title, body, 'sent']
            );

            return true;
        } catch (error: any) {
            console.error('[PushService] Push Sending Error:', error.message);

            await pool.query(
                'INSERT INTO push_logs (phone_number, title, body, status, error_message) VALUES ($1, $2, $3, $4, $5)',
                [phone || null, title, body, 'failed', error.message]
            );

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
            const { normalizePhone } = require('../utils/phone');
            const normalizedPhone = normalizePhone(phone);

            console.log(`[PushService] Searching token for: ${phone} (Normalized: ${normalizedPhone})`);

            const result = await pool.query(
                `SELECT push_token FROM customer_devices 
                 WHERE customer_phone = $1 AND push_token IS NOT NULL 
                 ORDER BY last_sync DESC LIMIT 1`,
                [normalizedPhone]
            );
            return result.rows[0]?.push_token || null;
        } catch (error) {
            console.error('[PushService] Error fetching push token:', error);
            return null;
        }
    }
}

export default new PushService();
