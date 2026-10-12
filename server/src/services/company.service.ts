import { db } from '../db';
import { sql } from 'drizzle-orm';
import { services } from '../db/schema';
import smsService from './sms.service';
import { normalizePhone } from '../utils/phone';
import redis from '../config/redis';
import { env } from '../config/env';


export interface Company {
    id?: number;
    name: string;
    description?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;

    // Adres
    address_line?: string | null;
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
    postal_code?: string | null;

    // Konum
    latitude?: number | null;
    longitude?: number | null;

    // Banka
    bank_name?: string | null;
    bank_branch?: string | null;
    iban?: string | null; // Used as fallback or old data
    bank_iban?: string | null; // matches db
    account_holder_name?: string | null;

    // Ödeme
    commission_rate?: number | null;
    payment_enabled?: boolean | null;

    // Durum
    is_active?: boolean | null;
    is_verified?: boolean | null;
    created_by?: number | null;
    board_key?: string | null;
    work_start_time?: string | null;
    work_end_time?: string | null;
    slot_interval?: number | null;
    admin_key?: string | null;
    genders?: string[] | null;
    rating_avg?: number | null;
    review_count?: number | null;
    company_type?: 'ÜST FİRMA' | 'ASIL' | 'ŞUBE' | null;
    main_company_id?: number | null;
    booking_flow?: string | null;
    staff_label?: string | null;
    service_label?: string | null;
    tax_number?: string | null;
    tax_office?: string | null;
    qnb_username?: string | null;
    qnb_password?: string | null;
    qnb_vkn?: string | null;
    efatura_test_mode?: boolean | null;
    invoice_prefix?: string | null;
    ubl_incoming_alias?: string | null;
    ubl_outgoing_alias?: string | null;
    license_end_date?: string | Date | null;
    sms_enabled?: boolean | null;
    photo?: string | null;
    building_number?: string | null;
    door_number?: string | null;
    nace_code?: string | null;
    fax_number?: string | null;
    verification_code?: string | null;
}

/**
 * Drizzle ORM'e çevrilmiş CompanyService.
 *
 * companies sorguları `db.execute(sql\`\`)` raw template ile yazıldı:
 * RETURNING * → satırlar snake_case kolon adlarıyla gelir (public API'yi korumak için).
 *
 * Sadece `services` INSERT'i Drizzle query builder ile yazıldı (schema tam).
 */
class CompanyService {
    /**
     * Yeni firma oluştur
     */
    async createCompany(company: Company, createdBy: number): Promise<Company> {
        return await db.transaction(async (tx) => {
            if (company.main_company_id) {
                const check = await tx.execute(sql`SELECT id FROM companies WHERE id = ${company.main_company_id}`);
                const checkRows = (check as any).rows as any[];
                if (checkRows.length === 0) {
                    // Try to find it in legacy table and map back to unified
                    const legacy = await tx.execute(sql`SELECT name FROM main_companies WHERE id = ${company.main_company_id}`);
                    const legacyRows = (legacy as any).rows as any[];
                    if (legacyRows.length > 0) {
                        const unified = await tx.execute(
                            sql`SELECT id FROM companies WHERE name = ${legacyRows[0].name} AND company_type = 'ÜST FİRMA'`
                        );
                        const unifiedRows = (unified as any).rows as any[];
                        if (unifiedRows.length > 0) {
                            company.main_company_id = unifiedRows[0].id;
                        }
                    }
                }
            }

            const insertResult = await tx.execute(sql`
                INSERT INTO companies (
                    name, description, phone, email, website,
                    address_line, city, district, neighborhood, postal_code,
                    latitude, longitude,
                    bank_name, bank_branch, iban, account_holder_name,
                    commission_rate, payment_enabled,
                    is_active, is_verified, created_by, board_key,
                    work_start_time, work_end_time, slot_interval, admin_key,
                    genders, company_type, main_company_id,
                    tax_number, tax_office,
                    qnb_username, qnb_password, qnb_vkn, efatura_test_mode, invoice_prefix,
                    ubl_incoming_alias, ubl_outgoing_alias, sms_enabled, photo,
                    building_number, door_number, nace_code, fax_number, booking_flow, bank_iban,
                    verification_code
                ) VALUES (
                    ${company.name}, ${company.description ?? null}, ${company.phone ?? null}, ${company.email ?? null}, ${company.website ?? null},
                    ${company.address_line ?? null}, ${company.city ?? null}, ${company.district ?? null}, ${company.neighborhood ?? null}, ${company.postal_code ?? null},
                    ${company.latitude ?? null}, ${company.longitude ?? null},
                    ${company.bank_name ?? null}, ${company.bank_branch ?? null}, ${company.iban ?? null}, ${company.account_holder_name ?? null},
                    ${company.commission_rate ?? 0}, ${company.payment_enabled ?? false},
                    ${company.is_active !== undefined ? company.is_active : false}, ${company.is_verified ?? false}, ${createdBy},
                    ${company.board_key || Math.random().toString(36).substring(2, 10).toUpperCase()},
                    ${company.work_start_time || '09:00'}, ${company.work_end_time || '19:00'}, ${company.slot_interval || 30},
                    ${company.admin_key || Math.floor(100000 + Math.random() * 900000).toString()},
                    ${sql.param(company.genders || [])}::text[], ${company.company_type || 'ASIL'}, ${company.main_company_id ?? null},
                    ${company.tax_number ?? null}, ${company.tax_office ?? null},
                    ${company.qnb_username ?? null}, ${company.qnb_password ?? null}, ${company.qnb_vkn ?? null},
                    ${company.efatura_test_mode !== undefined ? company.efatura_test_mode : true}, ${company.invoice_prefix || 'GIB'},
                    ${company.ubl_incoming_alias ?? null}, ${company.ubl_outgoing_alias ?? null},
                    ${company.sms_enabled !== undefined ? company.sms_enabled : true},
                    ${company.photo ?? null},
                    ${company.building_number ?? null}, ${company.door_number ?? null},
                    ${company.nace_code ?? null}, ${company.fax_number ?? null},
                    ${company.booking_flow || 'SPDT'}, ${company.bank_iban ?? null},
                    ${company.verification_code || Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 30)]).join('')}
                )
                RETURNING *
            `);

            const insertedRows = (insertResult as any).rows as any[];
            const newCompany: Company = insertedRows[0];

            // Transaction bittikten sonra cache temizle (dışarıda yapılacak)
            return newCompany;
        }).finally(async () => {
            // Best-effort cache clear (after commit, fire-and-forget)
            try { await this.clearCompanyCache(); } catch { /* ignore */ }
        });
    }

    /**
     * Firma güncelle
     */
    async updateCompany(id: number, company: Partial<Company>): Promise<Company | null> {
        return await db.transaction(async (tx) => {
            if (company.main_company_id) {
                const check = await tx.execute(sql`SELECT id FROM companies WHERE id = ${company.main_company_id}`);
                const checkRows = (check as any).rows as any[];
                if (checkRows.length === 0) {
                    const legacy = await tx.execute(sql`SELECT name FROM main_companies WHERE id = ${company.main_company_id}`);
                    const legacyRows = (legacy as any).rows as any[];
                    if (legacyRows.length > 0) {
                        const unified = await tx.execute(
                            sql`SELECT id FROM companies WHERE name = ${legacyRows[0].name} AND company_type = 'ÜST FİRMA'`
                        );
                        const unifiedRows = (unified as any).rows as any[];
                        if (unifiedRows.length > 0) {
                            company.main_company_id = unifiedRows[0].id;
                        }
                    }
                }
            }

            // Dinamik SET clause — Drizzle sql template + sql.raw (kolon adları whitelist'ten)
            const setClauses = Object.entries(company)
                .filter(([key, value]) => value !== undefined && key !== 'id')
                .map(([key, value]) => {
                    if (key === 'genders') {
                        return sql`${sql.raw(key)} = ${value}::text[]`;
                    }
                    return sql`${sql.raw(key)} = ${value}`;
                });

            if (setClauses.length === 0) {
                throw new Error('Güncellenecek alan bulunamadı');
            }

            const setClause = sql.join(setClauses, sql`, `);
            const fieldNames = Object.entries(company)
                .filter(([k, v]) => v !== undefined && k !== 'id')
                .map(([k]) => k);
            console.log(`[DB Update] Updating company ${id}, Fields: ${fieldNames.join(', ')}`);

            const result = await tx.execute(sql`
                UPDATE companies
                SET ${setClause}
                WHERE id = ${id}
                RETURNING *
            `);
            const resultRows = (result as any).rows as any[];
            const updated = resultRows[0] || null;

            if (updated) {
                console.log(`[DB Success] Company ${id} updated. Genders in DB:`, updated.genders);
            }

            return updated;
        }).finally(async () => {
            // Best-effort cache clear
            try { await this.clearCompanyCache(); } catch { /* ignore */ }
        });
    }

    /**
     * Firma getir
     */
    async getCompanyById(id: number): Promise<Company | null> {
        const cacheKey = `company:detail:${id}`;
        if (redis) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) return JSON.parse(cached);
            } catch (err) { }
        }

        const result = await db.execute(sql`SELECT * FROM companies WHERE id = ${id}`);
        const rows = (result as any).rows as any[];
        const company = rows[0] || null;

        if (redis && company) {
            try {
                await redis.setex(cacheKey, 3600, JSON.stringify(company)); // 1 hour cache
            } catch (err) { }
        }

        return company;
    }

    /**
     * Cache temizleme yardımcısı
     */
    private async clearCompanyCache(id?: number) {
        if (!redis) return;
        try {
            const keys = await redis.keys('companies:list:*');
            if (id) {
                keys.push(`company:detail:${id}`);
            }
            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`[Redis] Cleared ${keys.length} cache keys`);
            }
        } catch (err) {
            console.error('[Redis] Cache clear error:', err);
        }
    }

    /**
     * Firma listesi. Rezervasyon alabilen (aktif hizmeti olan) firmalar her zaman önce gelir.
     * Konum verilirse `distance_km` hesaplanır; `sort: 'distance'` en yakından sıralar.
     */
    async getAllCompanies(filters?: {
        is_active?: boolean;
        is_verified?: boolean;
        search?: string;
        lat?: number;
        lng?: number;
        radius?: number; // in km
        gender?: string;
        company_type?: string;
        exclude_parent?: boolean;
        sector?: string;
        sort?: 'rating' | 'reviews' | 'newest' | 'distance';
        page?: number;
        limit?: number;
        nocache?: boolean;
    }): Promise<{ companies: Company[]; hasMore: boolean }> {
        const page = Math.max(1, Math.floor(filters?.page || 1));
        const limit = Math.min(50, Math.max(1, Math.floor(filters?.limit || 50)));
        const hasLocation = Number.isFinite(filters?.lat) && Number.isFinite(filters?.lng);

        // Konumlu sorgular kullanıcıya özel olduğundan önbelleğe alınmaz.
        const cacheKey = `companies:list:${JSON.stringify({ ...filters, page, limit })}`;
        const useCache = !!redis && !filters?.nocache && !hasLocation;
        if (useCache) {
            try {
                const cached = await redis!.get(cacheKey);
                if (cached) return JSON.parse(cached);
            } catch (err) {
                console.error('[Redis] Cache Read Error:', err);
            }
        }

        const whereClauses: any[] = [sql`1=1`];

        if (filters?.is_active !== undefined) {
            whereClauses.push(sql`c.is_active = ${filters.is_active}`);
        }

        if (filters?.is_verified !== undefined) {
            whereClauses.push(sql`c.is_verified = ${filters.is_verified}`);
        }

        if (filters?.search) {
            const term = `%${filters.search}%`;
            whereClauses.push(sql`(c.name ILIKE ${term} OR c.email ILIKE ${term} OR c.city ILIKE ${term} OR c.district ILIKE ${term} OR c.neighborhood ILIKE ${term})`);
        }

        if (filters?.gender) {
            const term = `%${filters.gender}%`;
            whereClauses.push(sql`EXISTS (SELECT 1 FROM unnest(c.genders) g WHERE g ILIKE ${term})`);
        }

        if (filters?.company_type) {
            whereClauses.push(sql`c.company_type = ${filters.company_type}`);
        }

        if (filters?.exclude_parent) {
            whereClauses.push(sql`(c.company_type IS NULL OR c.company_type != 'ÜST FİRMA')`);
        }

        if (filters?.sector) {
            whereClauses.push(sql`EXISTS (
                SELECT 1 FROM company_sectors cs JOIN sectors sx ON sx.id = cs.sector_id
                WHERE cs.company_id = c.id AND sx.slug = ${filters.sector}
            )`);
        }

        const distanceExpr = hasLocation
            ? sql`CASE WHEN c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND c.latitude != 0 AND c.longitude != 0
                THEN 6371 * acos(LEAST(1.0, GREATEST(-1.0,
                    cos(radians(${filters!.lat})) * cos(radians(c.latitude)) * cos(radians(c.longitude) - radians(${filters!.lng})) +
                    sin(radians(${filters!.lat})) * sin(radians(c.latitude))
                ))) END`
            : sql`NULL::float8`;

        if (hasLocation && filters?.radius) {
            whereClauses.push(sql`(${distanceExpr}) <= ${filters.radius}`);
        }

        // ORDER BY whitelist (sql.raw ile enjekte, sadece sabit string'ler)
        const orderByClause = filters?.sort === 'distance' && hasLocation
            ? sql.raw('distance_km ASC NULLS LAST, c.rating_avg DESC NULLS LAST')
            : filters?.sort === 'rating'
                ? sql.raw('c.rating_avg DESC NULLS LAST, c.review_count DESC NULLS LAST')
                : filters?.sort === 'reviews'
                    ? sql.raw('c.review_count DESC NULLS LAST, c.rating_avg DESC NULLS LAST')
                    : sql.raw('c.created_at DESC');

        const whereClause = sql.join(whereClauses, sql` AND `);
        const result = await db.execute(sql`
            SELECT * FROM (
                SELECT
                    c.*,
                    EXISTS (SELECT 1 FROM services s WHERE s.company_id = c.id AND s.is_active IS NOT FALSE) AS is_bookable,
                    (${distanceExpr}) AS distance_km,
                    (
                        SELECT json_build_object('slug', sx.slug, 'name', sx.name_tr, 'icon', sx.icon, 'color', sx.color)
                        FROM company_sectors cs JOIN sectors sx ON sx.id = cs.sector_id
                        WHERE cs.company_id = c.id
                        ORDER BY cs.is_primary DESC, sx.display_order
                        LIMIT 1
                    ) AS primary_sector
                FROM companies c
                WHERE ${whereClause}
            ) c
            ORDER BY c.is_bookable DESC, ${orderByClause}, c.id
            LIMIT ${limit + 1} OFFSET ${(page - 1) * limit}
        `);
        const rows = (result as any).rows as Company[];
        const payload = { companies: rows.slice(0, limit), hasMore: rows.length > limit };

        if (useCache && payload.companies.length > 0) {
            try {
                await redis!.setex(cacheKey, 3600, JSON.stringify(payload));
            } catch (err) {
                console.error('[Redis] Cache Set Error:', err);
            }
        }

        return payload;
    }

    /**
     * Firma sil (soft delete)
     */
    async deleteCompany(id: number): Promise<boolean> {
        const result = await db.execute(
            sql`DELETE FROM companies WHERE id = ${id} RETURNING id`
        );
        const rows = (result as any).rows as any[];
        if (rows.length > 0) {
            await this.clearCompanyCache();
            return true;
        }
        return false;
    }

    /**
     * Hiç hizmeti olmayan firmaya başlangıç hizmetleri: birincil sektörün şablonları,
     * sektörü olmayan eski başvurularda cinsiyete göre kuaför listesi.
     */
    private async addDefaultServices(id: number, genders: string[]) {
        const existing = await db.execute(sql`SELECT 1 FROM services WHERE company_id = ${id} LIMIT 1`);
        if ((existing as any).rows.length > 0) return;

        const fromSector = await db.execute(sql`
            INSERT INTO services (company_id, name, duration_minutes, price, booking_mode, duration_options, is_active)
            SELECT ${id}, t.name_tr, COALESCE(t.default_duration_minutes, sx.default_duration_minutes, 60),
                   COALESCE(t.default_price, 0), t.booking_mode, t.duration_options, true
            FROM sector_service_templates t
            JOIN sectors sx ON sx.id = t.sector_id
            JOIN company_sectors cs ON cs.sector_id = t.sector_id AND cs.is_primary
            WHERE cs.company_id = ${id} AND t.is_active
            ORDER BY t.display_order, t.id
            RETURNING id
        `);
        if ((fromSector as any).rows.length > 0) return;

        const defaultServices: { name: string; duration_minutes: number }[] = [];
        if (genders.includes('Kadın')) {
            defaultServices.push(
                { name: 'Kadın Saç Kesimi', duration_minutes: 45 },
                { name: 'Fön (Kısa)', duration_minutes: 30 },
                { name: 'Fön (Uzun)', duration_minutes: 45 },
                { name: 'Boya (Dip)', duration_minutes: 60 },
                { name: 'Boya (Tüm)', duration_minutes: 90 },
                { name: 'Manikür', duration_minutes: 30 },
                { name: 'Pedikür', duration_minutes: 45 },
                { name: 'Kaş Alımı', duration_minutes: 15 },
            );
        }
        if (genders.includes('Erkek')) {
            defaultServices.push(
                { name: 'Erkek Saç Kesimi', duration_minutes: 30 },
                { name: 'Sakal Tıraşı (Modern)', duration_minutes: 20 },
                { name: 'Sakal Tıraşı (Klasik)', duration_minutes: 15 },
                { name: 'Saç & Sakal Kesimi', duration_minutes: 50 },
                { name: 'Yıkama & Fön', duration_minutes: 15 },
                { name: 'Cilt Bakımı (Express)', duration_minutes: 20 },
                { name: 'Ense Düzeltme', duration_minutes: 10 },
            );
        }
        if (genders.includes('Çocuk')) {
            defaultServices.push(
                { name: 'Çocuk Saç Kesimi (Erkek)', duration_minutes: 20 },
                { name: 'Çocuk Saç Kesimi (Kız)', duration_minutes: 30 },
            );
        }
        if (genders.includes('Güzellik Merkezi')) {
            defaultServices.push(
                { name: 'Lazer Epilasyon (Tüm Vücut)', duration_minutes: 90 },
                { name: 'Cilt Bakımı (Profesyonel)', duration_minutes: 60 },
                { name: 'Hydrafacial', duration_minutes: 45 },
                { name: 'Microblading', duration_minutes: 120 },
                { name: 'Dermapen', duration_minutes: 45 },
                { name: 'İpek Kirpik', duration_minutes: 90 },
                { name: 'Vücut Şekillendirme', duration_minutes: 60 },
            );
        }
        if (defaultServices.length === 0) return;

        await db.insert(services).values(
            defaultServices.map(s => ({ companyId: id, name: s.name, durationMinutes: s.duration_minutes, price: '0' }))
        );
    }

    /**
     * Firma onayla
     */
    async verifyCompany(id: number): Promise<Company | null> {
        // İlk onayda bugünden itibaren 90 günlük (3 ay) lisans süresi veriyoruz
        const licenseEndDate = new Date();
        licenseEndDate.setDate(licenseEndDate.getDate() + 90);

        // companies UPDATE: license_status ve license_end_date schema'da yok → raw SQL
        const result = await db.execute(sql`
            UPDATE companies
            SET is_verified = true, is_active = true, license_status = 'active', license_end_date = ${licenseEndDate}
            WHERE id = ${id}
            RETURNING *
        `);
        const rows = (result as any).rows as any[];
        const company = rows[0] || null;

        if (company) {
            await this.clearCompanyCache();

            await this.addDefaultServices(id, company.genders || []).catch(err =>
                console.error(`[CompanyService] Varsayılan hizmetler eklenemedi`, err)
            );

            if (company.phone) {
                try {
                    const message = `Sayın ${company.name}, başvurunuz onaylanmıştır. İşletme paneliniz: ${env.APP_URL}/#/isletme?code=${company.admin_key} Çalışanlarınızı eklemek için: ${env.APP_URL}/#/setup-staff/${company.id}?key=${company.admin_key}`;

                    await smsService.sendSms(null, company.phone, message);
                    console.log(`[CompanyService] Onay SMS gonderildi: ${company.phone}`);
                } catch (err) {
                    console.error(`[CompanyService] Onay SMS gonderilemedi: ${company.phone}`, err);
                }
            }
        }

        return company;
    }

    /**
     * SMS ile gelen kod üzerinden firma onayla
     */
    async verifyBySmsCode(message: string, phone: string): Promise<Company | null> {
        if (!message || !phone) {
            console.log('[SMS-CB] [ERROR] Mesaj veya Tel bos gonderildi');
            return null;
        }

        console.log(`[SMS-CB] [START] Mesaj: "${message}", Tel: "${phone}"`);

        // Kod ayıklama (5-6 karakterli alphanumeric)
        let cleanCode = message.trim().toUpperCase();
        const codeMatches = message.match(/([A-Z0-9]{5,6})/gi);

        if (codeMatches && codeMatches.length > 0) {
            const bestMatch = codeMatches.find(c => /[A-Z]/i.test(c)) || codeMatches[0];
            cleanCode = bestMatch.toUpperCase();
            console.log(`[SMS-CB] [REGEX] Kodlar bulundu: ${codeMatches.join(', ')}. Secilen: ${cleanCode}`);
        }

        // Telefon normalizasyonu (Son 10 hane her zaman en güvenilir olanıdır)
        const cleanPhone = normalizePhone(phone);

        console.log(`[SMS-CB] [PROC] CleanedCode: ${cleanCode}, CleanedPhone: ${cleanPhone}`);

        if (!cleanCode || cleanCode.length < 3) {
            console.log(`[SMS-CB] [FAIL] Kod cok kisa veya gecersiz: "${cleanCode}"`);
            return null;
        }

        // Veritabanında ara — karmaşık sorgu (REGEXP_REPLACE, unnest) → raw SQL
        const findRes = await db.execute(sql`
            SELECT id, name, phone, verification_code
            FROM companies
            WHERE (UPPER(verification_code) = ${cleanCode} OR UPPER(verification_code) = ${cleanCode.substring(0, 5)} OR UPPER(admin_key) = ${cleanCode})
              AND (
                REGEXP_REPLACE(phone, '\\D', '', 'g') LIKE ${'%' + cleanPhone}
                OR RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = ${cleanPhone}
                OR phone IS NULL OR phone = ''
              )
              AND is_verified = false
            ORDER BY created_at DESC
            LIMIT 1
        `);
        const findRows = (findRes as any).rows as any[];

        if (findRows.length === 0) {
            console.log(`[SMS-CB] [FAIL] Eslesme bulunamadi. Aranan: Code="${cleanCode}", PhoneEndsWith="${cleanPhone}"`);

            const pending = await db.execute(
                sql`SELECT name, phone, verification_code, created_at FROM companies WHERE is_verified = false ORDER BY created_at DESC LIMIT 3`
            );
            console.log('[SMS-CB] [DEBUG] Veritabaninda Onay Bekleyen Kayitlar:', JSON.stringify((pending as any).rows, null, 2));
            return null;
        }

        const matchedCompany = findRows[0];
        console.log(`[SMS-CB] [SUCCESS] Bulundu: "${matchedCompany.name}" (ID: ${matchedCompany.id}). Onay sureci baslatiliyor...`);

        try {
            return await this.verifyCompany(matchedCompany.id);
        } catch (err: any) {
            console.error(`[SMS-CB] [ERROR] verifyCompany(id=${matchedCompany.id}) HATA:`, err.message);
            return null;
        }
    }

    /**
     * Re-calculate and sync denormalized stats for a company
     */
    async syncCompanyStats(id: number) {
        try {
            // Subquery'li UPDATE — raw SQL
            await db.execute(sql`
                UPDATE companies c SET
                    rating_avg = COALESCE((SELECT AVG(rating) FROM appointments WHERE company_id = ${id} AND rating IS NOT NULL), 0),
                    review_count = COALESCE((SELECT COUNT(rating) FROM appointments WHERE company_id = ${id} AND rating IS NOT NULL), 0),
                    staff_count = COALESCE((SELECT COUNT(*) FROM users WHERE company_id = ${id} AND is_active = true), 0),
                    service_count = COALESCE((SELECT COUNT(*) FROM services WHERE company_id = ${id} AND is_active = true), 0)
                WHERE id = ${id};
            `);
            await this.clearCompanyCache(id);
        } catch (e) {
            console.error('[SyncStats] Failed:', e);
        }
    }
}

export default new CompanyService();

/**
 * Herkese açık uçlarda dönülebilecek firma alanları. Anahtarlar (admin/board), e-fatura giriş bilgileri,
 * banka/vergi bilgileri ve doğrulama kodu burada OLMAMALI; yeni alan eklerken bunu kontrol edin.
 */
const PUBLIC_COMPANY_FIELDS = [
    'id', 'name', 'description', 'phone', 'email', 'website', 'photo',
    'address_line', 'address_line2', 'city', 'district', 'neighborhood', 'postal_code',
    'province_name', 'district_name', 'neighborhood_name', 'latitude', 'longitude',
    'work_start_time', 'work_end_time', 'slot_interval', 'genders', 'booking_flow',
    'staff_label', 'service_label', 'rating_avg', 'review_count', 'is_active', 'is_verified',
    'service_count', 'staff_count', 'license_end_date', 'is_bookable', 'distance_km', 'primary_sector', 'sectors',
] as const;

export const isLicenseExpired = (company: { license_end_date?: string | Date | null }) =>
    !!company.license_end_date && new Date(company.license_end_date) < new Date();

export const toPublicCompany = (company: Record<string, any>) => {
    const out: Record<string, unknown> = {};
    for (const key of PUBLIC_COMPANY_FIELDS) {
        if (key in company) out[key] = company[key];
    }
    out.is_license_expired = isLicenseExpired(company);
    return out;
};
