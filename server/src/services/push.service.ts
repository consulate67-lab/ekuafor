import * as admin from 'firebase-admin';
import pool from '../config/database';

try {
    if (!admin.apps.length) {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();

        if (serviceAccountJson) {
            let serviceAccount: any;
            try {
                // Remove potential surrounding quotes from the string
                const cleanJson = serviceAccountJson.startsWith('"') && serviceAccountJson.endsWith('"')
                    ? serviceAccountJson.slice(1, -1)
                    : serviceAccountJson;

                try {
                    serviceAccount = JSON.parse(cleanJson);
                } catch {
                    // Try base64 decode
                    serviceAccount = JSON.parse(Buffer.from(cleanJson, 'base64').toString('utf8'));
                }

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                console.log('[PushService] Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT_JSON.');
            } catch (innerError: any) {
                console.error('[PushService] CRITICAL: JSON Parse failed for service account.', innerError.message);
            }
        } else if (serviceAccountPath) {
            const path = require('path');
            const absolutePath = path.resolve(process.cwd(), serviceAccountPath);
            const serviceAccount = require(absolutePath);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('[PushService] Firebase Admin initialized via file:', absolutePath);
        } else {
            console.warn('[PushService] Firebase Credentials Missing. Push will be simulated.');
        }
    }
} catch (e: any) {
    console.error('[PushService] Initialization exception:', e.message);
}


class PushService {
    async sendNotification(pushToken: string, title: string, body: string, data?: any, phone?: string): Promise<boolean> {
        if (!pushToken) return false;

        console.log(`[PushService] Preparing push notification for token: ${pushToken}`);

        try {
            console.log(`[PushService] admin.apps.length: ${admin.apps.length}`);
            if (!admin.apps.length) {
                const envExists = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
                const pathExists = !!process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
                console.warn(`[PushService] Firebase not initialized. ENV JSON: ${envExists}, PATH: ${pathExists}`);

                await pool.query(
                    'INSERT INTO push_logs (phone_number, title, body, status, error_message) VALUES ($1, $2, $3, $4, $5)',
                    [phone || null, title, body, 'simulated', `Firebase not initialized (JSON:${envExists}, PATH:${pathExists})`]
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
