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
          is_active, is_verified, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
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
                createdBy
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
                    fields.push(`${key} = $${paramIndex}`);
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

            const result = await client.query(query, values);
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
        return result.rows[0] || null;
    }

    /**
     * Tüm firmaları getir
     */
    async getAllCompanies(filters?: {
        is_active?: boolean;
        is_verified?: boolean;
        search?: string;
    }): Promise<Company[]> {
        let query = 'SELECT * FROM companies WHERE 1=1';
        const values: any[] = [];
        let paramIndex = 1;

        if (filters?.is_active !== undefined) {
            query += ` AND is_active = $${paramIndex}`;
            values.push(filters.is_active);
            paramIndex++;
        }

        if (filters?.is_verified !== undefined) {
            query += ` AND is_verified = $${paramIndex}`;
            values.push(filters.is_verified);
            paramIndex++;
        }

        if (filters?.search) {
            query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
            values.push(`%${filters.search}%`);
            paramIndex++;
        }

        query += ' ORDER BY created_at DESC';

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
