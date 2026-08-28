import { db } from '../db';
import { appointments, companies, payments, users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import appointmentService from './appointment.service';
import smsService from './sms.service';
import companyService from './company.service';
import iyzicoService from './iyzico.service';

/**
 * Payment Service for managing transactions and Iyzico integration.
 *
 * Drizzle ORM notları:
 * - Schema'da tanımlı alanlar/tablolar için type-safe query builder kullanılır
 *   (appointments.paymentStatus, users, payments, companies.isActive, vs.)
 * - Schema'da henüz tanımlı olmayan alanlar (iyzico_token, original_price,
 *   collected_price, iyzico_commission_rate, sub_merchant_key, license_end_date)
 *   ve license_payments tablosu için `db.execute(sql\`...\`)` Drizzle raw SQL
 *   kullanılır. Bu sayede tek bir `db` instance üzerinden çalışılır ve
 *   `pool` import'una gerek kalmaz.
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

        // Update appointment with token (iyzico_token schema'da yok → raw SQL)
        await db.execute(sql`
            UPDATE appointments
            SET iyzico_token = ${mockToken}
            WHERE id = ${appointmentId}
        `);

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

        // 1. Find appointment by token (iyzico_token schema'da yok → raw SQL)
        const appointmentRes = await db.execute(sql`
            SELECT * FROM appointments WHERE iyzico_token = ${token}
        `);
        const appointmentRows = (appointmentRes as any).rows ?? [];
        if (appointmentRows.length === 0) throw new Error('Token ile eşleşen randevu bulunamadı');
        const appointment = appointmentRows[0];

        // Simulated success — paymentStatus ve updatedAt schema'da var
        await db
            .update(appointments)
            .set({ paymentStatus: 'paid', updatedAt: new Date() })
            .where(eq(appointments.id, appointment.id));

        // 3. Notify Staff
        try {
            const staffRows = await db
                .select({ phone: users.phone })
                .from(users)
                .where(eq(users.id, appointment.staff_id))
                .limit(1);
            const staff = staffRows[0];

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
            // iyzico_commission_rate ve sub_merchant_key schema'da yok → raw SQL
            const apptRes = await db.execute(sql`
                SELECT a.*,
                       c.name as company_name,
                       c.commission_rate as platform_rate,
                       c.iyzico_commission_rate,
                       c.sub_merchant_key
                FROM appointments a
                JOIN companies c ON a.company_id = c.id
                WHERE a.id = ${appointmentId}
            `);
            const apptRows = (apptRes as any).rows ?? [];

            if (apptRows.length === 0) {
                throw new Error('Appointment not found');
            }

            const appointment = apptRows[0];
            const platformRate = parseFloat(appointment.platform_rate || '0');
            let totalIyzicoRate = parseFloat(appointment.iyzico_commission_rate || '0');
            if (totalIyzicoRate <= 0) totalIyzicoRate = 1;

            const platformCommission = (amount * platformRate) / 100;
            const iyzicoCommission = (amount * totalIyzicoRate) / 100;
            const totalToCollect = amount + platformCommission + iyzicoCommission;

            const subMerchantKey = appointment.sub_merchant_key;
            const mockToken = `ceppos_${Math.random().toString(36).substring(7)}`;

            // iyzico_token, original_price, collected_price schema'da yok → raw SQL
            await db.execute(sql`
                UPDATE appointments
                SET iyzico_token = ${mockToken},
                    payment_status = ${'pending'},
                    payment_method = ${'card_ceppos'},
                    original_price = ${appointment.price},
                    price = ${amount},
                    collected_price = ${totalToCollect},
                    updated_at = NOW()
                WHERE id = ${appointmentId}
            `);

            // payments tablosu schema'da tam tanımlı → Drizzle insert
            await db.insert(payments).values({
                appointmentId,
                companyId,
                amount: totalToCollect as any,
                commissionAmount: (platformCommission + iyzicoCommission) as any,
                netAmount: amount as any,
                paymentMethod: 'card_ceppos',
                paymentStatus: 'pending',
                transactionId: mockToken
            });

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
        // license_payments tablosu schema'da yok → raw SQL (idempotent migration)
        await db.execute(sql`
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

        // license_payments → raw SQL
        await db.execute(sql`
            INSERT INTO license_payments (company_id, token, amount, months, status)
            VALUES (${companyId}, ${result.token}, ${price}, ${months}, ${'pending'})
        `);

        return result;
    }

    async processLicenseCallback(token: string) {
        const result = await iyzicoService.getCheckoutFormResult(token);

        if (result.status === 'success') {
            // license_payments → raw SQL (RETURNING dahil)
            const payRes = await db.execute(sql`
                UPDATE license_payments
                SET status = ${'success'}, updated_at = NOW()
                WHERE token = ${token}
                RETURNING *
            `);
            const payRows = (payRes as any).rows ?? [];

            if (payRows.length > 0) {
                const { company_id, months } = payRows[0];

                const company = await companyService.getCompanyById(company_id);
                const currentEnd = (company as any)?.license_end_date ? new Date((company as any).license_end_date) : new Date();
                const newEnd = new Date(Math.max(currentEnd.getTime(), new Date().getTime()));
                newEnd.setMonth(newEnd.getMonth() + months);

                // license_end_date schema'da yok → raw SQL
                await db.execute(sql`
                    UPDATE companies
                    SET license_end_date = ${newEnd as any}, is_active = true
                    WHERE id = ${company_id}
                `);

                return { success: true, message: 'Lisans başarıyla yenilendi' };
            }
        }

        return { success: false, message: 'Ödeme başarısız' };
    }
}

export default new PaymentService();
