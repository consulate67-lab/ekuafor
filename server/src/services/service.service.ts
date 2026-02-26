import pool from '../config/database';

export interface Service {
    id?: number;
    company_id: number;
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    is_active?: boolean;
    department_id?: number | null;
    quantity?: number | null;
    unit?: string | null;
}

class ServiceService {
    async createService(service: Service): Promise<Service> {
        const query = `
      INSERT INTO services (company_id, name, description, duration_minutes, price, department_id, quantity, unit)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
        const values = [
            service.company_id,
            service.name,
            service.description,
            service.duration_minutes,
            service.price,
            service.department_id || null,
            service.quantity || null,
            service.unit || null
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    async getServicesByCompany(companyId: number): Promise<Service[]> {
        const result = await pool.query(
            `SELECT s.*, d.name as department_name 
             FROM services s 
             LEFT JOIN departments d ON s.department_id = d.id
             WHERE s.company_id = $1 AND s.is_active = true 
             ORDER BY s.name`,
            [companyId]
        );
        return result.rows;
    }

    async updateService(id: number, service: Partial<Service>): Promise<Service | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        Object.entries(service).forEach(([key, value]) => {
            if (value !== undefined && key !== 'id' && key !== 'company_id') {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (fields.length === 0) return null;

        values.push(id);
        const query = `
      UPDATE services 
      SET ${fields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    }

    async deleteService(id: number): Promise<boolean> {
        const result = await pool.query(
            'UPDATE services SET is_active = false WHERE id = $1',
            [id]
        );
        return (result.rowCount ?? 0) > 0;
    }
}

export default new ServiceService();
