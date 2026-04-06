import pool from '../config/database';
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

class CompanyService {
    /**
     * Yeni firma oluştur
     */
    async createCompany(company: Company, createdBy: number): Promise<Company> {
        const client = await pool.connect();

        try {
            try {
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT');
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS district TEXT');
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS neighborhood TEXT');
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT true');
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_rules TEXT');
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS photo TEXT');
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS building_number TEXT');
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS door_number TEXT');
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS nace_code TEXT');
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS fax_number TEXT');
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS verification_code TEXT');
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_iban TEXT');
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true');
                // Ensure existing companies have this enabled by default if it was null
                await client.query('UPDATE companies SET sms_enabled = true WHERE sms_enabled IS NULL');
                await client.query('UPDATE companies SET ai_enabled = true WHERE ai_enabled IS NULL');
            } catch (e) { /* ignore if fails */ }

            if (company.main_company_id) {
                const check = await client.query('SELECT id FROM companies WHERE id = $1', [company.main_company_id]);
                if ((check.rowCount || 0) === 0) {
                    // Try to find it in legacy table and map back to unified
                    const legacy = await client.query('SELECT name FROM main_companies WHERE id = $1', [company.main_company_id]);
                    if ((legacy.rowCount || 0) > 0) {
                        const unified = await client.query('SELECT id FROM companies WHERE name = $1 AND company_type = \'ÜST FİRMA\'', [legacy.rows[0].name]);
                        if ((unified.rowCount || 0) > 0) {
                            company.main_company_id = unified.rows[0].id;
                        }
                    }
                }
            }

            const values = [
                company.name,
                company.description,
                company.phone,
                company.email,
                company.website,
                company.address_line,
                company.city,
                company.district,
                company.neighborhood,
                company.postal_code,
                company.latitude,
                company.longitude,
                company.bank_name,
                company.bank_branch,
                company.iban,
                company.account_holder_name,
                company.commission_rate || 0,
                company.payment_enabled || false,
                company.is_active !== undefined ? company.is_active : false,
                company.is_verified || false,
                createdBy,
                company.board_key || Math.random().toString(36).substring(2, 10).toUpperCase(),
                company.work_start_time || '09:00',
                company.work_end_time || '19:00',
                company.slot_interval || 30,
                company.admin_key || Math.floor(100000 + Math.random() * 900000).toString(),
                company.genders || [],
                company.company_type || 'ASIL',
                company.main_company_id || null,
                company.tax_number || null,
                company.tax_office || null,
                company.qnb_username || null,
                company.qnb_password || null,
                company.qnb_vkn || null,
                company.efatura_test_mode !== undefined ? company.efatura_test_mode : true,
                company.invoice_prefix || 'GIB',
                company.ubl_incoming_alias || null,
                company.ubl_outgoing_alias || null,
                company.sms_enabled !== undefined ? company.sms_enabled : true,
                company.ai_rules || null,
                company.photo || null,
                company.building_number || null,
                company.door_number || null,
                company.nace_code || null,
                company.fax_number || null,
                company.booking_flow || 'SPDT',
                company.bank_iban || null,
                company.verification_code || Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 30)]).join('')
            ];

            const result = await client.query(`
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
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48)
                RETURNING *
            `, values);

            await this.clearCompanyCache();
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Firma güncelle
     */
    async updateCompany(id: number, company: Partial<Company>): Promise<Company | null> {
        const client = await pool.connect();

        try {
            // Self-healing for updates too
            if (company.main_company_id) {
                const check = await client.query('SELECT id FROM companies WHERE id = $1', [company.main_company_id]);
                if ((check.rowCount || 0) === 0) {
                    const legacy = await client.query('SELECT name FROM main_companies WHERE id = $1', [company.main_company_id]);
                    if ((legacy.rowCount || 0) > 0) {
                        const unified = await client.query('SELECT id FROM companies WHERE name = $1 AND company_type = \'ÜST FİRMA\'', [legacy.rows[0].name]);
                        if ((unified.rowCount || 0) > 0) {
                            company.main_company_id = unified.rows[0].id;
                        }
                    }
                }
            }

            const fields: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            // --- IYZICO SUB-MERCHANT INTEGRATION ---
            // If the firm provides an IBAN and Name, let's create or update their sub-merchant key
            // This allows splitting the checkout natively directly to their account
            if (company.bank_iban) {
                try {
                    const existingCompanyRes = await client.query('SELECT sub_merchant_key FROM companies WHERE id = $1', [id]);
                    const existingSubMerchantKey = existingCompanyRes.rows[0]?.sub_merchant_key;

                    if (!existingSubMerchantKey) {
                        const newKey = await iyzicoService.createSubMerchant({ ...company, id });
                        if (newKey) company.sub_merchant_key = newKey;
                    } else {
                        await iyzicoService.updateSubMerchant(existingSubMerchantKey, { ...company, id });
                        company.sub_merchant_key = existingSubMerchantKey;
                    }
                } catch (err: any) {
                    console.error('[CompanyService] SubMerchant Sync Failed:', err.message);
                    // Decide if we throw or just continue gracefully:
                    // Usually you don't want to block them from saving just because iyzico sandbox is down,
                    // but they should know. For now, we continue but log error.
                }
            }
            // ---------------------------------------

            // Dinamik olarak güncelleme alanlarını oluştur
            Object.entries(company).forEach(([key, value]) => {
                if (value !== undefined && key !== 'id') {
                    if (key === 'genders') {
                        fields.push(`${key} = $${paramIndex}::text[]`);
                    } else {
                        fields.push(`${key} = $${paramIndex}`);
                    }
                    values.push(value);
                    paramIndex++;
                }
            });

            if (fields.length === 0) {
                throw new Error('Güncellenecek alan bulunamadı');
            }

            values.push(id);
            const query = `
        UPDATE companies 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

            console.log(`[DB Update] Updating company ${id}, Fields: ${fields.join(', ')}`);
            const result = await client.query(query, values);

            if (result.rows[0]) {
                console.log(`[DB Success] Company ${id} updated. Genders in DB:`, result.rows[0].genders);
                await this.clearCompanyCache();
            }

            return result.rows[0] || null;
        } finally {
            client.release();
        }
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

        const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
        const company = result.rows[0] || null;
        
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
    }): Promise<Company[]> {
        // --- REDIS CACHE CHECK ---
        const cacheKey = `companies:list:${JSON.stringify(filters || {})}`;
        if (redis) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        console.log('[Redis] Cache Hit:', cacheKey);
                        return parsed;
                    }
                }
            } catch (err) {
                console.error('[Redis] Cache Read Error:', err);
            }
        }
        // -------------------------

        const values: any[] = [];
        let paramIndex = 1;

        let whereClauses = ['1=1'];

        // Resilient check for rating column support
        const hasRatingColumn = true; // Assumed supported as per main schema.

        if (filters?.is_active !== undefined) {
            whereClauses.push(`c.is_active = $${paramIndex}`);
            values.push(filters.is_active);
            paramIndex++;
        }

        if (filters?.is_verified !== undefined) {
            whereClauses.push(`c.is_verified = $${paramIndex}`);
            values.push(filters.is_verified);
            paramIndex++;
        }

        if (filters?.search) {
            whereClauses.push(`(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.city ILIKE $${paramIndex} OR c.district ILIKE $${paramIndex} OR c.neighborhood ILIKE $${paramIndex})`);
            values.push(`%${filters.search}%`);
            paramIndex++;
        }

        if (filters?.gender) {
            whereClauses.push(`EXISTS (SELECT 1 FROM unnest(c.genders) g WHERE g ILIKE $${paramIndex})`);
            values.push(`%${filters.gender}%`);
            paramIndex++;
        }

        if (filters?.company_type) {
            whereClauses.push(`c.company_type = $${paramIndex}`);
            values.push(filters.company_type);
            paramIndex++;
        }

        // Üst firmaları hariç tut (sadece istendiğinde)
        if (filters?.exclude_parent) {
            whereClauses.push(`(c.company_type IS NULL OR c.company_type != 'ÜST FİRMA')`);
        }

        // Spatial filtering (Haversine formula)
        if (filters?.lat && filters?.lng && filters?.radius) {
            // Earth radius: 6371 km
            whereClauses.push(`(
                c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND 
                c.latitude != 0 AND c.longitude != 0 AND
                (6371 * acos(
                    LEAST(1.0, GREATEST(-1.0, 
                        cos(radians($${paramIndex})) * cos(radians(c.latitude)) * 
                        cos(radians(c.longitude) - radians($${paramIndex + 1})) + 
                        sin(radians($${paramIndex})) * sin(radians(c.latitude))
                    ))
                )) <= $${paramIndex + 2}
            )`);
            values.push(filters.lat, filters.lng, filters.radius);
            paramIndex += 3;
        }

        // Optimized calculation using denormalized columns
        const query = `
            SELECT 
                c.*,
                (CASE WHEN c.service_count > 0 AND c.staff_count > 0 THEN 1 ELSE 0 END) as relation_count
            FROM companies c
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY relation_count DESC, 
            ${filters?.sort === 'rating' ? 'c.rating_avg DESC, c.review_count DESC' :
                (filters?.sort === 'reviews' ? 'c.review_count DESC, c.rating_avg DESC' : 'c.created_at DESC')}
        `;

        const result = await pool.query(query, values);
        const companies = result.rows;

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
        const result = await pool.query(
            'DELETE FROM companies WHERE id = $1 RETURNING id',
            [id]
        );
        if (result.rowCount) {
            await this.clearCompanyCache();
        }
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Firma onayla
     */
    async verifyCompany(id: number): Promise<Company | null> {
        // İlk onayda bugünden itibaren 90 günlük (3 ay) lisans süresi veriyoruz
        const licenseEndDate = new Date();
        licenseEndDate.setDate(licenseEndDate.getDate() + 90);

        const result = await pool.query(
            'UPDATE companies SET is_verified = true, is_active = true, license_status = \'active\', license_end_date = $1 WHERE id = $2 RETURNING *',
            [licenseEndDate, id]
        );
        const company = result.rows[0] || null;

        if (company) {
            await this.clearCompanyCache();
            // Hizmet Cinsiyetine Göre Şablon Hizmet Ekleme
            try {
                const genders = company.genders || [];
                const defaultServices: any[] = [];

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
                    for (const s of defaultServices) {
                        await pool.query(
                            'INSERT INTO services (company_id, name, duration_minutes, price) VALUES ($1, $2, $3, $4)',
                            [id, s.name, s.duration_minutes, s.price]
                        );
                    }
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
        // Eğer mesaj sadece kod ise direkt al, yoksa içinden ara
        let cleanCode = message.trim().toUpperCase();
        const codeMatches = message.match(/([A-Z0-9]{5,6})/gi);
        
        if (codeMatches && codeMatches.length > 0) {
            // Eğer birden fazla 5-6 haneli grup varsa (örn tel no parçası ve kod)
            // İçinde harf olanı tercih et (çünkü kodlarımız harf içerebiliyor: ABC12)
            // Harf içeren yoksa ilk sayısal grubu al
            const bestMatch = codeMatches.find(c => /[A-Z]/i.test(c)) || codeMatches[0];
            cleanCode = bestMatch.toUpperCase();
            console.log(`[SMS-CB] [REGEX] Kodlar bulundu: ${codeMatches.join(', ')}. Secilen: ${cleanCode}`);
        }

        // Telefon normalizasyonu (Son 10 hane her zaman en güvenilir olanıdır)
        const cleanPhone = normalizePhone(phone); // 5336660125

        console.log(`[SMS-CB] [PROC] CleanedCode: ${cleanCode}, CleanedPhone: ${cleanPhone}`);

        if (!cleanCode || cleanCode.length < 3) {
            console.log(`[SMS-CB] [FAIL] Kod cok kisa veya gecersiz: "${cleanCode}"`);
            return null;
        }

        // Veritabanında ara:
        // 1. Onaylanmamış bir firma olmalı
        // 2. Kod veritabanındakiyle aynı olmalı (Büyük/Küçük harf duyarsız)
        // 3. Telefon numarasının son 10 hanesi tutmalı (Veritabanındaki numara da temizlenerek kontrol edilir)
        const findRes = await pool.query(
            `SELECT id, name, phone, verification_code FROM companies 
             WHERE (UPPER(verification_code) = $1 OR UPPER(verification_code) = $2 OR UPPER(admin_key) = $1)
             AND (
                REGEXP_REPLACE(phone, '\\D', '', 'g') LIKE '%' || $3
                OR RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = $3
                OR phone IS NULL OR phone = ''
             )
             AND is_verified = false 
             ORDER BY created_at DESC
             LIMIT 1`,
            [cleanCode, cleanCode.substring(0, 5), cleanPhone]
        );

        if (findRes.rows.length === 0) {
            console.log(`[SMS-CB] [FAIL] Eslesme bulunamadi. Aranan: Code="${cleanCode}", PhoneEndsWith="${cleanPhone}"`);

            // Debug: Onay bekleyen son kayıtları dök ki neyi kaçırdığımızı görelim
            const pending = await pool.query('SELECT name, phone, verification_code, created_at FROM companies WHERE is_verified = false ORDER BY created_at DESC LIMIT 3');
            console.log('[SMS-CB] [DEBUG] Veritabaninda Onay Bekleyen Kayitlar:', JSON.stringify(pending.rows, null, 2));
            return null;
        }

        const company = findRes.rows[0];
        console.log(`[SMS-CB] [SUCCESS] Bulundu: "${company.name}" (ID: ${company.id}). Onay sureci baslatiliyor...`);

        try {
            return await this.verifyCompany(company.id);
        } catch (err: any) {
            console.error(`[SMS-CB] [ERROR] verifyCompany(id=${company.id}) HATA:`, err.message);
            return null;
        }
    }

    /**
     * Re-calculate and sync denormalized stats for a company
     */
    async syncCompanyStats(id: number) {
        try {
            await pool.query(`
                UPDATE companies c SET 
                    rating_avg = COALESCE((SELECT AVG(rating) FROM appointments WHERE company_id = $1 AND rating IS NOT NULL), 0),
                    review_count = COALESCE((SELECT COUNT(rating) FROM appointments WHERE company_id = $1 AND rating IS NOT NULL), 0),
                    staff_count = COALESCE((SELECT COUNT(*) FROM users WHERE company_id = $1 AND is_active = true), 0),
                    service_count = COALESCE((SELECT COUNT(*) FROM services WHERE company_id = $1 AND is_active = true), 0)
                WHERE id = $1;
            `, [id]);
            await this.clearCompanyCache(id);
        } catch (e) {
            console.error('[SyncStats] Failed:', e);
        }
    }
}

export default new CompanyService();
