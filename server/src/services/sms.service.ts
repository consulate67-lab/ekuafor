import axios from 'axios';
import pool from '../config/database';

export interface SmsSettings {
    id?: number;
    company_id: number | null;
    provider: 'local_gateway' | 'vodafone_official' | 'netgsm' | 'others';
    api_url: string;
    api_key?: string;
    is_active: boolean;
    sender_id?: string;
}

export interface SmsLog {
    id?: number;
    company_id: number | null;
    phone_number: string;
    message: string;
    status: 'sent' | 'failed' | 'pending';
    error_message?: string;
    created_at?: Date;
}

class SmsService {
    /**
     * Firma için SMS ayarlarını getir
     */
    async getSettings(companyId: number | null): Promise<SmsSettings | null> {
        try {
            // Handle 0 as null (system-wide settings)
            const cid = (companyId === 0 || !companyId) ? null : companyId;
            const query = cid
                ? 'SELECT * FROM sms_settings WHERE company_id = $1 LIMIT 1'
                : 'SELECT * FROM sms_settings WHERE company_id IS NULL LIMIT 1';
            const values = cid ? [cid] : [];
            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error fetching SMS settings:', error);
            return null;
        }
    }

    /**
     * SMS Ayarlarını kaydet veya güncelle
     */
    async saveSettings(settings: SmsSettings): Promise<SmsSettings> {
        // Handle 0 as null
        let cid = (settings.company_id === 0 || !settings.company_id) ? null : settings.company_id;

        // Extra safety check: verify if company exists in target DB
        if (cid) {
            const checkRes = await pool.query('SELECT id FROM companies WHERE id = $1', [cid]);
            if (checkRes.rows.length === 0) {
                console.warn(`Company ID ${cid} not found, falling back to system-wide (null) settings.`);
                cid = null;
            }
        }

        const existing = await this.getSettings(cid);

        if (existing) {
            const query = `
                UPDATE sms_settings 
                SET provider = $1, api_url = $2, api_key = $3, is_active = $4, sender_id = $5, updated_at = CURRENT_TIMESTAMP
                WHERE ${cid ? 'company_id = $6' : 'company_id IS NULL'}
                RETURNING *
            `;
            const values = [
                settings.provider,
                settings.api_url,
                settings.api_key,
                settings.is_active,
                settings.sender_id,
                ...(cid ? [cid] : [])
            ];
            const result = await pool.query(query, values);
            return result.rows[0];
        } else {
            const query = `
                INSERT INTO sms_settings (company_id, provider, api_url, api_key, is_active, sender_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const values = [
                cid,
                settings.provider,
                settings.api_url,
                settings.api_key,
                settings.is_active,
                settings.sender_id
            ];
            const result = await pool.query(query, values);
            return result.rows[0];
        }
    }

    /**
     * SMS Gönder
     */
    async sendSms(companyId: number | null, phoneNumber: string, message: string): Promise<boolean> {
        const settings = await this.getSettings(companyId);

        if (!settings || !settings.is_active) {
            console.warn(`SMS skipping: Settings not found or inactive for company ${companyId}`);
            return false;
        }

        // Phone number formatting (Turkish numbers)
        let formattedPhone = phoneNumber.replace(/\D/g, '');
        // Normalize Turkish numbers
        if (formattedPhone.startsWith('90') && formattedPhone.length === 12) {
            // Already 905XXXXXXXXX, keep it
        } else if (formattedPhone.startsWith('0') && formattedPhone.length === 11) {
            // 05XXXXXXXXX -> 905XXXXXXXXX
            formattedPhone = '90' + formattedPhone.substring(1);
        } else if (formattedPhone.length === 10 && formattedPhone.startsWith('5')) {
            // 5XXXXXXXXX -> 905XXXXXXXXX
            formattedPhone = '90' + formattedPhone;
        }

        // Netgsm standard is often 10 digits for some endpoints, but XML accepts 12 with 90.
        // Let's create a 10-digit version for GET and 12-digit for XML
        const phone10 = formattedPhone.startsWith('90') ? formattedPhone.substring(2) : formattedPhone;

        try {
            let response;

            if (settings.provider === 'local_gateway') {
                // local_gateway genellikle: POST http://ip:port/send
                // Body: { "to": "905...", "message": "abc" }
                // Headers: X-API-Key or Authorization
                response = await axios.post(settings.api_url, {
                    phone: formattedPhone,
                    message: message
                }, {
                    headers: settings.api_key ? { 'Authorization': settings.api_key, 'X-API-Key': settings.api_key } : {},
                    timeout: 10000
                });
            } else if (settings.provider === 'vodafone_official') {
                // Vodafone Official API (Turkey) usually uses SOAP or different REST structure
                // Placeholder for official integration
                throw new Error('Vodafone official API integration not implemented yet');
            } else if (settings.provider === 'netgsm') {
                // Netgsm API Integration
                let targetApiKey = settings.api_key;
                let targetApiUrl = settings.api_url;
                let targetSenderId = settings.sender_id;

                if (!targetApiKey || !targetApiKey.includes(':')) {
                    // Fallback to central server account
                    const globalSettings = await this.getSettings(null);
                    if (globalSettings && globalSettings.api_key && globalSettings.api_key.includes(':')) {
                        targetApiKey = globalSettings.api_key;
                        targetApiUrl = globalSettings.api_url || targetApiUrl;
                        if (!targetSenderId) targetSenderId = globalSettings.sender_id;
                    }
                }

                const [usercode, password] = (targetApiKey || '').split(':');

                if (!usercode || !password) {
                    throw new Error('Netgsm API key not configured correctly (local or global). Please configure master account.');
                }

                const formattedMessage = message.trim();
                const senderId = targetSenderId || '';

                // DEFAULT: Use GET method unless URL explicitly contains 'xml'
                // GET is far more reliable and avoids "70 System Errors"
                if (targetApiUrl && targetApiUrl.includes('xml')) {
                    const xmlData = `<?xml version="1.0" encoding="UTF-8"?><mainbody><header><usercode>${usercode}</usercode><password>${password}</password><msgheader>${senderId}</msgheader></header><body><msg><![CDATA[${formattedMessage}]]></msg><no>${phone10}</no></body></mainbody>`;

                    const xmlUrl = settings.api_url || 'https://api.netgsm.com.tr/sms/send/xml';
                    response = await axios.post(xmlUrl, xmlData, {
                        headers: { 'Content-Type': 'application/xml' },
                        timeout: 10000
                    });

                    const resStr = String(response.data).trim();
                    const netgsmErrors = ['20', '30', '40', '50', '51', '70', '00', '01', '02'];

                    if (resStr.includes('error') || netgsmErrors.includes(resStr) || resStr.length < 5) {
                        const errorMap: any = {
                            '20': 'Mesaj basligi (sender_id) gecersiz veya onayli degil.',
                            '30': 'Gecersiz kullanici adi veya sifre.',
                            '40': 'Mesaj metni bos veya gecersiz karakterler iceriyor.',
                            '50': 'Gecersiz telefon numarasi.',
                            '70': 'Netgsm sistem hatasi.',
                        };
                        const errMsg = errorMap[resStr] || `Hata Kodu: ${resStr}`;
                        throw new Error(`Netgsm XML Error: ${errMsg} (Raw: ${resStr})`);
                    }
                } else {
                    // Option 2: Parametric POST (Default & Highly Recommended)
                    // Note: Netgsm documentation (2022) states that GET is deprecated 
                    // and requests must be sent via POST with form parameters.
                    const postUrl = targetApiUrl || 'https://api.netgsm.com.tr/sms/send/get/';
                    console.log(`[SMS] Sending via Netgsm Parametric POST to: ${postUrl}`);

                    const params = new URLSearchParams();
                    params.append('usercode', usercode);
                    params.append('password', password);
                    params.append('gsmno', phone10);
                    params.append('message', formattedMessage);
                    params.append('msgheader', senderId);
                    params.append('dil', 'TR');

                    response = await axios.post(postUrl, params, {
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        timeout: 10000
                    });

                    const resStr = String(response.data).trim();
                    console.log(`[SMS] Netgsm Raw Response: ${resStr}`);

                    // Netgsm sends "00 JobID" or a numeric JobID on success
                    if (!resStr.startsWith('00') && (resStr.length < 5 || isNaN(Number(resStr.split(' ')[0])))) {
                        const errorMap: any = {
                            '20': 'Mesaj metni cok uzun veya gecersiz karakter.',
                            '30': 'Gecersiz kullanici adi, sifre veya IP yetkisi yok.',
                            '40': 'Mesaj basligi (sender_id) gecersiz veya onayli degil.',
                            '70': 'Eksik veya hatali parametre (Sistem hatasi).',
                        };
                        const errMsg = errorMap[resStr] || `Hata Kodu: ${resStr}`;
                        throw new Error(`Netgsm Error: ${errMsg} (Raw: ${resStr})`);
                    }
                }
            } else {
                // Generic GET/POST support can be added
                throw new Error(`Provider ${settings.provider} not supported`);
            }

            await this.logSms({
                company_id: companyId,
                phone_number: formattedPhone,
                message,
                status: 'sent'
            });

            return true;
        } catch (error: any) {
            console.error('SMS Send Error:', error.message);
            await this.logSms({
                company_id: companyId,
                phone_number: formattedPhone,
                message,
                status: 'failed',
                error_message: error.message
            });
            return false;
        }
    }

    /**
     * SMS Günlüğe Kaydet
     */
    private async logSms(log: SmsLog): Promise<void> {
        try {
            const query = `
                INSERT INTO sms_logs (company_id, phone_number, message, status, error_message)
                VALUES ($1, $2, $3, $4, $5)
            `;
            await pool.query(query, [
                log.company_id,
                log.phone_number,
                log.message,
                log.status,
                log.error_message
            ]);
        } catch (err) {
            console.error('Error logging SMS:', err);
        }
    }

    /**
     * SMS Geçmişini Getir
     */
    async getLogs(companyId: number | null): Promise<SmsLog[]> {
        try {
            const cid = (companyId === 0 || !companyId) ? null : companyId;
            const query = cid
                ? 'SELECT * FROM sms_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 100'
                : 'SELECT * FROM sms_logs WHERE company_id IS NULL ORDER BY created_at DESC LIMIT 100';
            const values = cid ? [cid] : [];
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('Error fetching SMS logs:', error);
            return [];
        }
    }
}

export default new SmsService();
