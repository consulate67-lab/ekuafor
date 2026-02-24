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

    async getDetailedCompanyReports(companyId: number, period: 'today' | 'week' | 'month' | 'year') {
        let statsFilter = '';
        let chartFilter = '';

        switch (period) {
            case 'today':
                statsFilter = "appointment_date = CURRENT_DATE";
                chartFilter = "appointment_date >= date_trunc('week', CURRENT_DATE)"; // Today evaluates the week for charts
                break;
            case 'week':
                statsFilter = "appointment_date >= date_trunc('week', CURRENT_DATE)";
                chartFilter = statsFilter;
                break;
            case 'month':
                statsFilter = "appointment_date >= date_trunc('month', CURRENT_DATE)";
                chartFilter = statsFilter;
                break;
            case 'year':
                statsFilter = "appointment_date >= date_trunc('year', CURRENT_DATE)";
                chartFilter = statsFilter;
                break;
        }

        // 1. Staff Breakdown (Uses STRICT statsFilter)
        const staffQuery = `
            SELECT 
                u.id as staff_id,
                u.first_name || ' ' || u.last_name as staff_name,
                COUNT(a.id) as count,
                SUM(COALESCE(a.price, s.price, 0)) as revenue
            FROM users u
            LEFT JOIN appointments a ON u.id = a.staff_id AND a.company_id = $1 AND a.status != 'cancelled' AND ${statsFilter}
            LEFT JOIN services s ON a.service_id = s.id
            WHERE u.company_id = $1 AND u.role != 'customer'
            GROUP BY u.id, u.first_name, u.last_name
            ORDER BY count DESC
        `;

        // 2. Hourly Distribution (Uses chartFilter)
        const hourlyQuery = `
            SELECT 
                CAST(SPLIT_PART(start_time, ':', 1) AS INTEGER) as hour,
                COUNT(*) as count
            FROM appointments
            WHERE company_id = $1 AND status != 'cancelled' AND ${chartFilter}
            GROUP BY hour
            ORDER BY hour
        `;

        // 3. Weekly Distribution (Uses chartFilter)
        const weeklyQuery = `
            SELECT 
                TO_CHAR(appointment_date, 'Day') as day_name,
                EXTRACT(DOW FROM appointment_date) as day_index,
                COUNT(*) as count,
                SUM(COALESCE(a.price, s.price, 0)) as revenue
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.company_id = $1 AND a.status != 'cancelled' AND ${chartFilter}
            GROUP BY day_name, day_index
            ORDER BY day_index
        `;

        // 4. Monthly Distribution (Uses chartFilter)
        const monthlyQuery = `
            SELECT 
                TO_CHAR(appointment_date, 'Month') as month_name,
                EXTRACT(MONTH FROM appointment_date) as month_index,
                COUNT(*) as count,
                SUM(COALESCE(a.price, s.price, 0)) as revenue
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.company_id = $1 AND a.status != 'cancelled' AND ${chartFilter}
            GROUP BY month_name, month_index
            ORDER BY month_index
        `;

        // 5. Department Breakdown
        const departmentQuery = `
            SELECT 
                d.id as department_id,
                d.name as department_name,
                COUNT(a.id) as count,
                SUM(COALESCE(a.price, s.price, 0)) as revenue
            FROM departments d
            LEFT JOIN appointments a ON d.id = a.department_id AND a.company_id = $1 AND a.status != 'cancelled' AND ${statsFilter}
            LEFT JOIN services s ON a.service_id = s.id
            WHERE d.company_id = $1
            GROUP BY d.id, d.name
            ORDER BY revenue DESC
        `;

        const [staffRes, hourlyRes, weeklyRes, monthlyRes, deptRes] = await Promise.all([
            pool.query(staffQuery, [companyId]),
            pool.query(hourlyQuery, [companyId]),
            pool.query(weeklyQuery, [companyId]),
            pool.query(monthlyQuery, [companyId]),
            pool.query(departmentQuery, [companyId])
        ]);

        return {
            staffStats: staffRes.rows.map(r => ({ ...r, count: parseInt(r.count), revenue: parseFloat(r.revenue || 0) })),
            hourlyStats: hourlyRes.rows.map(r => ({ hour: parseInt(r.hour), count: parseInt(r.count) })),
            weeklyStats: weeklyRes.rows.map(r => ({ day: r.day_name.trim(), count: parseInt(r.count), revenue: parseFloat(r.revenue || 0) })),
            monthlyStats: monthlyRes.rows.map(r => ({ month: r.month_name.trim(), count: parseInt(r.count), revenue: parseFloat(r.revenue || 0) })),
            departmentStats: deptRes.rows.map(r => ({ ...r, count: parseInt(r.count), revenue: parseFloat(r.revenue || 0) }))
        };
    }
}

export default new ReportService();
