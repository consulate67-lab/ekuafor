import pool from '../config/database';
import iyzicoService from './iyzico.service';
import smsService from './sms.service';


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
}

class CompanyService {
    /**
     * Yeni firma oluştur
     */
    async createCompany(company: Company, createdBy: number): Promise<Company> {
        const client = await pool.connect();

        try {
            // Ensure neighborhood column exists (one-time migration check)
            try {
                await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS neighborhood TEXT');
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

            const query = `
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
          ubl_incoming_alias, ubl_outgoing_alias
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38)
        RETURNING *
      `;

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
                company.is_active !== false,
                company.is_verified || false,
                createdBy,
                company.board_key || null,
                company.work_start_time || '09:00',
                company.work_end_time || '20:00',
                company.slot_interval || 30,
                company.admin_key || `ADM-${company.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                company.genders || [],
                company.company_type || 'ASIL',
                company.main_company_id || null,
                company.tax_number || null,
                company.tax_office || null,
                company.qnb_username || null,
                company.qnb_password || null,
                company.qnb_vkn || null,
                company.efatura_test_mode !== false,
                company.invoice_prefix || 'GIB',
                company.ubl_incoming_alias || 'default',
                company.ubl_outgoing_alias || 'default'
            ];


            const result = await client.query(query, values);
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
        const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
        const company = result.rows[0] || null;
        if (company) {
            console.log(`[DB Fetch] Company ${id} found. Name: ${company.name}, Genders:`, company.genders);
        }
        return company;
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
        const values: any[] = [];
        let paramIndex = 1;

        let whereClauses = ['1=1'];

        // Caching column check to avoid repetitive schema queries
        const columnCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'appointments' AND column_name = 'rating'
        `);
        const hasRatingColumn = columnCheck.rowCount && columnCheck.rowCount > 0;

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

        const ratingSubquery = hasRatingColumn
            ? `(SELECT COALESCE(AVG(rating), 0) FROM appointments WHERE company_id = c.id AND rating IS NOT NULL)`
            : `0`;

        const reviewCountSubquery = hasRatingColumn
            ? `(SELECT COUNT(rating) FROM appointments WHERE company_id = c.id AND rating IS NOT NULL)`
            : `0`;

        let query = `
            SELECT 
                c.*,
                ${ratingSubquery} as rating_avg,
                ${reviewCountSubquery} as review_count
            FROM companies c
            WHERE ${whereClauses.join(' AND ')}
        `;

        if (filters?.sort === 'rating' && hasRatingColumn) {
            query += ' ORDER BY rating_avg DESC, review_count DESC';
        } else if (filters?.sort === 'reviews' && hasRatingColumn) {
            query += ' ORDER BY review_count DESC, rating_avg DESC';
        } else {
            query += ' ORDER BY c.created_at DESC';
        }

        const result = await pool.query(query, values);
        return result.rows;
    }

    /**
     * Firma sil (soft delete)
     */
    async deleteCompany(id: number): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM companies WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Firma onayla
     */
    async verifyCompany(id: number): Promise<Company | null> {
        const result = await pool.query(
            'UPDATE companies SET is_verified = true, is_active = true WHERE id = $1 RETURNING *',
            [id]
        );
        const company = result.rows[0] || null;

        if (company) {
            // Hizmet Cinsiyetine Göre Şablon Hizmet Ekleme
            try {
                const genders = company.genders || [];
                const defaultServices: any[] = [];

                if (genders.includes('Kadın')) {
                    defaultServices.push({ name: 'Kadın Saç Kesim', duration: 30, price: 0 });
                    defaultServices.push({ name: 'Kadın Fön', duration: 30, price: 0 });
                }
                if (genders.includes('Erkek')) {
                    defaultServices.push({ name: 'Erkek Saç Sakal Kesim', duration: 30, price: 0 });
                    defaultServices.push({ name: 'Sakal Tıraşı', duration: 15, price: 0 });
                }
                if (genders.includes('Unisex')) {
                    defaultServices.push({ name: 'Cilt Bakımı', duration: 45, price: 0 });
                }

                if (defaultServices.length > 0) {
                    for (const s of defaultServices) {
                        await pool.query(
                            'INSERT INTO services (company_id, name, duration, price) VALUES ($1, $2, $3, $4)',
                            [id, s.name, s.duration, s.price]
                        );
                    }
                }
            } catch (err) {
                console.error(`[CompanyService] Varsayılan hizmetler eklenemedi`, err);
            }

            if (company.phone) {
                try {
                    const baseUrl = 'www.saloontr.com';
                    const message = `Sayın ${company.name}, başvurunuz onaylanmıştır. Firma Yönetim Paneliniz: ${baseUrl}/company-panel?key=${company.admin_key} Çalışanlarınızı Tanıtmak İçin: ${baseUrl}/setup-staff/${company.id}?key=${company.admin_key}`;

                    await smsService.sendSms(null, company.phone, message);
                    console.log(`[CompanyService] Onay SMS gonderildi: ${company.phone}`);
                } catch (err) {
                    console.error(`[CompanyService] Onay SMS gonderilemedi: ${company.phone}`, err);
                }
            }
        }

        return company;
    }
}

export default new CompanyService();
