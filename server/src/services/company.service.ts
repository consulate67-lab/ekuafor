import pool from '../config/database';

export interface Company {
    id?: number;
    name: string;
    description?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;

    // Adres
    address_line?: string | null;
    province_id?: number | null;
    province_name?: string | null;
    district_id?: number | null;
    district_name?: string | null;
    neighborhood_id?: number | null;
    neighborhood_name?: string | null;
    postal_code?: string | null;

    // Konum
    latitude?: number | null;
    longitude?: number | null;

    // Banka
    bank_name?: string | null;
    bank_branch?: string | null;
    iban?: string | null;
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
}

class CompanyService {
    /**
     * Yeni firma oluştur
     */
    async createCompany(company: Company, createdBy: number): Promise<Company> {
        const client = await pool.connect();

        try {
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
          address_line, province_id, province_name, district_id, district_name,
          neighborhood_id, neighborhood_name, postal_code,
          latitude, longitude,
          bank_name, bank_branch, iban, account_holder_name,
          commission_rate, payment_enabled,
          is_active, is_verified, created_by, board_key, 
          work_start_time, work_end_time, slot_interval, admin_key,
          genders, company_type, main_company_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
        RETURNING *
      `;

            const values = [
                company.name,
                company.description,
                company.phone,
                company.email,
                company.website,
                company.address_line,
                company.province_id,
                company.province_name,
                company.district_id,
                company.district_name,
                company.neighborhood_id,
                company.neighborhood_name,
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
                company.main_company_id || null
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
            whereClauses.push(`(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.province_name ILIKE $${paramIndex} OR c.district_name ILIKE $${paramIndex})`);
            values.push(`%${filters.search}%`);
            paramIndex++;
        }

        if (filters?.gender) {
            whereClauses.push(`$${paramIndex} = ANY(c.genders)`);
            values.push(filters.gender);
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
                (c.latitude IS NULL OR c.longitude IS NULL OR c.latitude = 0 OR c.longitude = 0) OR
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
            'UPDATE companies SET is_verified = true WHERE id = $1 RETURNING *',
            [id]
        );
        return result.rows[0] || null;
    }
}

export default new CompanyService();
