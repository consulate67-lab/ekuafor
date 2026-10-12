import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import pool from '../config/database';
import { normalizePhone } from '../utils/phone';

/**
 * Sektör-bağımsız rezervasyon: müsaitlik hesabı ve randevu oluşturma tek yerde.
 *
 * Rezervasyon tipi hizmetten gelir (`services.booking_mode`):
 *   staff    → çalışanın zamanı; aynı çalışan aynı anda tek randevu
 *   resource → saha / kulvar / oda; aynı kaynak aynı anda tek rezervasyon
 *   class    → grup dersi seansı; kapasite dolana kadar kayıt
 *
 * Saatler firmanın yerel saatidir (Europe/Istanbul); tarih `YYYY-MM-DD`, saat `HH:MM`.
 */

export type BookingMode = 'staff' | 'resource' | 'class';

export class BookingError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

type Db = Pick<PoolClient, 'query'>;
interface Interval { start: number; end: number }

interface ServiceRow {
    id: number;
    name: string;
    duration_minutes: number;
    price: string;
    booking_mode: BookingMode;
    duration_options: number[] | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:\d{2})?$/;
const DAY_END = 24 * 60;
const MAX_RANGE_DAYS = 62;

const toMinutes = (t: string) => {
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + (m || 0);
};
const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const isFree = (span: Interval, busy: Interval[] = []) => !busy.some(b => span.start < b.end && b.start < span.end);
const roundPrice = (n: number) => Math.round(n * 100) / 100;

const assertDate = (date: unknown): string => {
    if (typeof date !== 'string' || !DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
        throw new BookingError(400, 'Geçersiz tarih');
    }
    return date;
};
const assertTime = (time: unknown): number => {
    if (typeof time !== 'string' || !TIME_RE.test(time)) throw new BookingError(400, 'Geçersiz saat');
    return toMinutes(time);
};
const addDays = (date: string, days: number) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

export const nowInIstanbul = () => {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(new Date()).map(p => [p.type, p.value])
    );
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
};

/** Müşterinin en erken alabileceği dakika; geçmiş gün için null (hiç alınamaz). */
const earliestStart = (date: string): number | null => {
    const now = nowInIstanbul();
    if (date < now.date) return null;
    return date === now.date ? now.minutes + 5 : 0;
};

const getOpening = async (db: Db, companyId: number, date: string) => {
    const company = await db.query('SELECT work_start_time, work_end_time, slot_interval FROM companies WHERE id = $1', [companyId]);
    if (company.rows.length === 0) throw new BookingError(404, 'Firma bulunamadı');
    const { work_start_time, work_end_time, slot_interval } = company.rows[0];
    const step = Number(slot_interval) > 0 ? Number(slot_interval) : 30;

    const hours = await db.query(
        'SELECT day_of_week, start_time, end_time FROM working_hours WHERE company_id = $1 AND COALESCE(is_active, true)',
        [companyId]
    );
    if (hours.rows.length > 0) {
        const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
        const windows = hours.rows
            .filter(r => Number(r.day_of_week) === dow)
            .map(r => ({ start: toMinutes(r.start_time), end: toMinutes(r.end_time) }));
        return { windows, step };
    }
    const end = toMinutes(work_end_time || '20:00');
    return { windows: [{ start: toMinutes(work_start_time || '09:00'), end: end === 0 ? DAY_END : end }], step };
};

const withinOpening = (span: Interval, windows: Interval[]) => windows.some(w => span.start >= w.start && span.end <= w.end);

const loadServices = async (db: Db, companyId: number, serviceIds: number[]): Promise<ServiceRow[]> => {
    if (serviceIds.length === 0) throw new BookingError(400, 'En az bir hizmet seçilmelidir');
    const result = await db.query(
        `SELECT id, name, duration_minutes, price, booking_mode, duration_options
         FROM services WHERE company_id = $1 AND id = ANY($2::int[]) AND COALESCE(is_active, true)`,
        [companyId, serviceIds]
    );
    const rows = result.rows as ServiceRow[];
    if (new Set(serviceIds).size !== rows.length) throw new BookingError(400, 'Seçilen hizmet bu firmada bulunamadı');
    const modes = new Set(rows.map(r => r.booking_mode));
    if (modes.size > 1) throw new BookingError(400, 'Farklı rezervasyon tipindeki hizmetler aynı randevuda birleştirilemez');
    if (rows[0].booking_mode !== 'staff' && rows.length > 1) throw new BookingError(400, 'Bu hizmet tek başına rezerve edilir');
    return serviceIds.map(id => rows.find(r => r.id === id)!);
};

const resolveDuration = (service: ServiceRow, requested?: number | null) => {
    const allowed = service.duration_options?.length ? service.duration_options : [service.duration_minutes];
    if (requested) {
        if (!allowed.includes(requested)) throw new BookingError(400, `Bu hizmet için seçilebilecek süreler: ${allowed.join(', ')} dk`);
        return requested;
    }
    return allowed.includes(service.duration_minutes) ? service.duration_minutes : allowed[0];
};

/** Randevu alınabilen çalışanlar: firmaya bağlı, aktif, rolü `staff`. */
const getBookableStaff = async (db: Db, companyId: number): Promise<number[]> => {
    const result = await db.query(
        `SELECT DISTINCT u.id FROM users u
         LEFT JOIN company_users cu ON cu.user_id = u.id AND cu.company_id = $1
         WHERE (u.company_id = $1 OR cu.company_id = $1) AND u.role = 'staff' AND COALESCE(u.is_active, true)
         ORDER BY u.id`,
        [companyId]
    );
    return result.rows.map(r => Number(r.id));
};

const isCompanyMember = async (db: Db, companyId: number, userId: number) => {
    const result = await db.query(
        `SELECT 1 FROM users u LEFT JOIN company_users cu ON cu.user_id = u.id AND cu.company_id = $1
         WHERE u.id = $2 AND (u.company_id = $1 OR cu.company_id = $1) LIMIT 1`,
        [companyId, userId]
    );
    return result.rows.length > 0;
};

const getStaffBusy = async (db: Db, companyId: number, date: string) => {
    const result = await db.query(
        `SELECT COALESCE(aps.staff_id, a.staff_id) AS staff_id,
                COALESCE(NULLIF(aps.start_time, ''), to_char(a.start_time, 'HH24:MI')) AS start_time,
                COALESCE(NULLIF(aps.end_time, ''), to_char(a.end_time, 'HH24:MI')) AS end_time
         FROM appointments a
         LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
         WHERE a.company_id = $1 AND a.appointment_date = $2 AND a.status <> 'cancelled'
           AND a.resource_id IS NULL AND a.class_session_id IS NULL
         UNION ALL
         SELECT staff_id, to_char(start_time, 'HH24:MI'), to_char(end_time, 'HH24:MI')
         FROM class_sessions
         WHERE company_id = $1 AND session_date = $2 AND status = 'scheduled' AND staff_id IS NOT NULL`,
        [companyId, date]
    );
    const byStaff = new Map<number, Interval[]>();
    const unassigned: Interval[] = [];
    for (const r of result.rows) {
        const interval = { start: toMinutes(r.start_time), end: toMinutes(r.end_time) };
        if (r.staff_id == null) unassigned.push(interval);
        else byStaff.set(Number(r.staff_id), [...(byStaff.get(Number(r.staff_id)) || []), interval]);
    }
    return { byStaff, unassigned };
};

const getResourceBusy = async (db: Db, companyId: number, date: string) => {
    const result = await db.query(
        `SELECT resource_id, to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time
         FROM appointments
         WHERE company_id = $1 AND appointment_date = $2 AND status <> 'cancelled' AND resource_id IS NOT NULL
         UNION ALL
         SELECT resource_id, to_char(start_time, 'HH24:MI'), to_char(end_time, 'HH24:MI')
         FROM class_sessions
         WHERE company_id = $1 AND session_date = $2 AND status = 'scheduled' AND resource_id IS NOT NULL`,
        [companyId, date]
    );
    const byResource = new Map<number, Interval[]>();
    for (const r of result.rows) {
        const id = Number(r.resource_id);
        byResource.set(id, [...(byResource.get(id) || []), { start: toMinutes(r.start_time), end: toMinutes(r.end_time) }]);
    }
    return byResource;
};

/** Hizmetin verilebildiği aktif kaynaklar; hizmete bağlı kaynak yoksa firmanın tüm aktif kaynakları. */
const getServiceResources = async (db: Db, companyId: number, serviceId: number): Promise<number[]> => {
    const result = await db.query(
        `SELECT r.id FROM resources r
         WHERE r.company_id = $1 AND r.is_active
           AND (NOT EXISTS (SELECT 1 FROM service_resources WHERE service_id = $2)
                OR r.id IN (SELECT resource_id FROM service_resources WHERE service_id = $2))
         ORDER BY r.display_order, r.id`,
        [companyId, serviceId]
    );
    return result.rows.map(r => Number(r.id));
};

const pickStaffCandidates = async (db: Db, companyId: number, staffId: number | null | undefined, publicRequest: boolean) => {
    const bookable = await getBookableStaff(db, companyId);
    if (!staffId) return { candidates: bookable, bookable };
    const allowed = publicRequest ? bookable.includes(staffId) : await isCompanyMember(db, companyId, staffId);
    if (!allowed) throw new BookingError(400, 'Seçilen çalışan bu firmada bulunamadı');
    return { candidates: [staffId], bookable };
};

const pickResourceCandidates = async (db: Db, companyId: number, serviceId: number, resourceId?: number | null) => {
    const resources = await getServiceResources(db, companyId, serviceId);
    if (resourceId) {
        if (!resources.includes(resourceId)) throw new BookingError(400, 'Seçilen alan bu hizmet için kullanılamıyor');
        return [resourceId];
    }
    return resources;
};

export interface AvailabilityQuery {
    companyId: number;
    serviceIds: number[];
    date: string;
    staffId?: number | null;
    resourceId?: number | null;
    durationMinutes?: number | null;
}

export interface Slot {
    time: string;
    available: boolean;
    staff_ids?: number[];
    resource_ids?: number[];
}

export const getAvailability = async (q: AvailabilityQuery) => {
    const date = assertDate(q.date);
    const services = await loadServices(pool, q.companyId, q.serviceIds);
    const mode = services[0].booking_mode;
    if (mode === 'class') throw new BookingError(400, 'Grup dersleri için seans listesini kullanın');

    const { windows, step } = await getOpening(pool, q.companyId, date);
    const minStart = earliestStart(date);
    const slots: Slot[] = [];
    const eachStart = (duration: number, check: (span: Interval) => Partial<Slot> & { available: boolean }) => {
        for (const w of windows) {
            for (let t = w.start; t + duration <= w.end; t += step) {
                const span = { start: t, end: t + duration };
                const result = minStart === null || t < minStart ? { available: false } : check(span);
                slots.push({ time: toTime(t), ...result });
            }
        }
    };

    if (mode === 'resource') {
        const duration = resolveDuration(services[0], q.durationMinutes);
        const resources = await pickResourceCandidates(pool, q.companyId, services[0].id, q.resourceId);
        const busy = await getResourceBusy(pool, q.companyId, date);
        eachStart(duration, span => {
            const free = resources.filter(id => isFree(span, busy.get(id)));
            return { available: free.length > 0, resource_ids: free };
        });
        return { mode, date, duration, slots };
    }

    const duration = services.reduce((sum, s) => sum + Number(s.duration_minutes), 0);
    const { candidates, bookable } = await pickStaffCandidates(pool, q.companyId, q.staffId, true);
    const busy = await getStaffBusy(pool, q.companyId, date);
    eachStart(duration, span => {
        if (bookable.length === 0) return { available: isFree(span, busy.unassigned) };
        const free = candidates.filter(id => isFree(span, busy.byStaff.get(id)));
        return { available: free.length > 0, staff_ids: free };
    });
    return { mode, date, duration, slots };
};

export interface ClassSessionQuery {
    companyId: number;
    from: string;
    to: string;
    serviceId?: number | null;
    includeCancelled?: boolean;
}

export const listClassSessions = async (q: ClassSessionQuery) => {
    const from = assertDate(q.from);
    const to = assertDate(q.to);
    if (to < from || to > addDays(from, MAX_RANGE_DAYS)) throw new BookingError(400, `Tarih aralığı en fazla ${MAX_RANGE_DAYS} gün olabilir`);
    const result = await pool.query(
        `SELECT cs.id, cs.service_id, s.name AS service_name, s.price, cs.staff_id,
                NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), '') AS staff_name,
                cs.resource_id, r.name AS resource_name,
                to_char(cs.session_date, 'YYYY-MM-DD') AS session_date,
                to_char(cs.start_time, 'HH24:MI') AS start_time, to_char(cs.end_time, 'HH24:MI') AS end_time,
                cs.capacity, cs.status, cs.series_id,
                COALESCE(b.booked, 0)::int AS booked,
                GREATEST(cs.capacity - COALESCE(b.booked, 0), 0)::int AS remaining
         FROM class_sessions cs
         JOIN services s ON s.id = cs.service_id
         LEFT JOIN users u ON u.id = cs.staff_id
         LEFT JOIN resources r ON r.id = cs.resource_id
         LEFT JOIN LATERAL (
             SELECT SUM(a.party_size) AS booked FROM appointments a
             WHERE a.class_session_id = cs.id AND a.status <> 'cancelled'
         ) b ON true
         WHERE cs.company_id = $1 AND cs.session_date BETWEEN $2 AND $3
           AND ($4::int IS NULL OR cs.service_id = $4)
           AND ($5::boolean OR cs.status = 'scheduled')
         ORDER BY cs.session_date, cs.start_time, cs.id`,
        [q.companyId, from, to, q.serviceId ?? null, !!q.includeCancelled]
    );
    return result.rows;
};

export interface ClassSessionInput {
    companyId: number;
    serviceId: number;
    staffId?: number | null;
    resourceId?: number | null;
    date: string;
    startTime: string;
    durationMinutes?: number | null;
    capacity: number;
    repeatWeeks?: number;
}

/** Seans (ve istenirse sonraki haftalara tekrarları) oluşturur; eğitmen ve salon çakışmasını kontrol eder. */
export const createClassSessions = async (input: ClassSessionInput) => {
    const date = assertDate(input.date);
    const start = assertTime(input.startTime);
    const repeatWeeks = Math.min(Math.max(Math.trunc(input.repeatWeeks || 0), 0), 26);
    if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 500) throw new BookingError(400, 'Kapasite 1-500 arasında olmalıdır');

    return withTransaction(async client => {
        const [service] = await loadServices(client, input.companyId, [input.serviceId]);
        if (service.booking_mode !== 'class') throw new BookingError(400, 'Seans sadece grup dersi tipindeki hizmetler için açılır');
        const duration = input.durationMinutes || Number(service.duration_minutes);
        const span = { start, end: start + duration };
        if (span.end > DAY_END) throw new BookingError(400, 'Seans gün içinde bitmelidir');
        if (input.staffId && !(await isCompanyMember(client, input.companyId, input.staffId))) {
            throw new BookingError(400, 'Seçilen eğitmen bu firmada bulunamadı');
        }
        if (input.resourceId) {
            const r = await client.query('SELECT 1 FROM resources WHERE id = $1 AND company_id = $2 AND is_active', [input.resourceId, input.companyId]);
            if (r.rows.length === 0) throw new BookingError(400, 'Seçilen salon bu firmada bulunamadı');
        }

        const seriesId = repeatWeeks > 0 ? randomUUID() : null;
        const created = [];
        for (let i = 0; i <= repeatWeeks; i++) {
            const day = addDays(date, i * 7);
            await lockDay(client, input.companyId, day);
            if (input.staffId) {
                const busy = await getStaffBusy(client, input.companyId, day);
                if (!isFree(span, busy.byStaff.get(input.staffId))) throw new BookingError(409, `${day} ${toTime(start)}: eğitmenin bu saatte başka randevusu var`);
            }
            if (input.resourceId) {
                const busy = await getResourceBusy(client, input.companyId, day);
                if (!isFree(span, busy.get(input.resourceId))) throw new BookingError(409, `${day} ${toTime(start)}: salon bu saatte dolu`);
            }
            const row = await client.query(
                `INSERT INTO class_sessions (company_id, service_id, staff_id, resource_id, session_date, start_time, end_time, capacity, series_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
                [input.companyId, service.id, input.staffId || null, input.resourceId || null, day, toTime(span.start), toTime(span.end), input.capacity, seriesId]
            );
            created.push(row.rows[0].id);
        }
        return { ids: created, series_id: seriesId };
    });
};

/**
 * Seansı (veya serinin bu ve sonraki seanslarını) iptal eder.
 * İptal edilen seanslardaki aktif randevuların id'lerini döndürür; bildirim çağıran tarafta gönderilir.
 */
export const cancelClassSessions = async (companyId: number, sessionId: number, scope: 'single' | 'following') => {
    return withTransaction(async client => {
        const session = await client.query(
            `SELECT id, series_id, session_date FROM class_sessions WHERE id = $1 AND company_id = $2`,
            [sessionId, companyId]
        );
        if (session.rows.length === 0) throw new BookingError(404, 'Seans bulunamadı');
        const { series_id, session_date } = session.rows[0];
        const ids = scope === 'following' && series_id
            ? (await client.query(
                `SELECT id FROM class_sessions WHERE company_id = $1 AND series_id = $2 AND session_date >= $3 AND status = 'scheduled'`,
                [companyId, series_id, session_date]
            )).rows.map(r => r.id)
            : [sessionId];
        await client.query(`UPDATE class_sessions SET status = 'cancelled' WHERE id = ANY($1::int[])`, [ids]);
        const appointments = await client.query(
            `SELECT id FROM appointments WHERE class_session_id = ANY($1::int[]) AND status <> 'cancelled'`,
            [ids]
        );
        return { session_ids: ids, appointment_ids: appointments.rows.map(r => Number(r.id)) };
    });
};

export const updateClassSessionCapacity = async (companyId: number, sessionId: number, capacity: number) => {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) throw new BookingError(400, 'Kapasite 1-500 arasında olmalıdır');
    return withTransaction(async client => {
        const session = await client.query(
            `SELECT cs.id, cs.session_date,
                    (SELECT COALESCE(SUM(party_size), 0) FROM appointments WHERE class_session_id = cs.id AND status <> 'cancelled')::int AS booked
             FROM class_sessions cs WHERE cs.id = $1 AND cs.company_id = $2`,
            [sessionId, companyId]
        );
        if (session.rows.length === 0) throw new BookingError(404, 'Seans bulunamadı');
        if (capacity < session.rows[0].booked) throw new BookingError(409, `Bu seansta ${session.rows[0].booked} kayıt var; kapasite bunun altına düşürülemez`);
        await client.query('UPDATE class_sessions SET capacity = $1 WHERE id = $2', [capacity, sessionId]);
    });
};

export const getClassSessionAttendees = async (companyId: number, sessionId: number) => {
    const result = await pool.query(
        `SELECT a.id, a.customer_name, a.customer_phone, a.party_size, a.status
         FROM appointments a JOIN class_sessions cs ON cs.id = a.class_session_id
         WHERE cs.id = $1 AND cs.company_id = $2 AND a.status <> 'cancelled'
         ORDER BY a.created_at`,
        [sessionId, companyId]
    );
    return result.rows;
};

export interface BookingItem {
    serviceId: number;
    staffId?: number | null;
    durationMinutes?: number | null;
    price?: number | null;
}

export interface BookingInput {
    companyId: number;
    items: BookingItem[];
    staffId?: number | null;
    resourceId?: number | null;
    classSessionId?: number | null;
    partySize?: number | null;
    date?: string | null;
    startTime?: string | null;
    durationMinutes?: number | null;
    price?: number | null;
    status: string;
    notes?: string | null;
    customerId?: number | null;
    customerName?: string | null;
    customerPhone?: string | null;
    deviceId?: string | null;
    clientRequestId?: string | null;
    /** Firma kullanıcısı / board: çalışma saati dışına, geçmişe ve fiyat/süre değişikliğine izin verilir */
    byCompany: boolean;
}

const withTransaction = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/** Aynı firma + gün için rezervasyonları sıraya sokar; iki istek aynı slotu aynı anda alamaz. */
const lockDay = (client: Db, companyId: number, date: string) =>
    client.query('SELECT pg_advisory_xact_lock($1, $2)', [companyId, Number(date.replace(/-/g, ''))]);

interface Segment { serviceId: number; staffId: number | null; start: number; end: number; price: number }

export const createBooking = async (input: BookingInput) => {
    try {
        return await insertBooking(input);
    } catch (err: any) {
        if (err?.code === '23505' && err?.constraint === 'uq_appointments_client_request') {
            const existing = await pool.query(
                'SELECT * FROM appointments WHERE company_id = $1 AND client_request_id = $2',
                [input.companyId, input.clientRequestId]
            );
            if (existing.rows.length > 0) return existing.rows[0];
        }
        throw err;
    }
};

const insertBooking = async (input: BookingInput) => {
    const partySize = input.partySize ?? 1;
    if (!Number.isInteger(partySize) || partySize < 1 || partySize > 50) throw new BookingError(400, 'Kişi sayısı geçersiz');
    const customerPhone = input.customerPhone ? normalizePhone(input.customerPhone) : null;

    return withTransaction(async client => {
        let date: string;
        if (input.classSessionId) {
            const s = await client.query(
                `SELECT to_char(session_date, 'YYYY-MM-DD') AS session_date FROM class_sessions WHERE id = $1 AND company_id = $2`,
                [input.classSessionId, input.companyId]
            );
            if (s.rows.length === 0) throw new BookingError(404, 'Seans bulunamadı');
            date = s.rows[0].session_date;
        } else {
            date = assertDate(input.date);
        }
        await lockDay(client, input.companyId, date);

        if (input.clientRequestId) {
            const existing = await client.query(
                'SELECT * FROM appointments WHERE company_id = $1 AND client_request_id = $2',
                [input.companyId, input.clientRequestId]
            );
            if (existing.rows.length > 0) return existing.rows[0];
        }

        let appointment: {
            serviceId: number; staffId: number | null; resourceId: number | null; start: number; end: number; price: number; listPrice: number;
        };
        let segments: Segment[];

        if (input.classSessionId) {
            const result = await client.query(
                `SELECT cs.service_id, cs.staff_id, cs.capacity, cs.status,
                        to_char(cs.start_time, 'HH24:MI') AS start_time, to_char(cs.end_time, 'HH24:MI') AS end_time,
                        (SELECT COALESCE(SUM(party_size), 0) FROM appointments WHERE class_session_id = cs.id AND status <> 'cancelled')::int AS booked
                 FROM class_sessions cs WHERE cs.id = $1`,
                [input.classSessionId]
            );
            const session = result.rows[0];
            const [service] = await loadServices(client, input.companyId, [session.service_id]);
            if (service.booking_mode !== 'class') throw new BookingError(400, 'Bu seans grup dersine ait değil');
            if (session.status !== 'scheduled') throw new BookingError(409, 'Bu seans iptal edildi');
            const start = toMinutes(session.start_time);
            if (!input.byCompany) {
                const minStart = earliestStart(date);
                if (minStart === null || start < minStart) throw new BookingError(409, 'Bu seansın kayıt süresi geçti');
            }
            if (session.booked + partySize > session.capacity) {
                const remaining = Math.max(session.capacity - session.booked, 0);
                throw new BookingError(409, remaining === 0 ? 'Seans dolu' : `Bu seansta sadece ${remaining} kişilik yer kaldı`);
            }
            const listPrice = roundPrice(Number(service.price) * partySize);
            appointment = {
                serviceId: service.id, staffId: session.staff_id, resourceId: null,
                start, end: toMinutes(session.end_time), listPrice,
                price: input.byCompany && input.price != null ? input.price : listPrice,
            };
            segments = [{ serviceId: service.id, staffId: session.staff_id, start, end: appointment.end, price: appointment.price }];
        } else {
            const start = assertTime(input.startTime);
            const services = await loadServices(client, input.companyId, input.items.map(i => i.serviceId));
            const mode = services[0].booking_mode;
            if (mode === 'class') throw new BookingError(400, 'Grup dersi için seans seçilmelidir');
            const { windows } = await getOpening(client, input.companyId, date);
            const checkPublicSpan = (span: Interval) => {
                if (input.byCompany) return;
                const minStart = earliestStart(date);
                if (minStart === null || span.start < minStart) throw new BookingError(409, 'Geçmiş bir saate randevu alınamaz');
                if (!withinOpening(span, windows)) throw new BookingError(409, 'Seçilen saat çalışma saatleri dışında');
            };

            if (mode === 'resource') {
                const service = services[0];
                const requested = input.durationMinutes ?? input.items[0].durationMinutes;
                const duration = resolveDuration(service, requested);
                const span = { start, end: start + duration };
                if (span.end > DAY_END) throw new BookingError(400, 'Rezervasyon gün içinde bitmelidir');
                checkPublicSpan(span);
                const candidates = await pickResourceCandidates(client, input.companyId, service.id, input.resourceId);
                if (candidates.length === 0) throw new BookingError(409, 'Bu hizmet için tanımlı alan yok');
                const busy = await getResourceBusy(client, input.companyId, date);
                const resourceId = candidates.find(id => isFree(span, busy.get(id)));
                if (!resourceId) throw new BookingError(409, 'Seçilen saat dolu');
                const listPrice = roundPrice(Number(service.price) * duration / Number(service.duration_minutes));
                appointment = {
                    serviceId: service.id, staffId: null, resourceId, ...span, listPrice,
                    price: input.byCompany && input.price != null ? input.price : listPrice,
                };
                segments = [{ serviceId: service.id, staffId: null, ...span, price: appointment.price }];
            } else {
                let offset = start;
                segments = input.items.map((item, i) => {
                    const service = services[i];
                    const duration = input.byCompany && item.durationMinutes ? item.durationMinutes : Number(service.duration_minutes);
                    const price = input.byCompany && item.price != null ? item.price : Number(service.price);
                    const segment = { serviceId: service.id, staffId: item.staffId || input.staffId || null, start: offset, end: offset + duration, price };
                    offset += duration;
                    return segment;
                });
                const span = { start, end: offset };
                if (span.end > DAY_END) throw new BookingError(400, 'Randevu gün içinde bitmelidir');
                checkPublicSpan(span);

                const bookable = await getBookableStaff(client, input.companyId);
                for (const staffId of new Set(segments.map(s => s.staffId).filter((id): id is number => !!id))) {
                    const allowed = input.byCompany ? await isCompanyMember(client, input.companyId, staffId) : bookable.includes(staffId);
                    if (!allowed) throw new BookingError(400, 'Seçilen çalışan bu firmada bulunamadı');
                }
                const busy = await getStaffBusy(client, input.companyId, date);
                for (const s of segments) {
                    if (s.staffId && !isFree(s, busy.byStaff.get(s.staffId))) throw new BookingError(409, 'Seçilen çalışanın bu saatte başka randevusu var');
                }
                const unassigned = segments.filter(s => !s.staffId);
                if (unassigned.length > 0) {
                    if (bookable.length > 0) {
                        const staffId = bookable.find(id => unassigned.every(s => isFree(s, busy.byStaff.get(id))));
                        if (!staffId) throw new BookingError(409, 'Bu saatte müsait çalışan yok');
                        unassigned.forEach(s => { s.staffId = staffId; });
                    } else if (!unassigned.every(s => isFree(s, busy.unassigned))) {
                        throw new BookingError(409, 'Seçilen saat dolu');
                    }
                }
                const listPrice = roundPrice(segments.reduce((sum, s) => sum + s.price, 0));
                appointment = {
                    serviceId: segments[0].serviceId, staffId: segments[0].staffId, resourceId: null, ...span, listPrice,
                    price: input.byCompany && input.price != null ? input.price : listPrice,
                };
            }
        }

        const inserted = await client.query(
            `INSERT INTO appointments (
                company_id, customer_id, service_id, staff_id, resource_id, class_session_id, party_size, client_request_id,
                appointment_date, start_time, end_time, status, notes, price, original_price, customer_phone, customer_name, device_id
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
             RETURNING *`,
            [
                input.companyId, input.customerId || null, appointment.serviceId, appointment.staffId, appointment.resourceId,
                input.classSessionId || null, partySize, input.clientRequestId || null,
                date, toTime(appointment.start), toTime(appointment.end), input.status, input.notes || null,
                appointment.price, appointment.listPrice, customerPhone, input.customerName || null, input.deviceId || null,
            ]
        );
        const row = inserted.rows[0];
        for (const s of segments) {
            await client.query(
                `INSERT INTO appointment_services (appointment_id, service_id, price, duration_minutes, staff_id, status, start_time, end_time)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [row.id, s.serviceId, s.price, s.end - s.start, s.staffId, input.status, toTime(s.start), toTime(s.end)]
            );
        }
        return row;
    });
};
