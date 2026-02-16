import pool from '../config/database';

export interface Appointment {
    id?: number;
    company_id: number;
    customer_id?: number;
    service_id: number;
    staff_id?: number;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'approved' | 'cancelled' | 'completed';
    notes?: string;
    price?: number;
    customer_name?: string;
    service_name?: string;
}

class AppointmentService {
    async createAppointment(appointment: Appointment): Promise<Appointment> {
        const query = `
      INSERT INTO appointments (
        company_id, customer_id, service_id, staff_id, 
        appointment_date, start_time, end_time, status, notes, price
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
        const values = [
            appointment.company_id,
            appointment.customer_id,
            appointment.service_id,
            appointment.staff_id,
            appointment.appointment_date,
            appointment.start_time,
            appointment.end_time,
            appointment.status || 'pending',
            appointment.notes,
            appointment.price
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    async getAppointmentsByCompany(companyId: number, status?: string, staffId?: number): Promise<Appointment[]> {
        let query = `
      SELECT a.*, s.name as service_name, u.first_name || ' ' || u.last_name as customer_name
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN users u ON a.customer_id = u.id
      WHERE a.company_id = $1
    `;
        const values: any[] = [companyId];
        let paramIndex = 2;

        if (status) {
            query += ` AND a.status = $${paramIndex}`;
            values.push(status);
            paramIndex++;
        }

        if (staffId) {
            query += ` AND (a.staff_id = $${paramIndex} OR a.staff_id IS NULL)`;
            values.push(staffId);
            paramIndex++;
        }

        query += ' ORDER BY a.appointment_date DESC, a.start_time DESC';

        const result = await pool.query(query, values);
        return result.rows;
    }

    async updateAppointmentStatus(id: number, status: string): Promise<Appointment | null> {
        const result = await pool.query(
            'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        return result.rows[0] || null;
    }

    async getAppointmentsByDateRange(companyId: number, startDate: string, endDate: string, staffId?: number): Promise<Appointment[]> {
        let query = `
      SELECT a.*, s.name as service_name, u.first_name || ' ' || u.last_name as customer_name
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN users u ON a.customer_id = u.id
      WHERE a.company_id = $1 AND a.appointment_date BETWEEN $2 AND $3
    `;
        const values: any[] = [companyId, startDate, endDate];

        if (staffId) {
            query += ' AND (a.staff_id = $4 OR a.staff_id IS NULL)';
            values.push(staffId);
        }

        query += ' ORDER BY a.appointment_date, a.start_time';
        const result = await pool.query(query, values);
        return result.rows;
    }
}

export default new AppointmentService();
