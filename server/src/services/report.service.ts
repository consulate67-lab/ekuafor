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
                SUM(COALESCE(a.price, s.price, 0)) as total_revenue
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.company_id = $1 
            ${staffId ? 'AND a.staff_id = $2' : ''}
            AND a.status != 'cancelled'
            AND ${dateFilter}
        `;

        const params = staffId ? [companyId, staffId] : [companyId];
        const result = await pool.query(query, params);
        return {
            total_appointments: parseInt(result.rows[0].total_appointments) || 0,
            total_revenue: parseFloat(result.rows[0].total_revenue) || 0
        };
    }
}

export default new ReportService();
