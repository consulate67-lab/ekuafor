import pool from '../config/database';
import smsService from './sms.service';

class OtpService {
    /**
     * Rastgele 6 haneli kod üret
     */
    generateCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * OTP kodu gönder
     */
    async sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
        // Formata getir (905...)
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '90' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('90')) {
            formattedPhone = '90' + formattedPhone;
        }

        const code = this.generateCode();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 dakika geçerli

        try {
            // Önceki kullanılmamış kodları iptal et
            await pool.query(
                'UPDATE otp_codes SET is_used = true WHERE phone = $1 AND is_used = false',
                [formattedPhone]
            );

            // Yeni kodu kaydet
            await pool.query(
                'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
                [formattedPhone, code, expiresAt]
            );

            // SMS gönder
            const message = `Doğrulama kodunuz: ${code}. SaloonTR uygulamasına giriş yapmak için kullanabilirsiniz.`;
            const sent = await smsService.sendSms(null, formattedPhone, message);

            if (!sent) {
                console.warn('[OTP] SMS gönderilemedi, Push denenecek...');

                // PUSH NOTIFICATION FALLBACK
                try {
                    const pushService = require('./push.service').default;
                    const token = await pushService.getPushTokenByPhone(formattedPhone);

                    if (token) {
                        console.log(`[OTP] Push token bulundu: ${formattedPhone}, bildirim gönderiliyor...`);
                        await pushService.sendNotification(
                            token,
                            'Giriş Kodu',
                            `SaloonTR giriş kodunuz: ${code}`,
                            { type: 'otp', code: code },
                            formattedPhone
                        );
                    } else {
                        console.log(`[OTP] Cihaz bulunamadı (Push token yok): ${formattedPhone}`);
                    }
                } catch (pushError) {
                    console.error('[OTP] Push hatası:', pushError);
                }
            }

            return { success: true, message: 'OTP gönderildi' };
        } catch (error: any) {
            console.error('OTP Send Error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * OTP kodu doğrula
     */
    async verifyOtp(phone: string, code: string): Promise<boolean> {
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '90' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('90')) {
            formattedPhone = '90' + formattedPhone;
        }

        try {
            const result = await pool.query(
                `SELECT * FROM otp_codes 
                 WHERE phone = $1 AND code = $2 AND is_used = false AND expires_at > CURRENT_TIMESTAMP
                 ORDER BY created_at DESC LIMIT 1`,
                [formattedPhone, code]
            );

            if (result.rows.length > 0) {
                // Kodu kullanıldı olarak işaretle
                await pool.query(
                    'UPDATE otp_codes SET is_used = true WHERE id = $1',
                    [result.rows[0].id]
                );
                return true;
            }

            return false;
        } catch (error) {
            console.error('OTP Verify Error:', error);
            return false;
        }
    }
}

export default new OtpService();
