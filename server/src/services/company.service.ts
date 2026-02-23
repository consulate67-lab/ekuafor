import pool from '../config/database';

export interface Company {
    id?: number;
    name: string;
    description?: string;
    phone?: string;
    email?: string;
    website?: string;

    // Adres
    address_line?: string;
    province_id?: number;
    province_name?: string;
    district_id?: number;
    district_name?: string;
    neighborhood_id?: number;
    neighborhood_name?: string;
    postal_code?: string;

    // Konum
    latitude?: number;
    longitude?: number;

    // Banka
    bank_name?: string;
    bank_branch?: string;
    iban?: string;
    account_holder_name?: string;

    // Ödeme
    commission_rate?: number;
    payment_enabled?: boolean;

    // Durum
    is_active?: boolean;
    is_verified?: boolean;
    created_by?: number;
    board_key?: string;
    work_start_time?: string;
    work_end_time?: string;
    slot_interval?: number;
    admin_key?: string;
    genders?: string[];
    rating_avg?: number;
    review_count?: number;
}

class CompanyService {
    /**
     * Yeni firma oluştur
     */
    async createCompany(company: Company, createdBy: number): Promise<Company> {
        const client = await pool.connect();

        try {
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
          genders
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
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
                company.genders || []
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
            'UPDATE companies SET is_active = false WHERE id = $1 RETURNING id',
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
