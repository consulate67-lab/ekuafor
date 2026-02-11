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
        const query = `
      SELECT cu.*, u.first_name, u.last_name, u.email, u.phone
      FROM company_users cu
      JOIN users u ON cu.user_id = u.id
      WHERE cu.company_id = $1 AND cu.is_active = true
      ORDER BY cu.created_at ASC
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
