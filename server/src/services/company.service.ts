import { db } from '../db';
import { sql } from 'drizzle-orm';
import { services } from '../db/schema';
import iyzicoService from './iyzico.service';
import smsService from './sms.service';
import { normalizePhone } from '../utils/phone';
import redis from '../config/redis';


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
    sub_merchant_key?: string | null;
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
    ai_rules?: string | null;
    ai_enabled?: boolean | null;
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
 * Not: `companies` tablosu Drizzle schema'da tanımlı olmasına rağmen, gerçek DB
 * tablosunda schema'da OLMAYAN birçok kolon var (sub_merchant_key, bank_iban,
 * tax_number, efatura_*, license_*, sms_enabled, ai_*, building_number, ...).
 *
 * Bu nedenle companies sorguları `db.execute(sql\`\`)` raw template ile yazıldı.
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
            try {
                // Self-healing ALTER + UPDATE (best-effort, ignore failures)
                await tx.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT`);
                await tx.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS district TEXT`);
                await tx.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS neighborhood TEXT`);
                await tx.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT true`);
                await tx.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_rules TEXT`);
                await tx.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS photo TEXT`);
                await tx.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS building_number TEXT`);
                await tx.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS door_number TEXT`);
                await tx.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS nace_code TEXT`);
                await tx.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS fax_number TEXT`);
                await tx.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS verification_code TEXT`);
                await tx.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_iban TEXT`);
                await tx.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true`);
                // Ensure existing companies have this enabled by default if it was null
                await tx.execute(sql`UPDATE companies SET sms_enabled = true WHERE sms_enabled IS NULL`);
                await tx.execute(sql`UPDATE companies SET ai_enabled = true WHERE ai_enabled IS NULL`);
            } catch (e) { /* ignore if fails */ }

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
                    ubl_incoming_alias, ubl_outgoing_alias, sms_enabled, ai_rules, photo,
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
                    ${company.genders || []}, ${company.company_type || 'ASIL'}, ${company.main_company_id ?? null},
                    ${company.tax_number ?? null}, ${company.tax_office ?? null},
                    ${company.qnb_username ?? null}, ${company.qnb_password ?? null}, ${company.qnb_vkn ?? null},
                    ${company.efatura_test_mode !== undefined ? company.efatura_test_mode : true}, ${company.invoice_prefix || 'GIB'},
                    ${company.ubl_incoming_alias ?? null}, ${company.ubl_outgoing_alias ?? null},
                    ${company.sms_enabled !== undefined ? company.sms_enabled : true},
                    ${company.ai_rules ?? null}, ${company.photo ?? null},
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

            // --- IYZICO SUB-MERCHANT INTEGRATION ---
            if (company.bank_iban) {
                try {
                    const existingCompanyRes = await tx.execute(sql`SELECT sub_merchant_key FROM companies WHERE id = ${id}`);
                    const existingRows = (existingCompanyRes as any).rows as any[];
                    const existingSubMerchantKey = existingRows[0]?.sub_merchant_key;

                    if (!existingSubMerchantKey) {
                        const newKey = await iyzicoService.createSubMerchant({ ...company, id });
                        if (newKey) company.sub_merchant_key = newKey;
                    } else {
                        await iyzicoService.updateSubMerchant(existingSubMerchantKey, { ...company, id });
                        company.sub_merchant_key = existingSubMerchantKey;
                    }
                } catch (err: any) {
                    console.error('[CompanyService] SubMerchant Sync Failed:', err.message);
                    // Continue gracefully — log only
                }
            }
            // ---------------------------------------

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
     * Tüm firmaları getir
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
        sort?: 'rating' | 'reviews' | 'newest';
        nocache?: boolean;
    }): Promise<Company[]> {
        // --- REDIS CACHE CHECK ---
        const cacheKey = `companies:list:${JSON.stringify(filters || {})}`;
        if (redis && !filters?.nocache) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        console.log('[Redis] Cache Hit:', cacheKey, 'Count:', parsed.length);
                        return parsed;
                    }
                }
            } catch (err) {
                console.error('[Redis] Cache Read Error:', err);
            }
        }
        console.log('[DB] Fetching from DB for:', cacheKey);
        // -------------------------

        // Dinamik WHERE clause'ları Drizzle sql template ile (parameterize + güvenli)
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

        // Üst firmaları hariç tut (sadece istendiğinde)
        if (filters?.exclude_parent) {
            whereClauses.push(sql`(c.company_type IS NULL OR c.company_type != 'ÜST FİRMA')`);
        }

        // Spatial filtering (Haversine formula)
        if (filters?.lat && filters?.lng && filters?.radius) {
            // Earth radius: 6371 km
            whereClauses.push(sql`(
                c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND
                c.latitude != 0 AND c.longitude != 0 AND
                (6371 * acos(
                    LEAST(1.0, GREATEST(-1.0,
                        cos(radians(${filters.lat})) * cos(radians(c.latitude)) *
                        cos(radians(c.longitude) - radians(${filters.lng})) +
                        sin(radians(${filters.lat})) * sin(radians(c.latitude))
                    ))
                )) <= ${filters.radius}
            )`);
        }

        // ORDER BY whitelist (sql.raw ile enjekte, sadece sabit string'ler)
        const orderByClause = filters?.sort === 'rating'
            ? sql.raw('c.rating_avg DESC, c.review_count DESC')
            : filters?.sort === 'reviews'
                ? sql.raw('c.review_count DESC, c.rating_avg DESC')
                : sql.raw('c.created_at DESC');

        const whereClause = sql.join(whereClauses, sql` AND `);
        const result = await db.execute(sql`
            SELECT
                c.*,
                (CASE WHEN c.service_count > 0 AND c.staff_count > 0 THEN 1 ELSE 0 END) as relation_count
            FROM companies c
            WHERE ${whereClause}
            ORDER BY relation_count DESC, ${orderByClause}
        `);
        const companies = (result as any).rows as Company[];

        // --- SAVE TO REDIS ---
        if (redis && companies.length > 0) {
            try {
                // Cache for 1 hour
                await redis.setex(cacheKey, 3600, JSON.stringify(companies));
            } catch (err) {
                console.error('[Redis] Cache Set Error:', err);
            }
        }
        // ---------------------

        return companies;
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

            // Hizmet Cinsiyetine Göre Şablon Hizmet Ekleme
            try {
                const genders: string[] = company.genders || [];
                const defaultServices: { name: string; duration_minutes: number; price: number }[] = [];

                if (genders.includes('Kadın')) {
                    defaultServices.push({ name: 'Kadın Saç Kesimi', duration_minutes: 45, price: 0 });
                    defaultServices.push({ name: 'Fön (Kısa)', duration_minutes: 30, price: 0 });
                    defaultServices.push({ name: 'Fön (Uzun)', duration_minutes: 45, price: 0 });
                    defaultServices.push({ name: 'Boya (Dip)', duration_minutes: 60, price: 0 });
                    defaultServices.push({ name: 'Boya (Tüm)', duration_minutes: 90, price: 0 });
                    defaultServices.push({ name: 'Manikür', duration_minutes: 30, price: 0 });
                    defaultServices.push({ name: 'Pedikür', duration_minutes: 45, price: 0 });
                    defaultServices.push({ name: 'Kaş Alımı', duration_minutes: 15, price: 0 });
                }
                if (genders.includes('Erkek')) {
                    defaultServices.push({ name: 'Erkek Saç Kesimi', duration_minutes: 30, price: 0 });
                    defaultServices.push({ name: 'Sakal Tıraşı (Modern)', duration_minutes: 20, price: 0 });
                    defaultServices.push({ name: 'Sakal Tıraşı (Klasik)', duration_minutes: 15, price: 0 });
                    defaultServices.push({ name: 'Saç & Sakal Kesimi', duration_minutes: 50, price: 0 });
                    defaultServices.push({ name: 'Yıkama & Fön', duration_minutes: 15, price: 0 });
                    defaultServices.push({ name: 'Cilt Bakımı (Express)', duration_minutes: 20, price: 0 });
                    defaultServices.push({ name: 'Ense Düzeltme', duration_minutes: 10, price: 0 });
                }
                if (genders.includes('Çocuk')) {
                    defaultServices.push({ name: 'Çocuk Saç Kesimi (Erkek)', duration_minutes: 20, price: 0 });
                    defaultServices.push({ name: 'Çocuk Saç Kesimi (Kız)', duration_minutes: 30, price: 0 });
                }
                if (genders.includes('Güzellik Merkezi')) {
                    defaultServices.push({ name: 'Lazer Epilasyon (Tüm Vücut)', duration_minutes: 90, price: 0 });
                    defaultServices.push({ name: 'Cilt Bakımı (Profesyonel)', duration_minutes: 60, price: 0 });
                    defaultServices.push({ name: 'Hydrafacial', duration_minutes: 45, price: 0 });
                    defaultServices.push({ name: 'Microblading', duration_minutes: 120, price: 0 });
                    defaultServices.push({ name: 'Dermapen', duration_minutes: 45, price: 0 });
                    defaultServices.push({ name: 'İpek Kirpik', duration_minutes: 90, price: 0 });
                    defaultServices.push({ name: 'Vücut Şekillendirme', duration_minutes: 60, price: 0 });
                }

                if (defaultServices.length > 0) {
                    // Drizzle query builder: services schema tam
                    await db.insert(services).values(
                        defaultServices.map((s) => ({
                            companyId: id,
                            name: s.name,
                            durationMinutes: s.duration_minutes,
                            price: s.price.toString(),
                        }))
                    );
                }
            } catch (err) {
                console.error(`[CompanyService] Varsayılan hizmetler eklenemedi`, err);
            }

            if (company.phone) {
                try {
                    const protocol = 'https://';
                    const baseUrl = 'www.saloncebinde.com';
                    const message = `Sayın ${company.name}, başvurunuz onaylanmıştır. Firma Yönetim Paneliniz: ${protocol}${baseUrl}/#/company-panel?key=${company.admin_key} Çalışanlarınızı Tanıtmak İçin: ${protocol}${baseUrl}/#/setup-staff/${company.id}?key=${company.admin_key}`;

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
