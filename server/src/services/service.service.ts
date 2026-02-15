import pool from '../config/database';

export interface Service {
    id?: number;
    company_id: number;
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    is_active?: boolean;
}

class ServiceService {
    async createService(service: Service): Promise<Service> {
        const query = `
      INSERT INTO services (company_id, name, description, duration_minutes, price)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const values = [
            service.company_id,
            service.name,
            service.description,
            service.duration_minutes,
            service.price
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    async getServicesByCompany(companyId: number): Promise<Service[]> {
        const result = await pool.query(
            'SELECT * FROM services WHERE company_id = $1 AND is_active = true ORDER BY name',
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
