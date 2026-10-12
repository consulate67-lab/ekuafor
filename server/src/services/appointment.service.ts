import { db } from '../db';
import { sql } from 'drizzle-orm';
import pool from '../config/database';
import { appointments, appointmentServices } from '../db/schema/appointments';
import { services } from '../db/schema/services';
import smsService from './sms.service';
import redis from '../config/redis';
import { normalizePhone, formatPhoneWithSpaces } from '../utils/phone';
import { logger } from '../utils/logger';

export interface Appointment {
    id?: number;
    company_id: number;
    customer_id?: number;
    service_id?: number; // Kept for DB compatibility, but optional
    service_ids?: number[]; // For multi-service selection
    staff_id?: number | null;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'approved' | 'cancelled' | 'completed';
    notes?: string;
    price?: number;
    duration_minutes?: number; // Total duration (can be overridden)
    customer_name?: string;
    customer_phone?: string;
    device_id?: string;
    rating?: number;
    comment?: string;
    technical_notes?: string;
    service_name?: string; // Legacy/Main service name
    services?: any[]; // Detailed services list
}

/**
 * AppointmentService — Drizzle ORM.
 *
 * db.execute(sql\`...\`)` raw template + db.transaction() helper.
 *
 * - Karmaşık JOIN + json_agg(FILTER WHERE ...) → raw SQL (Drizzle query builder'da
 *   bu özellikler native değil).
 * - Transactions → `db.transaction(async (tx) => ...)` — `tx.execute(sql\`...\`)` ile.
 * - Snake_case kolon adları korunur (public API uyumluluğu için).
 */
class AppointmentService {
    private async clearCompanyCache() {
        if (!redis) return;
        try {
            const keys = await redis.keys('companies:list:*');
            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`[Redis] AppointmentService cleared ${keys.length} cache keys`);
            }
        } catch (err) {
            console.error('[Redis] AppointmentService cache clear error:', err);
        }
    }

    async getAppointmentsByIds(ids: number[]): Promise<Appointment[]> {
        if (!ids || ids.length === 0) return [];

        // json_agg(FILTER WHERE ...) raw SQL ile çözüldü.
        const result = await db.execute(sql`
            SELECT
                a.*,
                c.name as company_name,
                ms.name as service_name,
                st.first_name || ' ' || st.last_name as staff_name,
                r.name as resource_name,
                COALESCE(u.first_name || ' ' || u.last_name, a.customer_name) as customer_name,
                COALESCE(json_agg(json_build_object(
                    'id', s.id,
                    'aps_id', aps.id,
                    'name', s.name,
                    'price', aps.price,
                    'original_price', s.price,
                    'duration', aps.duration_minutes,
                    'status', aps.status,
                    'start_time', aps.start_time,
                    'end_time', aps.end_time,
                    'staff_id', aps.staff_id,
                    'service_staff_name', ast.first_name || ' ' || ast.last_name
                )) FILTER (WHERE s.id IS NOT NULL), '[]') as services
            FROM appointments a
            LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
            LEFT JOIN services s ON aps.service_id = s.id
            LEFT JOIN users ast ON aps.staff_id = ast.id
            LEFT JOIN services ms ON a.service_id = ms.id
            LEFT JOIN users st ON a.staff_id = st.id
            LEFT JOIN companies c ON a.company_id = c.id
            LEFT JOIN users u ON a.customer_id = u.id
            LEFT JOIN resources r ON a.resource_id = r.id
            // NOT 02.09.2026: ANY -> IN (sql.join) Drizzle array literal fix
            WHERE a.id IN (${sql.join(ids, sql`, `)})
            GROUP BY a.id, c.name, ms.name, st.first_name, st.last_name, u.first_name, u.last_name, r.name
            ORDER BY a.appointment_date DESC, a.start_time DESC
        `);

        try {
            return (result as any).rows as Appointment[];
        } catch (err) {
            console.error('[Service] getAppointmentsByIds Error:', err);
            throw err;
        }
    }

    async getAppointmentsByPhone(phone: string, companyId?: number): Promise<Appointment[]> {
        console.log(`[Service] getAppointmentsByPhone: Phone=${phone}, Company=${companyId}`);

        // Normalize phone: Remove non-digits and leading zero
        const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '');
        const searchPattern = `%${cleanPhone}%`;

        // Dynamic WHERE — Drizzle sql.join() ile. Regex pattern raw SQL'de kalmak zorunda.
        const whereConditions: any[] = [sql`(
            regexp_replace(COALESCE(u.phone, ''), '\\D', '', 'g') LIKE ${searchPattern} OR
            regexp_replace(COALESCE(a.notes, ''), '\\D', '', 'g') LIKE ${searchPattern} OR
            regexp_replace(COALESCE(a.customer_phone, ''), '\\D', '', 'g') LIKE ${searchPattern}
        )`];
        if (companyId) {
            whereConditions.push(sql`a.company_id = ${companyId}`);
        }
        const whereClause = sql.join(whereConditions, sql` AND `);

        const result = await db.execute(sql`
            SELECT
                a.*,
                c.name as company_name,
                ms.name as service_name,
                st.first_name || ' ' || st.last_name as staff_name,
                r.name as resource_name,
                COALESCE(u.first_name || ' ' || u.last_name, a.customer_name) as customer_name,
                COALESCE(u.first_name || ' ' || u.last_name, a.notes) as customer_display_name,
                COALESCE(json_agg(json_build_object(
                    'id', s.id,
                    'aps_id', aps.id,
                    'name', s.name,
                    'price', aps.price,
                    'original_price', s.price,
                    'duration', aps.duration_minutes,
                    'status', aps.status,
                    'start_time', aps.start_time,
                    'end_time', aps.end_time,
                    'staff_id', aps.staff_id,
                    'service_staff_name', ast.first_name || ' ' || ast.last_name
                )) FILTER (WHERE s.id IS NOT NULL), '[]') as services
            FROM appointments a
            LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
            LEFT JOIN services s ON aps.service_id = s.id
            LEFT JOIN users ast ON aps.staff_id = ast.id
            LEFT JOIN services ms ON a.service_id = ms.id
            LEFT JOIN users st ON a.staff_id = st.id
            LEFT JOIN companies c ON a.company_id = c.id
            LEFT JOIN users u ON a.customer_id = u.id
            LEFT JOIN resources r ON a.resource_id = r.id
            WHERE ${whereClause}
            GROUP BY a.id, c.name, ms.name, st.first_name, st.last_name, u.first_name, u.last_name, r.name
            ORDER BY a.appointment_date DESC, a.start_time DESC
        `);

        try {
            return (result as any).rows as Appointment[];
        } catch (err) {
            console.error('[Service] getAppointmentsByPhone Error:', err);
            throw err;
        }
    }

    async getAppointmentsByCompany(companyId: number, status?: string, staffId?: number, startDate?: string, endDate?: string): Promise<Appointment[]> {
        console.log(`[Service] getAppointmentsByCompany: ID=${companyId}, Status=${status}, Staff=${staffId}, StartDate=${startDate}, EndDate=${endDate}`);

        // Dinamik WHERE — her koşul opsiyonel
        const whereConditions: any[] = [sql`a.company_id = ${companyId}`];
        if (status) {
            whereConditions.push(sql`a.status = ${status}`);
        }
        if (staffId) {
            // EXISTS subquery + OR — Drizzle'la yazmak karmaşık, raw SQL'de kalabilir
            whereConditions.push(sql`(a.staff_id = ${staffId} OR a.staff_id IS NULL OR EXISTS (SELECT 1 FROM appointment_services WHERE appointment_id = a.id AND staff_id = ${staffId}))`);
        }
        if (startDate && endDate) {
            whereConditions.push(sql`a.appointment_date BETWEEN ${startDate} AND ${endDate}`);
        } else if (startDate) {
            whereConditions.push(sql`a.appointment_date >= ${startDate}`);
        }
        const whereClause = sql.join(whereConditions, sql` AND `);

        const result = await db.execute(sql`
            SELECT a.*, c.name as company_name,
                   ms.name as service_name,
                   st.first_name || ' ' || st.last_name as staff_name,
                   r.name as resource_name,
                   COALESCE(u.first_name || ' ' || u.last_name, a.customer_name) as customer_name,
                   COALESCE(json_agg(json_build_object(
                       'id', s.id,
                       'aps_id', aps.id,
                       'name', s.name,
                       'price', aps.price,
                       'original_price', s.price,
                       'duration', aps.duration_minutes,
                       'status', aps.status,
                       'start_time', aps.start_time,
                       'end_time', aps.end_time,
                       'staff_id', aps.staff_id,
                       'service_staff_name', ast.first_name || ' ' || ast.last_name
                   )) FILTER (WHERE s.id IS NOT NULL), '[]') as services
            FROM appointments a
            LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
            LEFT JOIN services s ON aps.service_id = s.id
            LEFT JOIN users ast ON aps.staff_id = ast.id
            LEFT JOIN services ms ON a.service_id = ms.id
            LEFT JOIN users st ON a.staff_id = st.id
            LEFT JOIN companies c ON a.company_id = c.id
            LEFT JOIN users u ON a.customer_id = u.id
            LEFT JOIN resources r ON a.resource_id = r.id
            WHERE ${whereClause}
            GROUP BY a.id, c.name, ms.name, st.first_name, st.last_name, u.first_name, u.last_name, r.name
            ORDER BY a.appointment_date DESC, a.start_time DESC
        `);

        try {
            const rows = (result as any).rows as Appointment[];
            console.log(`[Service] Found ${rows.length} rows`);
            return rows;
        } catch (err) {
            console.error('[Service] Query Error:', err);
            throw err;
        }
    }

    async updateAppointmentStatus(id: number, status: string, price?: number, payment_method?: string, technical_notes?: string, used_materials?: string): Promise<Appointment | null> {
        // 42601 fix: Drizzle 0.36 tx.execute(sql`...`) template parser transaction
        // context'inde parantezleri yanlış parse ediyor. Raw pg pool.query ile
        // sıralı UPDATE yapıyoruz. Atomicity kaybı tolere edilir (status update
        // nadiren çalışan bir operasyon, intermediate state kabul edilebilir).
        // UPDATE appointments — payment_status, payment_method, collected_price, used_materials
        // schema'da yok → raw SQL.
        const updateRes = await pool.query(
            `UPDATE appointments SET
                status = $1,
                price = COALESCE($2, price),
                payment_status = $3,
                payment_method = COALESCE(payment_method, $4),
                collected_price = COALESCE(collected_price, $5, price),
                technical_notes = COALESCE($6, technical_notes),
                used_materials = COALESCE($7, used_materials)
            WHERE id = $8
            RETURNING *`,
            [
                status,
                price ?? null,
                status === 'completed' ? 'paid' : 'pending',
                payment_method || (status === 'completed' ? 'cash' : null),
                price ?? null,
                technical_notes || null,
                used_materials || null,
                id,
            ]
        );
        const updatedAppointment = updateRes.rows[0];

        if (!updatedAppointment) {
            return null;
        }

        // Completed durumunda appointment_services fiyatlarını dağıt
        if (status === 'completed' || status === 'paid') {
            const finalPrice = price ?? updatedAppointment.price ?? 0;

            const servicesRes = await pool.query(
                'SELECT id, price FROM appointment_services WHERE appointment_id = $1',
                [id]
            );
            const services = servicesRes.rows as any[];

            if (services.length === 1) {
                await pool.query(
                    'UPDATE appointment_services SET price = $1, status = \'completed\' WHERE id = $2',
                    [finalPrice, services[0].id]
                );
            } else if (services.length > 1) {
                const currentSum = services.reduce((sum, s) => sum + Number(s.price || 0), 0);
                if (currentSum > 0) {
                    for (const s of services) {
                        const distributed = (Number(s.price || 0) / currentSum) * finalPrice;
                        await pool.query(
                            'UPDATE appointment_services SET price = $1, status = \'completed\' WHERE id = $2',
                            [distributed, s.id]
                        );
                    }
                } else {
                    const distributed = finalPrice / services.length;
                    await pool.query(
                        'UPDATE appointment_services SET price = $1, status = \'completed\' WHERE appointment_id = $2',
                        [distributed, id]
                    );
                }
            } else {
                // Fallback if no services exist
                await pool.query(
                    'UPDATE appointment_services SET status = \'completed\' WHERE appointment_id = $1',
                    [id]
                );
            }
        }

            // Bildirimler — transaction commit SONRASINDA gönderilir.
            // Drizzle transaction return ile commit edilir, sonra finally{} ile notification
            // yolluyoruz ki SMS/push başarısız olursa DB rollback olmasın.
            try {
                console.log(`[Notification] Processing status change: ${status} for App ID: ${id}`);

                const detailsRes = await db.execute(sql`
                    SELECT
                        c.name as company_name,
                        c.sms_enabled,
                        st.first_name as staff_first,
                        st.last_name as staff_last,
                        s.name as service_name,
                        a.customer_phone as app_phone,
                        cust.phone as cust_phone,
                        a.customer_name as app_customer_name,
                        cust.first_name as cust_first,
                        cust.last_name as cust_last
                    FROM appointments a
                    LEFT JOIN companies c ON a.company_id = c.id
                    LEFT JOIN users st ON a.staff_id = st.id
                    LEFT JOIN services s ON a.service_id = s.id
                    LEFT JOIN users cust ON a.customer_id = cust.id
                    WHERE a.id = ${id}
                `);

                const details = (detailsRes as any).rows[0];
                if (!details) return updatedAppointment;

                const phoneNum = details.app_phone || details.cust_phone;
                const name = details.app_customer_name || (details.cust_first ? `${details.cust_first} ${details.cust_last || ''}`.trim() : 'Değerli Müşterimiz');

                const rawDate = updatedAppointment.appointment_date;
                const date = (rawDate && rawDate instanceof Date)
                    ? rawDate.toLocaleDateString('tr-TR')
                    : rawDate;
                const time = updatedAppointment.start_time;

                const companyName = details.company_name || 'İşletme';
                const isSmsEnabled = details.sms_enabled !== false; // Default true
                const staffName = (details.staff_first || details.staff_last)
                    ? `${details.staff_first || ''} ${details.staff_last || ''}`.trim()
                    : 'Uzman personelimiz';
                const serviceName = details.service_name || 'Hizmet';

                // 1. SMS NOTIFICATION (Priority if enabled)
                if (phoneNum && (status === 'approved' || status === 'cancelled')) {
                    if (isSmsEnabled) {
                        const message = status === 'approved'
                            ? `Sayın ${name}, ${companyName} işletmesinde ${staffName} ile ${serviceName} hizmeti için ${date} ${time} randevunuz ONAYLANMIŞTIR. Bekliyoruz!`
                            : `Sayın ${name}, ${companyName} işletmesindeki ${date} tarihli randevunuz İPTAL EDİLMİŞTİR.`;

                        console.log(`[Notification] Attempting SMS for app ID ${id} to ${phoneNum}...`);
                        await smsService.sendSms(updatedAppointment.company_id, phoneNum, message);
                    } else {
                        console.log(`[Notification] SMS is DISABLED for company ${updatedAppointment.company_id}. Skipping SMS.`);
                    }
                }

                // 2. PUSH NOTIFICATION (Fallback or Parallel)
                if (phoneNum && (status === 'approved' || status === 'cancelled')) {
                    const pushService = require('./push.service').default;
                    const token = await pushService.getPushTokenByPhone(phoneNum);

                    if (token) {
                        console.log(`[Notification] Found push token, sending push notification...`);
                        const title = status === 'approved' ? 'Randevunuz Onaylandı' : 'Randevunuz İptal Edildi';
                        const body = status === 'approved'
                            ? `Sayın ${name}, ${companyName} işletmesinde ${staffName} ile ${date} ${time} randevunuz onaylanmıştır.`
                            : `Sayın ${name}, ${companyName} işletmesindeki ${date} ${time} randevunuz iptal edilmiştir.`;

                        await pushService.sendNotification(token, title, body, {
                            appointmentId: id.toString(),
                            status: status
                        }, phoneNum);
                    }
                }
            } catch (notifError) {
                console.error(`[Notification] Error in notification flow:`, notifError);
            }

            return updatedAppointment;
    }

    async updateAppointmentServiceStatus(apsId: number, status: string): Promise<any> {
        try {
            const result = await db.execute(
                sql`UPDATE appointment_services SET status = ${status} WHERE id = ${apsId} RETURNING *`
            );
            const updatedService = (result as any).rows[0];

            if (updatedService && status === 'approved') {
                const appId = updatedService.appointment_id;
                const allServicesRes = await db.execute(
                    sql`SELECT status FROM appointment_services WHERE appointment_id = ${appId}`
                );
                const allServicesRows = (allServicesRes as any).rows as any[];
                const allApproved = allServicesRows.every(s => s.status === 'approved');

                if (allApproved) {
                    await this.updateAppointmentStatus(appId, 'approved');
                }
            }

            return updatedService || null;
        } catch (err) {
            console.error('[Service] Update Service Status Error:', err);
            throw err;
        }
    }

    async getAppointmentsByDateRange(companyId: number, startDate: string, endDate: string, staffId?: number): Promise<Appointment[]> {
        console.log(`[Service] getByDateRange: ID=${companyId}, Valid=${startDate}-${endDate}, Staff=${staffId}`);

        const whereConditions: any[] = [
            sql`a.company_id = ${companyId}`,
            sql`a.appointment_date BETWEEN ${startDate} AND ${endDate}`
        ];
        if (staffId) {
            whereConditions.push(sql`(a.staff_id = ${staffId} OR a.staff_id IS NULL OR EXISTS (SELECT 1 FROM appointment_services WHERE appointment_id = a.id AND staff_id = ${staffId}))`);
        }
        const whereClause = sql.join(whereConditions, sql` AND `);

        const result = await db.execute(sql`
            SELECT a.*, u.first_name || ' ' || u.last_name as customer_name,
                   COALESCE(json_agg(json_build_object(
                       'id', s.id,
                       'aps_id', aps.id,
                       'name', s.name,
                       'price', aps.price,
                       'duration', aps.duration_minutes,
                       'status', aps.status,
                       'start_time', aps.start_time,
                       'end_time', aps.end_time,
                       'staff_id', aps.staff_id,
                       'service_staff_name', ast.first_name || ' ' || ast.last_name
                   )) FILTER (WHERE s.id IS NOT NULL), '[]') as services
            FROM appointments a
            LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
            LEFT JOIN services s ON aps.service_id = s.id
            LEFT JOIN users ast ON aps.staff_id = ast.id
            LEFT JOIN users u ON a.customer_id = u.id
            WHERE ${whereClause}
            GROUP BY a.id, u.first_name, u.last_name
            ORDER BY a.appointment_date, a.start_time
        `);

        try {
            const rows = (result as any).rows as Appointment[];
            console.log(`[Service] Range Found ${rows.length} rows`);
            return rows;
        } catch (err) {
            console.error('[Service] Range Query Error:', err);
            throw err;
        }
    }

    async getAppointmentsByDevice(deviceId: string): Promise<Appointment[]> {
        console.log(`[Service] getAppointmentsByDevice: ${deviceId}`);

        // Önce bu cihazın hangi telefona bağlı olduğunu bulalım
        const deviceRes = await db.execute(
            sql`SELECT customer_phone FROM customer_devices WHERE device_id = ${deviceId}`
        );
        const deviceRows = (deviceRes as any).rows as any[];
        const phone = deviceRows[0]?.customer_phone;

        // Dinamik WHERE: device_id eşleşmesi + opsiyonel telefon regex LIKE
        const whereConditions: any[] = [sql`a.device_id = ${deviceId}`];
        let searchPattern: string | null = null;
        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '');
            searchPattern = `%${cleanPhone}%`;
            whereConditions.push(sql`(regexp_replace(COALESCE(a.customer_phone, ''), '\\D', '', 'g') LIKE ${searchPattern} OR regexp_replace(COALESCE(a.notes, ''), '\\D', '', 'g') LIKE ${searchPattern})`);
        }
        const whereClause = sql.join(whereConditions, sql` OR `);

        const result = await db.execute(sql`
            SELECT
                a.*,
                c.name as company_name,
                ms.name as service_name,
                st.first_name || ' ' || st.last_name as staff_name,
                r.name as resource_name,
                COALESCE(json_agg(json_build_object(
                    'id', s.id,
                    'aps_id', aps.id,
                    'name', s.name,
                    'price', aps.price,
                    'duration', aps.duration_minutes,
                    'status', aps.status,
                    'start_time', aps.start_time,
                    'end_time', aps.end_time,
                    'staff_id', aps.staff_id,
                    'service_staff_name', ast.first_name || ' ' || ast.last_name
                )) FILTER (WHERE s.id IS NOT NULL), '[]') as services
            FROM appointments a
            LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
            LEFT JOIN services s ON aps.service_id = s.id
            LEFT JOIN users ast ON aps.staff_id = ast.id
            LEFT JOIN services ms ON a.service_id = ms.id
            LEFT JOIN users st ON a.staff_id = st.id
            LEFT JOIN resources r ON a.resource_id = r.id
            LEFT JOIN companies c ON a.company_id = c.id
            WHERE ${whereClause}
            GROUP BY a.id, c.name, ms.name, st.first_name, st.last_name, r.name
            ORDER BY a.appointment_date DESC, a.start_time DESC
        `);

        try {
            return (result as any).rows as Appointment[];
        } catch (err) {
            console.error('[Service] getAppointmentsByDevice Error:', err);
            throw err;
        }
    }

    async syncDeviceWithPhone(deviceId: string, phone: string, pushToken?: string) {
        console.log(`[Service] syncDeviceWithPhone: Device=${deviceId}, Phone=${phone}, pushToken=${pushToken}`);

        const { normalizePhone } = require('../utils/phone');
        const normalizedPhone = normalizePhone(phone);

        if (pushToken) {
            await db.execute(sql`
                INSERT INTO customer_devices (device_id, customer_phone, push_token, last_sync)
                VALUES (${deviceId}, ${normalizedPhone}, ${pushToken}, CURRENT_TIMESTAMP)
                ON CONFLICT (device_id)
                DO UPDATE SET customer_phone = ${normalizedPhone}, push_token = ${pushToken}, last_sync = CURRENT_TIMESTAMP
            `);
        } else {
            await db.execute(sql`
                INSERT INTO customer_devices (device_id, customer_phone, last_sync)
                VALUES (${deviceId}, ${normalizedPhone}, CURRENT_TIMESTAMP)
                ON CONFLICT (device_id)
                DO UPDATE SET customer_phone = ${normalizedPhone}, last_sync = CURRENT_TIMESTAMP
            `);
        }

        // Bilinen tüm randevuları da bu tele bağlayalım (Eski randevuların sahiplenilmesi)
        await this.claimAppointmentsByDevice(deviceId, phone);
    }

    async claimAppointmentsByDevice(deviceId: string, phone: string, customerId?: number) {
        console.log(`[Service] claimAppointmentsByDevice: Device=${deviceId}, Phone=${phone}`);

        const { normalizePhone } = require('../utils/phone');
        const normalizedPhone = normalizePhone(phone);

        // Normalize existing phone for comparison or just use as is for storage
        await db.execute(sql`
            UPDATE appointments
            SET customer_phone = ${normalizedPhone}, customer_id = COALESCE(customer_id, ${customerId || null})
            WHERE device_id = ${deviceId} AND (customer_phone IS NULL OR customer_phone = '')
        `);
    }

    async rateAppointment(id: number, rating: number, comment?: string): Promise<Appointment | null> {
        console.log(`[Service] rateAppointment: ID=${id}, Rating=${rating}`);
        const result = await db.execute(
            sql`UPDATE appointments SET rating = ${rating}, comment = ${comment || null} WHERE id = ${id} RETURNING *`
        );
        const rows = (result as any).rows as any[];
        if (rows[0]) {
            await this.clearCompanyCache();
        }
        return rows[0] || null;
    }

    async getCompletedAppointments(companyId: number, startDate?: string, endDate?: string, search?: string): Promise<any[]> {
        const whereConditions: any[] = [
            sql`a.company_id = ${companyId}`,
            sql`a.status = 'completed'`
        ];
        if (startDate && endDate) {
            whereConditions.push(sql`a.appointment_date BETWEEN ${startDate} AND ${endDate}`);
        }
        if (search) {
            const term = `%${search}%`;
            whereConditions.push(sql`(a.customer_name ILIKE ${term} OR a.customer_phone ILIKE ${term})`);
        }
        const whereClause = sql.join(whereConditions, sql` AND `);

        // LATERAL subquery + json_agg → raw SQL zorunlu.
        const result = await db.execute(sql`
            SELECT a.*, s.name as service_name, st.first_name || ' ' || st.last_name as staff_name,
                   COALESCE(i.status, 'pending') as invoice_status
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN users st ON a.staff_id = st.id
            LEFT JOIN LATERAL (SELECT status FROM invoices WHERE appointment_id = a.id ORDER BY id DESC LIMIT 1) i ON true
            WHERE ${whereClause}
            ORDER BY a.appointment_date DESC, a.start_time DESC
        `);
        return (result as any).rows as any[];
    }

    async getCustomerNotifications(phone: string) {
        // UNION ALL → raw SQL
        const result = await db.execute(sql`
            SELECT * FROM (
                (SELECT id, title, body as message, created_at, 'push' as type, status FROM push_logs WHERE phone_number = ${phone})
                UNION ALL
                (SELECT id, 'SMS Bildirimi' as title, message, created_at, 'sms' as type, status FROM sms_logs WHERE phone_number = ${phone})
            ) AS combined
            ORDER BY created_at DESC
            LIMIT 50
        `);
        return (result as any).rows as any[];
    }

    async getCompanyReviews(companyId: number, sort: string = 'newest'): Promise<any[]> {
        // ORDER BY whitelist — sql.raw() ile enjekte (sadece sabit string'ler)
        let orderByClause;
        if (sort === 'rating_desc') {
            orderByClause = sql.raw('a.rating DESC, a.appointment_date DESC');
        } else if (sort === 'rating_asc') {
            orderByClause = sql.raw('a.rating ASC, a.appointment_date DESC');
        } else {
            orderByClause = sql.raw('a.appointment_date DESC, a.start_time DESC');
        }

        const result = await db.execute(sql`
            SELECT a.id, a.rating, a.comment, a.appointment_date, a.customer_name, a.customer_phone,
                   s.name as service_name
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.company_id = ${companyId} AND a.rating IS NOT NULL AND a.rating > 0
            ORDER BY ${orderByClause}
        `);
        return (result as any).rows as any[];
    }

    async getCustomerHistory(companyId: number, search: string): Promise<any[]> {
        // Search by phone or name. Multi-service appointments are aggregated.
        const cleanPhone = search.replace(/\D/g, '').replace(/^0/, '');
        const phonePattern = `%${cleanPhone}%`;
        const namePattern = `%${search}%`;

        // İç içe subquery (string_agg) + COALESCE chain → raw SQL
        const result = await db.execute(sql`
            SELECT a.id, a.appointment_date, a.start_time, a.customer_name, a.customer_phone, a.technical_notes, a.used_materials,
                   COALESCE(ms.name, (SELECT string_agg(s.name, ', ') FROM appointment_services aps JOIN services s ON aps.service_id = s.id WHERE aps.appointment_id = a.id)) as service_name
            FROM appointments a
            LEFT JOIN services ms ON a.service_id = ms.id
            WHERE a.company_id = ${companyId}
            AND (a.customer_phone LIKE ${phonePattern} OR a.customer_name ILIKE ${namePattern})
            ORDER BY a.appointment_date DESC, a.start_time DESC
        `);
        return (result as any).rows as any[];
    }

    async getCustomersCRM(companyId: number, search?: string): Promise<any[]> {
        const whereConditions: any[] = [
            sql`a.company_id = ${companyId}`,
            sql`a.customer_phone IS NOT NULL AND a.customer_phone != ''`
        ];
        if (search) {
            const term = `%${search}%`;
            whereConditions.push(sql`(a.customer_phone ILIKE ${term} OR a.customer_name ILIKE ${term})`);
        }
        const whereClause = sql.join(whereConditions, sql` AND `);

        // İç içe subquery (MAX/COUNT/SUM) + json_agg → raw SQL
        const result = await db.execute(sql`
            SELECT
                a.customer_phone as phone,
                (
                    SELECT customer_name FROM appointments
                    WHERE customer_phone = a.customer_phone AND company_id = ${companyId}
                    ORDER BY appointment_date DESC, start_time DESC LIMIT 1
                ) as name,
                MAX(a.appointment_date) as last_visit,
                COUNT(a.id) as appointment_count,
                SUM(COALESCE(a.price, 0))::float as total_spent,
                json_agg(json_build_object(
                    'id', a.id,
                    'date', a.appointment_date,
                    'time', a.start_time,
                    'status', a.status,
                    'total_price', a.price,
                    'staff_name', st.first_name || ' ' || st.last_name,
                    'services', (
                        SELECT json_agg(json_build_object('name', ser.name))
                        FROM appointment_services aser
                        JOIN services ser ON ser.id = aser.service_id
                        WHERE aser.appointment_id = a.id
                    )
                ) ORDER BY a.appointment_date DESC, a.start_time DESC) as appointments
            FROM appointments a
            LEFT JOIN users st ON a.staff_id = st.id
            WHERE ${whereClause}
            GROUP BY a.customer_phone
            ORDER BY last_visit DESC
        `);

        const rows = (result as any).rows as any[];
        return rows.map((row: any) => ({
            ...row,
            phone: formatPhoneWithSpaces(row.phone)
        }));
    }
}

export default new AppointmentService();
