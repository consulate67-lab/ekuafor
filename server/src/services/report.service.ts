import pool from '../config/database';

class ReportService {
    async getEmployeeStats(companyId: number, staffId: number, period: 'today' | 'week' | 'month' | 'year') {
        let dateFilter = '';

        switch (period) {
            case 'today':
                dateFilter = "appointment_date = CURRENT_DATE";
                break;
            case 'week':
                dateFilter = "appointment_date >= date_trunc('week', CURRENT_DATE)";
                break;
            case 'month':
                dateFilter = "appointment_date >= date_trunc('month', CURRENT_DATE)";
                break;
            case 'year':
                dateFilter = "appointment_date >= date_trunc('year', CURRENT_DATE)";
                break;
        }

        const query = `
            SELECT 
                COUNT(*) as total_appointments,
                SUM(COALESCE(price, 0)) as total_revenue
            FROM appointments
            WHERE company_id = $1 
            AND staff_id = $2
            AND status != 'cancelled'
            AND ${dateFilter}
        `;

        const result = await pool.query(query, [companyId, staffId]);
        return {
            total_appointments: parseInt(result.rows[0].total_appointments) || 0,
            total_revenue: parseFloat(result.rows[0].total_revenue) || 0
        };
    }
}

export default new ReportService();
