import { db } from '../db';
import { otpCodes } from '../db/schema';
import { and, eq, gt, desc, sql } from 'drizzle-orm';
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
            await db
                .update(otpCodes)
                .set({ isUsed: true })
                .where(and(eq(otpCodes.phone, formattedPhone), eq(otpCodes.isUsed, false)));

            // Yeni kodu kaydet
            await db.insert(otpCodes).values({
                phone: formattedPhone,
                code,
                expiresAt,
            });

            // SMS gönder
            const message = `Doğrulama kodunuz: ${code}. Salon Cebinde uygulamasına giriş yapmak için kullanabilirsiniz.`;
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
                            `Salon Cebinde giriş kodunuz: ${code}`,
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
            const result = await db
                .select({ id: otpCodes.id })
                .from(otpCodes)
                .where(
                    and(
                        eq(otpCodes.phone, formattedPhone),
                        eq(otpCodes.code, code),
                        eq(otpCodes.isUsed, false),
                        gt(otpCodes.expiresAt, sql`CURRENT_TIMESTAMP`)
                    )
                )
                .orderBy(desc(otpCodes.createdAt))
                .limit(1);

            if (result.length > 0) {
                // Kodu kullanıldı olarak işaretle
                await db
                    .update(otpCodes)
                    .set({ isUsed: true })
                    .where(eq(otpCodes.id, result[0].id));
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
