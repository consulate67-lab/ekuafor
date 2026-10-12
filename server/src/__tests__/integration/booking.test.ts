import type { AddressInfo } from 'net';
import request from 'supertest';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

/**
 * Rezervasyon modeli uçtan uca: gerçek migration'lar bellek içi Postgres'e (PGlite) uygulanır,
 * booking.service bu veritabanına `pg` ile bağlanır.
 */

type BookingModule = typeof import('../../services/booking.service');

let pglite: PGlite;
let socketServer: PGLiteSocketServer;
let booking: BookingModule;
let pool: import('pg').Pool;
let app: import('express').Express;

const ids = {} as Record<
    'salon' | 'pitchCo' | 'studio' | 'ayse' | 'mehmet' | 'haircut' | 'coloring' | 'pitchRental' | 'pitch1' | 'pitch2' | 'reformer' | 'instructor',
    number
>;

const day = (offset: number) => {
    const d = new Date(`${booking.nowInIstanbul().date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
};

const insertId = async (sql: string, params: unknown[]) => Number((await pool.query(sql, params)).rows[0].id);

const company = (name: string) =>
    insertId(
        `INSERT INTO companies (name, work_start_time, work_end_time, slot_interval) VALUES ($1, '09:00', '22:00', 30) RETURNING id`,
        [name]
    );

const staff = (companyId: number, firstName: string) =>
    insertId(
        `INSERT INTO users (email, password, first_name, last_name, role, company_id, is_active)
         VALUES ($1, 'x', $2, 'Test', 'staff', $3, true) RETURNING id`,
        [`${firstName.toLowerCase()}-${companyId}@test.local`, firstName, companyId]
    );

const service = (companyId: number, name: string, duration: number, price: number, mode = 'staff', options: number[] | null = null) =>
    insertId(
        `INSERT INTO services (company_id, name, duration_minutes, price, booking_mode, duration_options, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
        [companyId, name, duration, price, mode, options]
    );

const expectBookingError = async (promise: Promise<unknown>, status: number) => {
    await expect(promise).rejects.toMatchObject({ status });
};

beforeAll(async () => {
    pglite = await PGlite.create({ extensions: { pg_trgm } });
    socketServer = new PGLiteSocketServer({ db: pglite, port: 0, maxConnections: 50 });
    await socketServer.start();
    const { port } = (socketServer as unknown as { server: { address(): AddressInfo } }).server.address();
    process.env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;

    const { runMigrations } = await import('../../db/migrator');
    await runMigrations();
    booking = await import('../../services/booking.service');
    pool = (await import('../../config/database')).default;
    app = (await import('../../app')).createApp();

    ids.salon = await company('Kuaför Test');
    ids.ayse = await staff(ids.salon, 'Ayse');
    ids.mehmet = await staff(ids.salon, 'Mehmet');
    ids.haircut = await service(ids.salon, 'Saç Kesim', 30, 300);
    ids.coloring = await service(ids.salon, 'Boya', 60, 900);

    ids.pitchCo = await company('Halı Saha Test');
    ids.pitchRental = await service(ids.pitchCo, 'Saha Kiralama', 60, 1200, 'resource', [60, 90, 120]);
    ids.pitch1 = await insertId(`INSERT INTO resources (company_id, name, resource_type) VALUES ($1, 'Saha 1', 'pitch') RETURNING id`, [ids.pitchCo]);
    ids.pitch2 = await insertId(`INSERT INTO resources (company_id, name, resource_type) VALUES ($1, 'Saha 2', 'pitch') RETURNING id`, [ids.pitchCo]);

    ids.studio = await company('Pilates Test');
    ids.instructor = await staff(ids.studio, 'Zeynep');
    ids.reformer = await service(ids.studio, 'Reformer Grup', 50, 500, 'class');
}, 180000);

afterAll(async () => {
    await pool?.end();
    await socketServer?.stop();
    await pglite?.close();
});

describe('staff modu (kuaför)', () => {
    it('müsaitlikte iki çalışan da görünür, randevu sonrası dolu çalışan düşer', async () => {
        const date = day(3);
        const before = await booking.getAvailability({ companyId: ids.salon, serviceIds: [ids.haircut], date });
        const slot = before.slots.find(s => s.time === '10:00')!;
        expect(slot.staff_ids).toEqual([ids.ayse, ids.mehmet]);

        await booking.createBooking({
            companyId: ids.salon, items: [{ serviceId: ids.haircut, staffId: ids.ayse }], date, startTime: '10:00',
            status: 'pending', customerName: 'Müşteri', customerPhone: '0555 111 22 33', byCompany: false,
        });

        const after = await booking.getAvailability({ companyId: ids.salon, serviceIds: [ids.haircut], date });
        expect(after.slots.find(s => s.time === '10:00')!.staff_ids).toEqual([ids.mehmet]);
    });

    it('aynı çalışanın aynı saati ikinci kez satılamaz', async () => {
        const date = day(4);
        const input = {
            companyId: ids.salon, items: [{ serviceId: ids.haircut, staffId: ids.mehmet }], date, startTime: '11:00',
            status: 'pending', byCompany: false,
        };
        await booking.createBooking(input);
        await expectBookingError(booking.createBooking({ ...input, startTime: '11:15' }), 409);
    });

    it('çalışan seçilmezse boş çalışana atanır; herkes doluysa reddedilir', async () => {
        const date = day(5);
        const input = { companyId: ids.salon, items: [{ serviceId: ids.coloring }], date, startTime: '14:00', status: 'pending', byCompany: false };
        const first = await booking.createBooking(input);
        const second = await booking.createBooking(input);
        expect(new Set([first.staff_id, second.staff_id])).toEqual(new Set([ids.ayse, ids.mehmet]));
        await expectBookingError(booking.createBooking(input), 409);
    });

    it('çoklu hizmet ardışık bölümlere ayrılır ve fiyat sunucuda hesaplanır', async () => {
        const date = day(6);
        const row = await booking.createBooking({
            companyId: ids.salon, items: [{ serviceId: ids.haircut, price: 1 }, { serviceId: ids.coloring }], date, startTime: '09:00',
            price: 1, status: 'pending', byCompany: false,
        });
        expect(Number(row.price)).toBe(1200);
        expect(String(row.end_time).slice(0, 5)).toBe('10:30');
        const parts = await pool.query('SELECT start_time, end_time FROM appointment_services WHERE appointment_id = $1 ORDER BY id', [row.id]);
        expect(parts.rows.map(r => `${r.start_time}-${r.end_time}`)).toEqual(['09:00-09:30', '09:30-10:30']);
    });

    it('aynı istek kimliği tekrar gönderilirse yeni randevu açılmaz', async () => {
        const date = day(7);
        const input = {
            companyId: ids.salon, items: [{ serviceId: ids.haircut }], date, startTime: '15:00',
            status: 'pending', byCompany: false, clientRequestId: 'req-1',
        };
        const first = await booking.createBooking(input);
        const retry = await booking.createBooking(input);
        expect(retry.id).toBe(first.id);
    });

    it('müşteri geçmişe ve çalışma saati dışına randevu alamaz', async () => {
        const base = { companyId: ids.salon, items: [{ serviceId: ids.haircut }], status: 'pending', byCompany: false };
        await expectBookingError(booking.createBooking({ ...base, date: day(-1), startTime: '10:00' }), 409);
        await expectBookingError(booking.createBooking({ ...base, date: day(3), startTime: '21:45' }), 409);
    });

    // PGlite işlemleri sırayla yürütür; advisory lock'un gerçek yarış durumundaki etkisi burada ölçülemez.
    it('paralel gönderilen istekler aynı slotu ikinci kez satamaz', async () => {
        const date = day(8);
        const attempts = await Promise.allSettled(
            Array.from({ length: 4 }, () => booking.createBooking({
                companyId: ids.salon, items: [{ serviceId: ids.coloring, staffId: ids.ayse }], date, startTime: '16:00',
                status: 'pending', byCompany: false,
            }))
        );
        expect(attempts.filter(a => a.status === 'fulfilled')).toHaveLength(1);
    });
});

describe('resource modu (halı saha)', () => {
    it('süre seçenekleri dışındaki süre reddedilir', async () => {
        await expectBookingError(
            booking.getAvailability({ companyId: ids.pitchCo, serviceIds: [ids.pitchRental], date: day(3), durationMinutes: 45 }),
            400
        );
    });

    it('90 dk rezervasyon boş sahaya düşer, fiyat süreyle orantılıdır; iki saha dolunca slot kapanır', async () => {
        const date = day(3);
        const input = {
            companyId: ids.pitchCo, items: [{ serviceId: ids.pitchRental }], date, startTime: '20:00', durationMinutes: 90,
            status: 'pending', byCompany: false,
        };
        const first = await booking.createBooking(input);
        expect(Number(first.price)).toBe(1800);
        expect(String(first.end_time).slice(0, 5)).toBe('21:30');
        const second = await booking.createBooking(input);
        expect(new Set([first.resource_id, second.resource_id])).toEqual(new Set([ids.pitch1, ids.pitch2]));
        await expectBookingError(booking.createBooking({ ...input, startTime: '21:00', durationMinutes: 60 }), 409);

        const availability = await booking.getAvailability({
            companyId: ids.pitchCo, serviceIds: [ids.pitchRental], date, durationMinutes: 60,
        });
        expect(availability.slots.find(s => s.time === '19:00')!.resource_ids).toEqual([ids.pitch1, ids.pitch2]);
        expect(availability.slots.find(s => s.time === '20:30')!.available).toBe(false);
    });

    it('iptal edilen rezervasyon sahayı boşaltır', async () => {
        const date = day(4);
        const input = {
            companyId: ids.pitchCo, items: [{ serviceId: ids.pitchRental }], date, startTime: '18:00', resourceId: ids.pitch1,
            status: 'pending', byCompany: false,
        };
        const row = await booking.createBooking(input);
        await expectBookingError(booking.createBooking(input), 409);
        await pool.query(`UPDATE appointments SET status = 'cancelled' WHERE id = $1`, [row.id]);
        await expect(booking.createBooking(input)).resolves.toMatchObject({ resource_id: ids.pitch1 });
    });
});

describe('HTTP API', () => {
    it('personel listesi tek biçimde döner ve iletişim bilgisi içermez', async () => {
        const res = await request(app).get(`/api/companies/${ids.salon}/employees`).expect(200);
        expect(res.body.data.map((e: any) => e.id)).toEqual([ids.ayse, ids.mehmet]);
        expect(res.body.data[0]).toMatchObject({ id: ids.ayse, user_id: ids.ayse, first_name: 'Ayse', last_name: 'Test' });
        expect(res.body.data[0]).not.toHaveProperty('email');
        expect(res.body.data[0]).not.toHaveProperty('phone');
    });

    it('anonim kullanıcı firmanın randevu listesini göremez', async () => {
        await request(app).get('/api/appointments').query({ company_id: ids.salon }).expect(403);
    });

    it('public rezervasyon: durum ve fiyat istemciden alınmaz, aynı slot ikinci kez 409 döner', async () => {
        const date = day(9);
        const availability = await request(app).get('/api/availability')
            .query({ company_id: ids.salon, service_ids: `${ids.haircut}`, date }).expect(200);
        expect(availability.body.data.slots.find((s: any) => s.time === '12:00').available).toBe(true);

        const body = {
            company_id: ids.salon, services: [{ service_id: ids.haircut, staff_id: ids.ayse }], staff_id: ids.ayse,
            appointment_date: date, start_time: '12:00', price: 1, status: 'approved',
            customer_name: 'Web Müşteri', customer_phone: '5551112233', device_id: 'dev-1', client_request_id: 'http-1',
        };
        const created = await request(app).post('/api/appointments').send(body).expect(201);
        expect(created.body.data).toMatchObject({ status: 'pending', staff_id: ids.ayse });
        expect(Number(created.body.data.price)).toBe(300);

        const retry = await request(app).post('/api/appointments').send(body).expect(201);
        expect(retry.body.data.id).toBe(created.body.data.id);
        await request(app).post('/api/appointments').send({ ...body, client_request_id: 'http-2' }).expect(409);
    });

    it('puanlama: sadece randevu sahibi, sadece tamamlanan randevu', async () => {
        const date = day(9);
        const created = await request(app).post('/api/appointments').send({
            company_id: ids.salon, services: [{ service_id: ids.haircut }], appointment_date: date, start_time: '13:00',
            customer_phone: '0555 999 88 77', device_id: 'dev-rate',
        }).expect(201);
        const id = created.body.data.id;

        await request(app).patch(`/api/appointments/${id}/rate`).send({ rating: 5, device_id: 'dev-rate' }).expect(409);
        await pool.query(`UPDATE appointments SET status = 'completed' WHERE id = $1`, [id]);
        await request(app).patch(`/api/appointments/${id}/rate`).send({ rating: 5, device_id: 'baska-cihaz' }).expect(403);
        await request(app).patch(`/api/appointments/${id}/rate`).send({ rating: 4, customer_phone: '5559998877' }).expect(200);
        const row = await pool.query('SELECT rating FROM appointments WHERE id = $1', [id]);
        expect(row.rows[0].rating).toBe(4);
    });

    it('sektör şablonları kataloğu migration ile gelir', async () => {
        const res = await request(app).get('/api/sectors/templates').expect(200);
        expect(res.body.data).toHaveLength(79);
        const pitch = res.body.data.find((t: any) => t.booking_mode === 'resource' && t.sector_slug === 'sports_facility');
        expect(pitch.duration_options).toEqual([60, 90, 120]);
    });
});

describe('firma verisi gizliliği', () => {
    const SECRET_FIELDS = ['admin_key', 'board_key', 'qnb_username', 'qnb_password', 'verification_code', 'bank_iban', 'tax_number'];
    const expectNoSecrets = (company: Record<string, unknown>) => {
        for (const field of SECRET_FIELDS) expect(company).not.toHaveProperty(field);
    };
    const tokenFor = async (payload: Record<string, unknown>) => {
        const { env } = await import('../../config/env');
        return (await import('jsonwebtoken')).default.sign(payload, env.JWT_SECRET);
    };

    beforeAll(async () => {
        await pool.query(
            `UPDATE companies SET admin_key = 'ADM-GIZLI', board_key = 'BRD-GIZLI', qnb_username = 'u', qnb_password = 'p', tax_number = '1234567890'
             WHERE id = $1`,
            [ids.salon]
        );
    });

    it('herkese açık liste ve detay gizli alan içermez', async () => {
        const list = await request(app).get('/api/companies').expect(200);
        const salon = list.body.data.find((c: any) => c.id === ids.salon);
        expect(salon).toMatchObject({ name: 'Kuaför Test', slot_interval: 30 });
        list.body.data.forEach(expectNoSecrets);

        const detail = await request(app).get(`/api/companies/${ids.salon}`).expect(200);
        expect(detail.body.data).toMatchObject({ id: ids.salon, name: 'Kuaför Test' });
        expectNoSecrets(detail.body.data);
    });

    it('board anahtarı ve personel girişi firmanın anahtarlarını döndürmez', async () => {
        const board = await request(app).post('/api/companies/board-login').send({ board_key: 'brd-gizli' }).expect(200);
        expect(board.body.data).toMatchObject({ id: ids.salon, is_license_expired: false });
        expectNoSecrets(board.body.data);
        await request(app).post('/api/companies/board-login').send({ key: 'BRD-GIZLI' }).expect(200);
        await request(app).post('/api/companies/board-login').send({ board_key: 'YANLIS' }).expect(401);

        await pool.query(`UPDATE users SET board_code = 'PRS-AYSE' WHERE id = $1`, [ids.ayse]);
        const staffLogin = await request(app).post('/api/companies/staff-login').send({ board_code: 'PRS-AYSE' }).expect(200);
        expectNoSecrets(staffLogin.body.data.company);
    });

    it('detayın tamamını sadece süper admin ve firmanın kendi admini görür', async () => {
        const superAdmin = await tokenFor({ userId: 1, role: 'super_admin' });
        const full = await request(app).get(`/api/companies/${ids.salon}`).set('Authorization', `Bearer ${superAdmin}`).expect(200);
        expect(full.body.data.admin_key).toBe('ADM-GIZLI');

        const ownAdmin = await tokenFor({ userId: 1, role: 'company_admin', companyId: ids.salon });
        const own = await request(app).get(`/api/companies/${ids.salon}`).set('Authorization', `Bearer ${ownAdmin}`).expect(200);
        expect(own.body.data.board_key).toBe('BRD-GIZLI');

        const otherAdmin = await tokenFor({ userId: 1, role: 'company_admin', companyId: ids.pitchCo });
        const other = await request(app).get(`/api/companies/${ids.salon}`).set('Authorization', `Bearer ${otherAdmin}`).expect(200);
        expectNoSecrets(other.body.data);

        const staffToken = await tokenFor({ userId: ids.ayse, role: 'staff', companyId: ids.salon });
        const asStaff = await request(app).get(`/api/companies/${ids.salon}`).set('Authorization', `Bearer ${staffToken}`).expect(200);
        expectNoSecrets(asStaff.body.data);
    });
});

describe('class modu (pilates)', () => {
    it('8 kişilik seans dolana kadar kayıt alır, sonra reddeder', async () => {
        const { ids: sessionIds } = await booking.createClassSessions({
            companyId: ids.studio, serviceId: ids.reformer, staffId: ids.instructor, date: day(3), startTime: '10:00', capacity: 8,
        });
        const classSessionId = sessionIds[0];
        const join = (partySize: number) => booking.createBooking({
            companyId: ids.studio, items: [], classSessionId, partySize, status: 'pending', byCompany: false,
        });

        const pair = await join(2);
        expect(Number(pair.price)).toBe(1000);
        for (let i = 0; i < 5; i++) await join(1);
        await expectBookingError(join(2), 409);
        await join(1);
        await expectBookingError(join(1), 409);

        const [session] = await booking.listClassSessions({ companyId: ids.studio, from: day(3), to: day(3) });
        expect(session).toMatchObject({ booked: 8, remaining: 0 });
        await expectBookingError(booking.updateClassSessionCapacity(ids.studio, classSessionId, 6), 409);
    });

    it('haftalık tekrar seri oluşturur; eğitmenin dolu saatine seans açılamaz', async () => {
        const series = await booking.createClassSessions({
            companyId: ids.studio, serviceId: ids.reformer, staffId: ids.instructor, date: day(10), startTime: '18:00', capacity: 6, repeatWeeks: 3,
        });
        expect(series.ids).toHaveLength(4);
        expect(series.series_id).toBeTruthy();
        await expectBookingError(
            booking.createClassSessions({
                companyId: ids.studio, serviceId: ids.reformer, staffId: ids.instructor, date: day(17), startTime: '18:30', capacity: 6,
            }),
            409
        );

        const cancelled = await booking.cancelClassSessions(ids.studio, series.ids[1], 'following');
        expect(cancelled.session_ids).toHaveLength(3);
        const remaining = await booking.listClassSessions({ companyId: ids.studio, from: day(10), to: day(40) });
        expect(remaining.filter(s => s.series_id === series.series_id)).toHaveLength(1);
    });

    it('grup dersi hizmeti seans seçmeden rezerve edilemez', async () => {
        await expectBookingError(
            booking.createBooking({
                companyId: ids.studio, items: [{ serviceId: ids.reformer }], date: day(3), startTime: '12:00', status: 'pending', byCompany: false,
            }),
            400
        );
    });
});
