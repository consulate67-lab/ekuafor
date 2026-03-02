import pool from '../config/database';
import appointmentService from './appointment.service';
import smsService from './sms.service';
import companyService from './company.service';
import iyzicoService from './iyzico.service';

/**
 * Payment Service for managing transactions and Iyzico integration.
 */
class PaymentService {
    /**
     * Initialize Iyzico Checkout Form for an appointment
     */
    async initializeIyzico(appointmentId: number, customerIp: string) {
        // 1. Fetch appointment details
        const appointment = (await appointmentService.getAppointmentsByIds([appointmentId]))[0];
        if (!appointment) throw new Error('Randevu bulunamadı');

        const companyId = appointment.company_id;
        const amount = appointment.price;

        console.log(`[PaymentService] Initializing payment for App#${appointmentId}, Amount: ${amount}`);

        // 2. Here we would normally call Iyzico API
        const mockToken = `iyzi-mock-${Math.random().toString(36).substring(7)}`;

        // Update appointment with token
        await pool.query(
            'UPDATE appointments SET iyzico_token = $1 WHERE id = $2',
            [mockToken, appointmentId]
        );

        return {
            token: mockToken,
            paymentPageUrl: `https://sandbox-checkout.iyzipay.com/pay/${mockToken}`, // Simulated
            success: true
        };
    }

    /**
     * Handle Iyzico Callback
     */
    async processCallback(token: string) {
        console.log(`[PaymentService] Processing callback for token: ${token}`);

        // 1. Find appointment by token
        const result = await pool.query(
            'SELECT * FROM appointments WHERE iyzico_token = $1',
            [token]
        );

        if (result.rows.length === 0) throw new Error('Token ile eşleşen randevu bulunamadı');
        const appointment = result.rows[0];

        // Simulated success
        await pool.query(
            "UPDATE appointments SET payment_status = 'paid', updated_at = NOW() WHERE id = $1",
            [appointment.id]
        );

        // 3. Notify Staff
        try {
            const staffResult = await pool.query('SELECT phone, first_name FROM users WHERE id = $1', [appointment.staff_id]);
            const staff = staffResult.rows[0];

            if (staff && staff.phone) {
                const message = `Bilgi: ${appointment.customer_name} isimli müşterinin ₺${appointment.price} tutarındaki ödemesi alınmıştır.`;
                await smsService.sendSms(appointment.company_id, staff.phone, message);
            }
        } catch (notifyErr) {
            console.error('[PaymentService] Notification failed:', notifyErr);
        }

        return { success: true, appointmentId: appointment.id };
    }

    async initializeCepPos(appointmentId: number, companyId: number, staffId: number, amount: number) {
        try {
            const query = `
                SELECT a.*, 
                       c.name as company_name, 
                       c.commission_rate as platform_rate,
                       c.iyzico_commission_rate,
                       c.sub_merchant_key
                FROM appointments a 
                JOIN companies c ON a.company_id = c.id 
                WHERE a.id = $1
            `;
            const result = await pool.query(query, [appointmentId]);

            if (result.rows.length === 0) {
                throw new Error('Appointment not found');
            }

            const appointment = result.rows[0];
            const platformRate = parseFloat(appointment.platform_rate || '0');
            let totalIyzicoRate = parseFloat(appointment.iyzico_commission_rate || '0');
            if (totalIyzicoRate <= 0) totalIyzicoRate = 1;

            const platformCommission = (amount * platformRate) / 100;
            const iyzicoCommission = (amount * totalIyzicoRate) / 100;
            const totalToCollect = amount + platformCommission + iyzicoCommission;

            const subMerchantKey = appointment.sub_merchant_key;
            const mockToken = `ceppos_${Math.random().toString(36).substring(7)}`;

            await pool.query(
                `UPDATE appointments 
                 SET iyzico_token = $1, 
                     payment_status = $2, 
                     payment_method = $3,
                     original_price = $4,
                     price = $5,
                     collected_price = $6,
                     updated_at = NOW() 
                 WHERE id = $7`,
                [mockToken, 'pending', 'card_ceppos', appointment.price, amount, totalToCollect, appointmentId]
            );

            await pool.query(
                `INSERT INTO payments (
                    appointment_id, company_id, amount, commission_amount, net_amount, payment_method, payment_status, transaction_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [appointmentId, companyId, totalToCollect, platformCommission + iyzicoCommission, amount, 'card_ceppos', 'pending', mockToken]
            );

            return {
                success: true,
                data: {
                    token: mockToken,
                    base_amount: amount,
                    platform_commission: platformCommission,
                    iyzico_commission: iyzicoCommission,
                    total_amount: totalToCollect,
                    customer_name: appointment.customer_name,
                    payment_url: `https://www.iyzico.com/ceppos-pay?token=${mockToken}`
                }
            };
        } catch (error: any) {
            console.error('Iyzico Cep POS Init Error:', error);
            throw error;
        }
    }

    async initializeLicenseRenewal(companyId: number, months: number = 12) {
        // Migration check
        await pool.query(`
            CREATE TABLE IF NOT EXISTS license_payments (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id),
                token TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                months INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(() => { });

        const company = await companyService.getCompanyById(companyId);
        if (!company) throw new Error('Firma bulunamadı');

        const price = months === 12 ? "2000" : "1100";
        const callbackUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/payments/license/callback`;

        const result = await iyzicoService.initializeCheckoutForm({
            company,
            price: price,
            paidPrice: price,
            basketId: `LIC-${companyId}-${Date.now()}`,
            callbackUrl,
            basketItems: [
                {
                    id: `lic_${months}m`,
                    name: `${months} Aylık İşletme Lisans Yenileme`,
                    category1: "Yazılım",
                    itemType: 'VIRTUAL',
                    price: price
                }
            ]
        });

        await pool.query(
            'INSERT INTO license_payments (company_id, token, amount, months, status) VALUES ($1, $2, $3, $4, $5)',
            [companyId, result.token, price, months, 'pending']
        );

        return result;
    }

    async processLicenseCallback(token: string) {
        const result = await iyzicoService.getCheckoutFormResult(token);

        if (result.status === 'success') {
            const payRes = await pool.query(
                'UPDATE license_payments SET status = $1, updated_at = NOW() WHERE token = $2 RETURNING *',
                ['success', token]
            );

            if (payRes.rows.length > 0) {
                const { company_id, months } = payRes.rows[0];

                const company = await companyService.getCompanyById(company_id);
                const currentEnd = (company as any)?.license_end_date ? new Date((company as any).license_end_date) : new Date();
                const newEnd = new Date(Math.max(currentEnd.getTime(), new Date().getTime()));
                newEnd.setMonth(newEnd.getMonth() + months);

                await pool.query(
                    'UPDATE companies SET license_end_date = $1, is_active = true WHERE id = $2',
                    [newEnd, company_id]
                );

                return { success: true, message: 'Lisans başarıyla yenilendi' };
            }
        }

        return { success: false, message: 'Ödeme başarısız' };
    }
}

export default new PaymentService();
