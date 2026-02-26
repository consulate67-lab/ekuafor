import pool from '../config/database';

export interface MainCompany {
    id?: number;
    name: string;
    description?: string;
    address_line?: string;
    province_id?: number;
    province_name?: string;
    admin_code: string;
    board_key?: string;
    is_active?: boolean;
    created_at?: Date;
}

class MainCompanyService {
    async create(data: any): Promise<MainCompany> {
        const query = `
            INSERT INTO companies (name, description, address_line, province_id, province_name, admin_key, board_key, company_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'ÜST FİRMA')
            RETURNING id, name, description, address_line, province_id, province_name, admin_key as admin_code, board_key, is_active, created_at
        `;
        const values = [data.name, data.description, data.address_line, data.province_id, data.province_name, data.admin_key || data.admin_code, data.board_key];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    async getAll(): Promise<MainCompany[]> {
        const result = await pool.query('SELECT id, name, description, address_line, province_id, province_name, admin_key as admin_code, is_active, created_at FROM companies WHERE company_type = \'ÜST FİRMA\' ORDER BY created_at DESC');
        return result.rows;
    }

    async getById(id: number): Promise<MainCompany | null> {
        const result = await pool.query('SELECT id, name, description, address_line, province_id, province_name, admin_key as admin_code, is_active, created_at FROM companies WHERE id = $1 AND company_type = \'ÜST FİRMA\'', [id]);
        return result.rows[0] || null;
    }

    async getByAdminCode(code: string): Promise<MainCompany | null> {
        const result = await pool.query('SELECT id, name, description, address_line, province_id, province_name, admin_key as admin_code, is_active, created_at FROM companies WHERE admin_key = $1 AND company_type = \'ÜST FİRMA\'', [code]);
        return result.rows[0] || null;
    }

    async update(id: number, data: Partial<MainCompany>): Promise<MainCompany | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let i = 1;

        // Map admin_code back to admin_key if present
        const dbData: any = { ...data };
        if (dbData.admin_code) {
            dbData.admin_key = dbData.admin_code;
            delete dbData.admin_code;
        }

        Object.entries(dbData).forEach(([key, value]) => {
            if (value !== undefined && key !== 'id') {
                fields.push(`${key} = $${i}`);
                values.push(value);
                i++;
            }
        });

        if (fields.length === 0) return null;

        values.push(id);
        const query = `UPDATE companies SET ${fields.join(', ')} WHERE id = $${i} AND company_type = 'ÜST FİRMA' RETURNING id, name, description, address_line, province_id, province_name, admin_key as admin_code, board_key, is_active, created_at`;
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    }

    async getBranches(mainCompanyId: number): Promise<any[]> {
        const query = `
            SELECT id, name, province_name, district_name, latitude, longitude, is_active
            FROM companies
            WHERE main_company_id = $1
            ORDER BY name ASC
        `;
        const result = await pool.query(query, [mainCompanyId]);
        return result.rows;
    }

    async getStats(mainCompanyId: number): Promise<any> {
        // Aggregated stats for all branches
        const query = `
            SELECT 
                COUNT(a.id) as total_appointments,
                SUM(a.price) as total_revenue,
                (SELECT COUNT(*) FROM companies WHERE main_company_id = $1) as branch_count,
                COUNT(DISTINCT a.customer_phone) as unique_customers
            FROM appointments a
            JOIN companies c ON a.company_id = c.id
            WHERE c.main_company_id = $1 AND a.status = 'completed'
        `;
        const result = await pool.query(query, [mainCompanyId]);
        return result.rows[0];
    }

    async getByBoardKey(key: string): Promise<MainCompany | null> {
        const result = await pool.query('SELECT id, name, description, address_line, province_id, province_name, admin_key as admin_code, board_key, is_active, created_at FROM companies WHERE board_key = $1 AND company_type = \'ÜST FİRMA\'', [key]);
        return result.rows[0] || null;
    }

    async getBranchPerformance(mainCompanyId: number): Promise<any[]> {
        const query = `
            SELECT 
                c.id as branch_id,
                c.name as branch_name,
                c.province_name,
                c.latitude,
                c.longitude,
                COUNT(a.id) as appointment_count,
                COALESCE(SUM(a.price), 0) as revenue
            FROM companies c
            LEFT JOIN appointments a ON a.company_id = c.id AND a.status = 'completed'
            WHERE c.main_company_id = $1
            GROUP BY c.id, c.name, c.province_name, c.latitude, c.longitude
            ORDER BY revenue DESC
        `;
        const result = await pool.query(query, [mainCompanyId]);
        return result.rows;
    }

    async delete(id: number): Promise<boolean> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Decouple branches
            await client.query('UPDATE companies SET main_company_id = NULL WHERE main_company_id = $1', [id]);

            // 2. Delete the main company
            const result = await client.query('DELETE FROM companies WHERE id = $1 AND company_type = \'ÜST FİRMA\'', [id]);

            await client.query('COMMIT');
            return (result.rowCount || 0) > 0;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

export default new MainCompanyService();
