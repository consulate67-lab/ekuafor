// Force redeploy - Triggering sync for Firebase credentials
import * as admin from 'firebase-admin';
import { db } from '../db';
import { customerDevices, pushLogs } from '../db/schema';
import { and, desc, eq, isNotNull } from 'drizzle-orm';

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
    // Encapsulates the Firebase initialization logic for lazy/re-initialization
    private initializeFirebase(): void {
        if (admin.apps.length) {
            console.log('[PushService] Firebase Admin already initialized. Skipping lazy initialization attempt.');
            return;
        }

        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();

        try {
            if (serviceAccountJson) {
                let serviceAccount: any;
                const cleanJson = serviceAccountJson.startsWith('"') && serviceAccountJson.endsWith('"')
                    ? serviceAccountJson.slice(1, -1)
                    : serviceAccountJson;

                try {
                    serviceAccount = JSON.parse(cleanJson);
                } catch {
                    serviceAccount = JSON.parse(Buffer.from(cleanJson, 'base64').toString('utf8'));
                }
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                console.log('[PushService] Firebase Admin lazily initialized via FIREBASE_SERVICE_ACCOUNT_JSON.');
            } else if (serviceAccountPath) {
                const path = require('path');
                const absolutePath = path.resolve(process.cwd(), serviceAccountPath);
                const serviceAccount = require(absolutePath);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                console.log('[PushService] Firebase Admin lazily initialized via file:', absolutePath);
            } else {
                console.warn('[PushService] Firebase Credentials Missing during lazy init. Push will be simulated.');
            }
        } catch (e: any) {
            console.error('[PushService] Lazy Initialization exception:', e.message);
        }
    }

    async sendNotification(pushToken: string, title: string, body: string, data?: any, phone?: string): Promise<boolean> {
        if (!pushToken) return false;

        console.log(`[PushService] Preparing push notification for token: ${pushToken}`);

        try {
            // Lazy initialization if not already initialized
            if (!admin.apps.length) {
                console.log('[PushService] Firebase Apps list is empty. Attempting lazy initialization...');
                this.initializeFirebase();
            }

            console.log(`[PushService] admin.apps.length: ${admin.apps.length}`);
            if (!admin.apps.length) {
                const envExists = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
                const pathExists = !!process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
                console.warn(`[PushService] Firebase STILL NOT initialized after lazy attempt. ENV JSON: ${envExists}, PATH: ${pathExists}`);

                await db.insert(pushLogs).values({
                    phoneNumber: phone || null,
                    title,
                    body,
                    status: 'simulated',
                    errorMessage: `Firebase not initialized (v2 JSON:${envExists})`
                });
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

            await db.insert(pushLogs).values({
                phoneNumber: phone || null,
                title,
                body,
                status: 'sent'
            });

            return true;
        } catch (error: any) {
            console.error('[PushService] Push Sending Error:', error.message);

            await db.insert(pushLogs).values({
                phoneNumber: phone || null,
                title,
                body,
                status: 'failed',
                errorMessage: error.message
            });

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

            const rows = await db
                .select({ pushToken: customerDevices.pushToken })
                .from(customerDevices)
                .where(
                    and(
                        eq(customerDevices.customerPhone, normalizedPhone),
                        isNotNull(customerDevices.pushToken)
                    )
                )
                .orderBy(desc(customerDevices.lastSync))
                .limit(1);

            return rows[0]?.pushToken || null;
        } catch (error) {
            console.error('[PushService] Error fetching push token:', error);
            return null;
        }
    }
}

export default new PushService();
