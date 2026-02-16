import pool from '../config/database';

export interface Employee {
    id?: number;
    company_id: number;
    user_id: number;
    role: 'owner' | 'manager' | 'staff';
    is_active: boolean;
    created_at?: string;
    // Join ile gelecek alanlar
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
}

class EmployeeService {
    /**
     * Firmaya çalışan ekle
     */
    async addEmployee(companyId: number, userId: number, role: 'owner' | 'manager' | 'staff' = 'staff'): Promise<Employee> {
        const result = await pool.query(
            `INSERT INTO company_users (company_id, user_id, role) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
            [companyId, userId, role]
        );
        return result.rows[0];
    }

    /**
     * Firmanın tüm çalışanlarını listele
     */
    async getEmployeesByCompany(companyId: number): Promise<Employee[]> {
        // Eski Yöntem: Sadece company_users tablosuna bakıyordu.
        // Yeni Yöntem: Hem users tablosundaki company_id'ye hem de company_users tablosuna bakar.
        const query = `
            SELECT DISTINCT
                u.id as user_id,
                u.company_id,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                u.role,
                true as is_active
            FROM users u
            LEFT JOIN company_users cu ON u.id = cu.user_id
            WHERE 
                (u.company_id = $1) 
                OR 
                (cu.company_id = $1 AND cu.is_active = true)
            ORDER BY u.first_name ASC
        `;
        const result = await pool.query(query, [companyId]);
        return result.rows;
    }

    /**
     * Çalışanı firmadan çıkar (Pasife çek)
     */
    async removeEmployee(companyId: number, employeeId: number): Promise<boolean> {
        const result = await pool.query(
            'UPDATE company_users SET is_active = false WHERE company_id = $1 AND id = $2',
            [companyId, employeeId]
        );
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Çalışan rolünü güncelle
     */
    async updateEmployeeRole(companyId: number, employeeId: number, role: string): Promise<Employee | null> {
        const result = await pool.query(
            'UPDATE company_users SET role = $1 WHERE company_id = $2 AND id = $3 RETURNING *',
            [role, companyId, employeeId]
        );
        return result.rows[0] || null;
    }
}

export default new EmployeeService();
