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
            const query = companyId
                ? 'SELECT * FROM sms_settings WHERE company_id = $1 LIMIT 1'
                : 'SELECT * FROM sms_settings WHERE company_id IS NULL LIMIT 1';
            const values = companyId ? [companyId] : [];
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
        const existing = await this.getSettings(settings.company_id);

        if (existing) {
            const query = `
                UPDATE sms_settings 
                SET provider = $1, api_url = $2, api_key = $3, is_active = $4, sender_id = $5, updated_at = CURRENT_TIMESTAMP
                WHERE ${settings.company_id ? 'company_id = $6' : 'company_id IS NULL'}
                RETURNING *
            `;
            const values = [
                settings.provider,
                settings.api_url,
                settings.api_key,
                settings.is_active,
                settings.sender_id,
                ...(settings.company_id ? [settings.company_id] : [])
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
                settings.company_id,
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
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '90' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('90')) {
            formattedPhone = '90' + formattedPhone;
        }

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
                // Netgsm OTP API Integration
                // api_key format should be "usercode:password"
                const [usercode, password] = (settings.api_key || '').split(':');

                if (!usercode || !password) {
                    throw new Error('Netgsm API key should be in "usercode:password" format');
                }

                // Default Netgsm OTP URL if not provided: https://api.netgsm.com.tr/otp/send/get
                const apiUrl = settings.api_url || 'https://api.netgsm.com.tr/otp/send/get';

                response = await axios.get(apiUrl, {
                    params: {
                        usercode,
                        password,
                        gsmno: formattedPhone,
                        message: message,
                        msgheader: settings.sender_id || '',
                        dil: 'TR'
                    },
                    timeout: 10000
                });

                // Netgsm usually returns a status code in the body, e.g., "00" for success
                if (typeof response.data === 'string' && !response.data.startsWith('00')) {
                    throw new Error(`Netgsm Error: ${response.data}`);
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
    async getLogs(companyId: number): Promise<SmsLog[]> {
        try {
            const result = await pool.query(
                'SELECT * FROM sms_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 100',
                [companyId]
            );
            return result.rows;
        } catch (error) {
            console.error('Error fetching SMS logs:', error);
            return [];
        }
    }
}

export default new SmsService();
