import pool from '../config/database';
import smsService from './sms.service';

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
    service_name?: string; // Legacy/Main service name
    services?: any[]; // Detailed services list
}

class AppointmentService {
    async createAppointment(appointment: Appointment): Promise<Appointment> {
        // Fetch package details if provided to get correct defaults
        let pkg: any = null;
        if (appointment.package_id) {
            const pkgRes = await pool.query(`
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
                WHERE p.id = $1
                GROUP BY p.id
            `, [appointment.package_id]);
            pkg = pkgRes.rows[0];
        }

        // 0. Determine service selections with correct ordering and staff mapping
        let serviceRecords: any[] = [];
        if (appointment.services && appointment.services.length > 0) {
            // Use the provided services array as it has the correct order and staff overrides
            const dbServicesRes = await pool.query('SELECT id, duration_minutes, price, name FROM services WHERE id = ANY($1)', [appointment.services.map((s: any) => s.id)]);
            const dbServices = dbServicesRes.rows;

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

            const dbServicesRes = await pool.query('SELECT id, duration_minutes, price, name FROM services WHERE id = ANY($1)', [serviceIds]);
            const dbServices = dbServicesRes.rows;

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
            const conflictQuery = `
                SELECT id FROM appointments 
                WHERE company_id = $1 
                AND appointment_date = $2 
                AND status != 'cancelled'
                AND (start_time < $4 AND end_time > $3)
                AND (staff_id = $5 OR id IN (SELECT appointment_id FROM appointment_services WHERE staff_id = $5))
                LIMIT 1
            `;
            const conflictResult = await pool.query(conflictQuery, [appointment.company_id, appointment.appointment_date, appointment.start_time, appointment.end_time, sId]);
            if (conflictResult.rowCount && conflictResult.rowCount > 0) {
                throw new Error(`Seçilen çalışanın (${sId}) bu saat diliminde başka bir randevusu bulunuyor.`);
            }
        }

        const primaryServiceId = serviceRecords[0]?.id || appointment.service_id;
        const mainStaffId = appointment.staff_id || serviceRecords[0]?.staff_id || null;

        const query = `
      INSERT INTO appointments (
        company_id, customer_id, service_id, staff_id, 
        appointment_date, start_time, end_time, status, notes, price,
        customer_phone, customer_name, device_id, package_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

        const values = [
            appointment.company_id,
            appointment.customer_id || null,
            primaryServiceId,
            mainStaffId,
            appointment.appointment_date,
            appointment.start_time,
            appointment.end_time,
            appointment.status || 'pending',
            appointment.notes || null,
            appointment.price || null,
            appointment.customer_phone || null,
            appointment.customer_name || null,
            appointment.device_id || null,
            appointment.package_id || null
        ];

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(query, values);
            const newAppointment = result.rows[0];

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

                await client.query(
                    'INSERT INTO appointment_services (appointment_id, service_id, price, duration_minutes, staff_id, status, start_time, end_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [newAppointment.id, s.id, s.price, s.duration_minutes, s.staff_id || null, newAppointment.status, sTime, eTime]
                );
                currentOffset += s.duration_minutes;
            }

            await client.query('COMMIT');

            // SMS Notification (Async)
            try {
                if (newAppointment.customer_id || newAppointment.customer_phone) {
                    const phone = newAppointment.customer_phone;
                    const name = newAppointment.customer_name || 'Değerli Müşterimiz';
                    if (phone) {
                        const message = `Merhaba ${name}, randevunuz alınmıştır. Tarih: ${newAppointment.appointment_date} Saat: ${newAppointment.start_time}. Bizi tercih ettiğiniz için teşekkür ederiz!`;
                        await smsService.sendSms(newAppointment.company_id, phone, message);
                    }
                }
            } catch (smsError) {
                console.error('SMS notification failed during appointment creation:', smsError);
            }

            return newAppointment;
        } catch (dbError) {
            await client.query('ROLLBACK');
            console.error('[AppointmentService] Database Error:', dbError);
            throw dbError;
        } finally {
            client.release();
        }
    }

    async getAppointmentsByIds(ids: number[]): Promise<Appointment[]> {
        if (!ids || ids.length === 0) return [];

        const query = `
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
            WHERE a.id = ANY($1)
            GROUP BY a.id, c.name, ms.name, pkg.name, st.first_name, st.last_name, u.first_name, u.last_name
            ORDER BY a.appointment_date DESC, a.start_time DESC
        `;

        try {
            const result = await pool.query(query, [ids]);
            return result.rows;
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

        let query = `
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
            WHERE (
                regexp_replace(COALESCE(u.phone, ''), '\\D', '', 'g') LIKE $1 OR 
                regexp_replace(COALESCE(a.notes, ''), '\\D', '', 'g') LIKE $1 OR
                regexp_replace(COALESCE(a.customer_phone, ''), '\\D', '', 'g') LIKE $1
            )
        `;
        const values: any[] = [searchPattern];

        if (companyId) {
            query += ` AND a.company_id = $2`;
            values.push(companyId);
        }

        query += ' GROUP BY a.id, c.name, ms.name, pkg.name, st.first_name, st.last_name, u.first_name, u.last_name ORDER BY a.appointment_date DESC, a.start_time DESC';

        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (err) {
            console.error('[Service] getAppointmentsByPhone Error:', err);
            throw err;
        }
    }

    async getAppointmentsByCompany(companyId: number, status?: string, staffId?: number, startDate?: string, endDate?: string): Promise<Appointment[]> {
        console.log(`[Service] getAppointmentsByCompany: ID=${companyId}, Status=${status}, Staff=${staffId}, StartDate=${startDate}, EndDate=${endDate}`);
        let query = `
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
      WHERE a.company_id = $1
    `;
        const values: any[] = [companyId];
        let paramIndex = 2;

        if (status) {
            query += ` AND a.status = $${paramIndex}`;
            values.push(status);
            paramIndex++;
        }

        if (staffId) {
            query += ` AND (a.staff_id = $${paramIndex} OR a.staff_id IS NULL OR EXISTS (SELECT 1 FROM appointment_services WHERE appointment_id = a.id AND staff_id = $${paramIndex}))`;
            values.push(staffId);
            paramIndex++;
        }

        if (startDate && endDate) {
            query += ` AND a.appointment_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            values.push(startDate, endDate);
            paramIndex += 2;
        } else if (startDate) {
            query += ` AND a.appointment_date >= $${paramIndex}`;
            values.push(startDate);
            paramIndex++;
        }

        query += ' GROUP BY a.id, c.name, ms.name, pkg.name, st.first_name, st.last_name, u.first_name, u.last_name ORDER BY a.appointment_date DESC, a.start_time DESC';

        try {
            const result = await pool.query(query, values);
            console.log(`[Service] Found ${result.rowCount} rows`);
            return result.rows;
        } catch (err) {
            console.error('[Service] Query Error:', err);
            throw err;
        }
    }

    async updateAppointmentStatus(id: number, status: string, price?: number): Promise<Appointment | null> {
        try {
            let result;
            if (price !== undefined && price !== null) {
                result = await pool.query(
                    'UPDATE appointments SET status = $1, price = $2 WHERE id = $3 RETURNING *',
                    [status, price, id]
                );
            } else {
                result = await pool.query(
                    'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
                    [status, id]
                );
            }
            const updatedAppointment = result.rows[0];

            if (updatedAppointment && status === 'approved') {
                try {
                    const phone = updatedAppointment.customer_phone;
                    const name = updatedAppointment.customer_name || 'Değerli Müşterimiz';

                    if (phone) {
                        const message = `Sayın ${name}, randevunuz onaylanmıştır. Tarih: ${updatedAppointment.appointment_date} Saat: ${updatedAppointment.start_time}. Bekliyoruz!`;
                        await smsService.sendSms(updatedAppointment.company_id, phone, message);
                    }
                } catch (smsError) {
                    console.error('SMS notification failed during appointment approval:', smsError);
                }
            }

            return updatedAppointment || null;
        } catch (err) {
            console.error('[Service] Update Status Error:', err);
            throw err;
        }
    }

    async updateAppointmentServiceStatus(apsId: number, status: string): Promise<any> {
        try {
            const result = await pool.query(
                'UPDATE appointment_services SET status = $1 WHERE id = $2 RETURNING *',
                [status, apsId]
            );
            const updatedService = result.rows[0];

            if (updatedService && status === 'approved') {
                const appId = updatedService.appointment_id;
                const allServicesRes = await pool.query('SELECT status FROM appointment_services WHERE appointment_id = $1', [appId]);
                const allApproved = allServicesRes.rows.every(s => s.status === 'approved');

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
        let query = `
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
      WHERE a.company_id = $1 AND a.appointment_date BETWEEN $2 AND $3
    `;
        const values: any[] = [companyId, startDate, endDate];
        let paramIndex = 4;

        if (staffId) {
            query += ` AND (a.staff_id = $${paramIndex} OR a.staff_id IS NULL OR EXISTS (SELECT 1 FROM appointment_services WHERE appointment_id = a.id AND staff_id = $${paramIndex}))`;
            values.push(staffId);
            paramIndex++;
        }

        query += ' GROUP BY a.id, u.first_name, u.last_name, pkg.name ORDER BY a.appointment_date, a.start_time';
        try {
            const result = await pool.query(query, values);
            console.log(`[Service] Range Found ${result.rowCount} rows`);
            return result.rows;
        } catch (err) {
            console.error('[Service] Range Query Error:', err);
            throw err;
        }
    }

    async getAppointmentsByDevice(deviceId: string): Promise<Appointment[]> {
        console.log(`[Service] getAppointmentsByDevice: ${deviceId}`);

        // Önce bu cihazın hangi telefona bağlı olduğunu bulalım
        const deviceRes = await pool.query('SELECT customer_phone FROM customer_devices WHERE device_id = $1', [deviceId]);
        const phone = deviceRes.rows[0]?.customer_phone;

        let query = `
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
            WHERE a.device_id = $1
        `;
        const values: any[] = [deviceId];

        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '');
            const searchPattern = `%${cleanPhone}%`;
            query += ` OR regexp_replace(COALESCE(a.customer_phone, ''), '\\D', '', 'g') LIKE $2 
                       OR regexp_replace(COALESCE(a.notes, ''), '\\D', '', 'g') LIKE $2`;
            values.push(searchPattern);
        }

        query += ' GROUP BY a.id, c.name, pkg.name ORDER BY a.appointment_date DESC, a.start_time DESC';

        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (err) {
            console.error('[Service] getAppointmentsByDevice Error:', err);
            throw err;
        }
    }

    async syncDeviceWithPhone(deviceId: string, phone: string) {
        console.log(`[Service] syncDeviceWithPhone: Device=${deviceId}, Phone=${phone}`);
        const query = `
            INSERT INTO customer_devices (device_id, customer_phone, last_sync)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (device_id) 
            DO UPDATE SET customer_phone = $2, last_sync = CURRENT_TIMESTAMP
        `;
        await pool.query(query, [deviceId, phone]);
    }

    async rateAppointment(id: number, rating: number, comment?: string): Promise<Appointment | null> {
        console.log(`[Service] rateAppointment: ID=${id}, Rating=${rating}`);
        const result = await pool.query(
            'UPDATE appointments SET rating = $1, comment = $2 WHERE id = $3 RETURNING *',
            [rating, comment || null, id]
        );
        return result.rows[0] || null;
    }

    async getCompletedAppointments(companyId: number, startDate?: string, endDate?: string, search?: string): Promise<any[]> {
        let query = `
            SELECT a.*, s.name as service_name, st.first_name || ' ' || st.last_name as staff_name,
                   COALESCE(i.status, 'pending') as invoice_status
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN users st ON a.staff_id = st.id
            LEFT JOIN LATERAL (SELECT status FROM invoices WHERE appointment_id = a.id ORDER BY id DESC LIMIT 1) i ON true
            WHERE a.company_id = $1 AND a.status = 'completed'
        `;
        const values: any[] = [companyId];
        let i = 2;

        if (startDate && endDate) {
            query += ` AND a.appointment_date BETWEEN $${i} AND $${i + 1}`;
            values.push(startDate, endDate);
            i += 2;
        }

        if (search) {
            query += ` AND (a.customer_name ILIKE $${i} OR a.customer_phone ILIKE $${i})`;
            values.push(`%${search}%`);
            i++;
        }

        query += ' ORDER BY a.appointment_date DESC, a.start_time DESC';
        const result = await pool.query(query, values);
        return result.rows;
    }
}

export default new AppointmentService();
