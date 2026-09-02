import { db } from '../db';
import { sql } from 'drizzle-orm';
import smsService from './sms.service';
import redis from '../config/redis';
import { normalizePhone, formatPhoneWithSpaces } from '../utils/phone';

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
    package_id?: number | null;
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

    async createAppointment(appointment: Appointment): Promise<Appointment> {
        // Normalize customer phone
        if (appointment.customer_phone) {
            appointment.customer_phone = normalizePhone(appointment.customer_phone);
        }

        // Fetch package details if provided to get correct defaults
        let pkg: any = null;
        if (appointment.package_id) {
            const pkgRes = await db.execute(sql`
                SELECT p.*,
                       json_agg(json_build_object(
                           'id', s.id,
                           'name', s.name,
                           'duration_minutes', s.duration_minutes,
                           'price', s.price,
                           'staff_id', ps.staff_id
                       ) ORDER BY ps.order_index) as package_services
                FROM packages p
                LEFT JOIN package_services ps ON p.id = ps.package_id
                LEFT JOIN services s ON ps.service_id = s.id
                WHERE p.id = ${appointment.package_id}
                GROUP BY p.id
            `);
            const pkgRows = (pkgRes as any).rows as any[];
            pkg = pkgRows[0];
        }

        // 0. Determine service selections with correct ordering and staff mapping
        let serviceRecords: any[] = [];
        if (appointment.services && appointment.services.length > 0) {
            // Use the provided services array as it has the correct order and staff overrides
            const dbServicesRes = await db.execute(
                sql`SELECT id, duration_minutes, price, name FROM services WHERE id = ANY(${appointment.services.map((s: any) => s.id)})`
            );
            const dbServices = (dbServicesRes as any).rows as any[];

            serviceRecords = appointment.services.map((s: any) => {
                const dbS = dbServices.find(ds => ds.id === s.id);
                const pkgS = pkg?.package_services?.find((ps: any) => ps.id === s.id);
                return {
                    id: s.id,
                    price: (s.price !== undefined && s.price !== null) ? s.price : (pkgS?.price || dbS?.price || 0),
                    duration_minutes: (s.duration_minutes !== undefined && s.duration_minutes !== null) ? s.duration_minutes : (pkgS?.duration_minutes || dbS?.duration_minutes || 30),
                    name: dbS?.name || pkgS?.name || 'Hizmet',
                    staff_id: s.staff_id || appointment.staff_id || pkgS?.staff_id
                };
            });
        } else if (pkg) {
            // Use services from the package if no explicit services provided
            serviceRecords = (pkg.package_services || []).map((ps: any) => ({
                id: ps.id,
                price: ps.price || 0,
                duration_minutes: ps.duration_minutes || 30,
                name: ps.name || 'Hizmet',
                staff_id: appointment.staff_id || ps.staff_id
            }));
        } else {
            // Fallback for legacy calls using service_id or service_ids
            const serviceIds = appointment.service_ids || (appointment.service_id ? [appointment.service_id] : []);
            if (serviceIds.length === 0) throw new Error('En az bir hizmet seçilmelidir.');

            const dbServicesRes = await db.execute(
                sql`SELECT id, duration_minutes, price, name FROM services WHERE id = ANY(${serviceIds})`
            );
            const dbServices = (dbServicesRes as any).rows as any[];

            // Maintain input order if possible
            serviceRecords = serviceIds.map(id => {
                const dbS = dbServices.find(ds => ds.id === id);
                return {
                    id,
                    price: dbS?.price || 0,
                    duration_minutes: dbS?.duration_minutes || 30,
                    name: dbS?.name || 'Hizmet',
                    staff_id: appointment.staff_id
                };
            }).filter(s => !!s);
        }

        const totalDuration = (appointment.duration_minutes !== undefined && appointment.duration_minutes !== null) ? appointment.duration_minutes : (pkg?.duration_minutes || serviceRecords.reduce((sum, s) => sum + s.duration_minutes, 0));
        const totalPrice = (appointment.price !== undefined && appointment.price !== null) ? appointment.price : (pkg?.price || serviceRecords.reduce((sum, s) => sum + Number(s.price), 0));

        // Calculate a.end_time based on start_time and total duration
        if (appointment.start_time && !appointment.end_time) {
            const [h, m] = appointment.start_time.split(':').map(Number);
            const totalStartMinutes = h * 60 + m;
            const totalEndMinutes = totalStartMinutes + totalDuration;
            const eh = Math.floor(totalEndMinutes / 60);
            const em = totalEndMinutes % 60;
            appointment.end_time = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
        }

        if (!appointment.price) {
            appointment.price = totalPrice;
        }

        // 1. Check for overlapping appointments (Conflict Prevention)
        // For multi-staff, we check each involved staff member
        const uniqueStaffIds = Array.from(new Set(serviceRecords.map(s => s.staff_id).filter(id => !!id)));

        for (const sId of uniqueStaffIds) {
            // Zaman string karşılaştırması (HH:MM) için raw SQL — Drizzle'da time
            // tipi karşılaştırması daha karmaşık, doğrudan string karşılaştırma çalışır.
            const conflictRes = await db.execute(sql`
                SELECT id FROM appointments
                WHERE company_id = ${appointment.company_id}
                AND appointment_date = ${appointment.appointment_date}
                AND status != 'cancelled'
                AND (start_time < ${appointment.end_time} AND end_time > ${appointment.start_time})
                AND (staff_id = ${sId} OR id IN (SELECT appointment_id FROM appointment_services WHERE staff_id = ${sId}))
                LIMIT 1
            `);
            const conflictRows = (conflictRes as any).rows as any[];
            if (conflictRows.length > 0) {
                throw new Error(`Seçilen çalışanın (${sId}) bu saat diliminde başka bir randevusu bulunuyor.`);
            }
        }

        const primaryServiceId = serviceRecords[0]?.id || appointment.service_id;
        const mainStaffId = appointment.staff_id || serviceRecords[0]?.staff_id || null;

        // Tek transaction: appointments INSERT + appointment_services INSERT(s)
        // original_price schema'da yok → raw SQL.
        return await db.transaction(async (tx) => {
            const insertRes = await tx.execute(sql`
                INSERT INTO appointments (
                    company_id, customer_id, service_id, staff_id,
                    appointment_date, start_time, end_time, status, notes, price,
                    customer_phone, customer_name, device_id, package_id, original_price
                ) VALUES (
                    ${appointment.company_id},
                    ${appointment.customer_id || null},
                    ${primaryServiceId},
                    ${mainStaffId},
                    ${appointment.appointment_date},
                    ${appointment.start_time},
                    ${appointment.end_time},
                    ${appointment.status || 'pending'},
                    ${appointment.notes || null},
                    ${appointment.price || null},
                    ${appointment.customer_phone || null},
                    ${appointment.customer_name || null},
                    ${appointment.device_id || null},
                    ${appointment.package_id || null},
                    ${appointment.original_price ?? appointment.price ?? null}
                )
                RETURNING *
            `);
            const insertedRows = (insertRes as any).rows as any[];
            const newAppointment = insertedRows[0];

            // Insert into appointment_services with sequential timing
            let currentOffset = 0;
            const [baseH, baseM] = newAppointment.start_time.split(':').map(Number);

            for (const s of serviceRecords) {
                const startTotal = baseH * 60 + baseM + currentOffset;
                const endTotal = startTotal + s.duration_minutes;

                const sH = Math.floor(startTotal / 60);
                const sM = startTotal % 60;
                const eH = Math.floor(endTotal / 60);
                const eM = endTotal % 60;

                const sTime = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`;
                const eTime = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;

                await tx.execute(sql`
                    INSERT INTO appointment_services (appointment_id, service_id, price, duration_minutes, staff_id, status, start_time, end_time)
                    VALUES (${newAppointment.id}, ${s.id}, ${s.price}, ${s.duration_minutes}, ${s.staff_id || null}, ${newAppointment.status}, ${sTime}, ${eTime})
                `);
                currentOffset += s.duration_minutes;
            }

            // Appointment creation notification is skipped as per user request.
            // Notifications will be sent upon employee approval.
            return newAppointment;
        });
    }

    async getAppointmentsByIds(ids: number[]): Promise<Appointment[]> {
        if (!ids || ids.length === 0) return [];

        // json_agg(FILTER WHERE ...) raw SQL ile çözüldü.
        const result = await db.execute(sql`
            SELECT
                a.*,
                c.name as company_name,
                ms.name as service_name,
                pkg.name as package_name,
                st.first_name || ' ' || st.last_name as staff_name,
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
            LEFT JOIN packages pkg ON a.package_id = pkg.id
            LEFT JOIN users st ON a.staff_id = st.id
            LEFT JOIN companies c ON a.company_id = c.id
            LEFT JOIN users u ON a.customer_id = u.id
            WHERE a.id = ANY(${ids})
            GROUP BY a.id, c.name, ms.name, pkg.name, st.first_name, st.last_name, u.first_name, u.last_name
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
                pkg.name as package_name,
                st.first_name || ' ' || st.last_name as staff_name,
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
            LEFT JOIN packages pkg ON a.package_id = pkg.id
            LEFT JOIN users st ON a.staff_id = st.id
            LEFT JOIN companies c ON a.company_id = c.id
            LEFT JOIN users u ON a.customer_id = u.id
            WHERE ${whereClause}
            GROUP BY a.id, c.name, ms.name, pkg.name, st.first_name, st.last_name, u.first_name, u.last_name
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
                   pkg.name as package_name,
                   st.first_name || ' ' || st.last_name as staff_name,
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
            LEFT JOIN packages pkg ON a.package_id = pkg.id
            LEFT JOIN users st ON a.staff_id = st.id
            LEFT JOIN companies c ON a.company_id = c.id
            LEFT JOIN users u ON a.customer_id = u.id
            WHERE ${whereClause}
            GROUP BY a.id, c.name, ms.name, pkg.name, st.first_name, st.last_name, u.first_name, u.last_name
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
        // Transaction — tüm UPDATE'ler atomik.
        return await db.transaction(async (tx) => {
            // UPDATE appointments — payment_status, payment_method, collected_price, used_materials
            // schema'da yok (appointments.ts'de yok) → raw SQL.
            const updateRes = await tx.execute(sql`
                UPDATE appointments SET
                    status = ${status},
                    price = COALESCE(${price ?? null}, price),
                    payment_status = ${status === 'completed' ? 'paid' : 'pending'},
                    payment_method = COALESCE(payment_method, ${payment_method || (status === 'completed' ? 'cash' : null)}),
                    collected_price = COALESCE(collected_price, ${price ?? null}, price),
                    technical_notes = COALESCE(${technical_notes || null}, technical_notes),
                    used_materials = COALESCE(${used_materials || null}, used_materials)
                WHERE id = ${id}
                RETURNING *
            `);
            const updatedAppointment = (updateRes as any).rows[0];

            if (!updatedAppointment) {
                return null;
            }

            // Completed durumunda appointment_services fiyatlarını dağıt
            if (status === 'completed' || status === 'paid') {
                const finalPrice = price ?? updatedAppointment.price ?? 0;

                const servicesRes = await tx.execute(
                    sql`SELECT id, price FROM appointment_services WHERE appointment_id = ${id}`
                );
                const services = (servicesRes as any).rows as any[];

                if (services.length === 1) {
                    await tx.execute(sql`
                        UPDATE appointment_services SET price = ${finalPrice}, status = 'completed' WHERE id = ${services[0].id}
                    `);
                } else if (services.length > 1) {
                    const currentSum = services.reduce((sum, s) => sum + Number(s.price || 0), 0);
                    if (currentSum > 0) {
                        for (const s of services) {
                            const distributed = (Number(s.price || 0) / currentSum) * finalPrice;
                            await tx.execute(sql`
                                UPDATE appointment_services SET price = ${distributed}, status = 'completed' WHERE id = ${s.id}
                            `);
                        }
                    } else {
                        const distributed = finalPrice / services.length;
                        await tx.execute(sql`
                            UPDATE appointment_services SET price = ${distributed}, status = 'completed' WHERE appointment_id = ${id}
                        `);
                    }
                } else {
                    // Fallback if no services exist
                    await tx.execute(sql`UPDATE appointment_services SET status = 'completed' WHERE appointment_id = ${id}`);
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
        });
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
                   pkg.name as package_name,
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
            LEFT JOIN packages pkg ON a.package_id = pkg.id
            LEFT JOIN users u ON a.customer_id = u.id
            WHERE ${whereClause}
            GROUP BY a.id, u.first_name, u.last_name, pkg.name
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
                pkg.name as package_name,
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
            LEFT JOIN packages pkg ON a.package_id = pkg.id
            LEFT JOIN companies c ON a.company_id = c.id
            WHERE ${whereClause}
            GROUP BY a.id, c.name, pkg.name
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
                   COALESCE(ms.name, pkg.name, (SELECT string_agg(s.name, ', ') FROM appointment_services aps JOIN services s ON aps.service_id = s.id WHERE aps.appointment_id = a.id)) as service_name
            FROM appointments a
            LEFT JOIN services ms ON a.service_id = ms.id
            LEFT JOIN packages pkg ON a.package_id = pkg.id
            WHERE a.company_id = ${companyId}
            AND (a.customer_phone LIKE ${phonePattern} OR a.customer_name ILIKE ${namePattern})
            ORDER BY a.appointment_date DESC, a.start_time DESC
        `);
        return (result as any).rows as any[];
    }

    async getCustomersCRM(companyId: number, search?: string): Promise<any[]> {
        // customers tablosu Drizzle schema'da yok → raw SQL zorunlu.
        const whereConditions: any[] = [
            sql`a.company_id = ${companyId}`,
            sql`a.customer_phone IS NOT NULL AND a.customer_phone != ''`
        ];
        if (search) {
            const term = `%${search}%`;
            whereConditions.push(sql`(a.customer_phone ILIKE ${term} OR a.customer_name ILIKE ${term} OR c.email ILIKE ${term})`);
        }
        const whereClause = sql.join(whereConditions, sql` AND `);

        // İç içe subquery (MAX/COUNT/SUM) + json_agg → raw SQL
        const result = await db.execute(sql`
            SELECT
                a.customer_phone as phone,
                COALESCE(c.name, (
                    SELECT customer_name FROM appointments
                    WHERE customer_phone = a.customer_phone AND company_id = ${companyId}
                    ORDER BY appointment_date DESC, start_time DESC LIMIT 1
                )) as name,
                c.email,
                c.notes,
                c.is_iys_approved,
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
            LEFT JOIN customers c ON c.phone = a.customer_phone AND c.company_id = a.company_id
            WHERE ${whereClause}
            GROUP BY a.customer_phone, c.name, c.email, c.notes, c.is_iys_approved, c.id
            ORDER BY last_visit DESC
        `);

        const rows = (result as any).rows as any[];
        return rows.map((row: any) => ({
            ...row,
            phone: formatPhoneWithSpaces(row.phone)
        }));
    }

    async syncCustomer(companyId: number, data: any) {
        const { phone, name, email, notes, is_iys_approved } = data;
        const normalizedPhone = normalizePhone(phone);

        // customers tablosu Drizzle schema'da yok → raw SQL
        const result = await db.execute(sql`
            INSERT INTO customers (company_id, phone, name, email, notes, is_iys_approved)
            VALUES (${companyId}, ${normalizedPhone}, ${name}, ${email}, ${notes}, ${is_iys_approved})
            ON CONFLICT (company_id, phone) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                notes = EXCLUDED.notes,
                is_iys_approved = EXCLUDED.is_iys_approved,
                updated_at = NOW()
            RETURNING *
        `);
        return (result as any).rows[0];
    }

    async getAutomationRules(companyId: number) {
        // automation_rules tablosu Drizzle schema'da yok → raw SQL
        const result = await db.execute(
            sql`SELECT * FROM automation_rules WHERE company_id = ${companyId} ORDER BY created_at DESC`
        );
        return (result as any).rows as any[];
    }

    async createAutomationRule(companyId: number, data: any) {
        const { name, schedule_type, schedule_days, sql_script, action_type, message_template } = data;
        // automation_rules tablosu Drizzle schema'da yok → raw SQL
        const result = await db.execute(sql`
            INSERT INTO automation_rules (company_id, name, schedule_type, schedule_days, sql_script, action_type, message_template)
            VALUES (${companyId}, ${name}, ${schedule_type}, ${schedule_days}, ${sql_script}, ${action_type}, ${message_template})
            RETURNING *
        `);
        return (result as any).rows[0];
    }

    async updateAutomationRule(id: number, data: any) {
        // Whitelist + dynamic SET clause — sql.raw() ile kolon adları, sql template ile değerler
        const fields = Object.keys(data).filter(f =>
            ['name', 'schedule_type', 'schedule_days', 'sql_script', 'action_type', 'is_active', 'message_template'].includes(f)
        );
        const setClauses = fields.map((f) => sql`${sql.raw(f)} = ${data[f]}`);
        const setClause = sql.join(setClauses, sql`, `);

        // automation_rules tablosu Drizzle schema'da yok → raw SQL
        const result = await db.execute(sql`
            UPDATE automation_rules
            SET ${setClause}, updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `);
        return (result as any).rows[0];
    }
}

export default new AppointmentService();
