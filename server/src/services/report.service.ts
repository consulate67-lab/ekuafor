import pool from '../config/database';

class ReportService {
    async getEmployeeStats(companyId: number, staffId: number | undefined, period: 'today' | 'week' | 'month' | 'year', localDate?: string) {
        let dateFilter = '';
        let dateFilterExp = '';
        const todayStr = localDate ? `'${localDate}'::date` : 'CURRENT_DATE';

        switch (period) {
            case 'today':
                dateFilter = `appointment_date = ${todayStr}`;
                dateFilterExp = `expense_date = ${todayStr}`;
                break;
            case 'week':
                dateFilter = `appointment_date >= date_trunc('week', ${todayStr})`;
                dateFilterExp = `expense_date >= date_trunc('week', ${todayStr})`;
                break;
            case 'month':
                dateFilter = `appointment_date >= date_trunc('month', ${todayStr})`;
                dateFilterExp = `expense_date >= date_trunc('month', ${todayStr})`;
                break;
            case 'year':
                dateFilter = `appointment_date >= date_trunc('year', ${todayStr})`;
                dateFilterExp = `expense_date >= date_trunc('year', ${todayStr})`;
                break;
        }

        const params: any[] = [companyId, staffId || null];
        let staffFilter = '';
        let staffFilterExp = '';

        if (staffId) {
            staffFilter = 'AND (a.staff_id = $2 OR EXISTS (SELECT 1 FROM appointment_services WHERE appointment_id = a.id AND staff_id = $2))';
            staffFilterExp = 'AND created_by = $2';
        }

        const query = `
            SELECT 
                COUNT(DISTINCT a.id) as total_appointments,
                SUM(
                    COALESCE(
                        (SELECT SUM(aps_in.price) FROM appointment_services aps_in WHERE aps_in.appointment_id = a.id AND (
                            ($2::INTEGER IS NULL) OR 
                            (aps_in.staff_id = $2) OR 
                            (aps_in.staff_id IS NULL AND a.staff_id = $2)
                        )),
                        CASE WHEN ($2::INTEGER IS NULL OR (a.staff_id = $2 AND NOT EXISTS (SELECT 1 FROM appointment_services WHERE appointment_id = a.id))) 
                             THEN COALESCE(a.original_price, a.price, s.price, 0) 
                             ELSE 0 
                        END
                    )
                ) as total_booked_value,
                SUM(CASE WHEN a.status IN ('completed', 'invoiced') THEN 
                    COALESCE(
                        (SELECT SUM(aps_in.price) FROM appointment_services aps_in WHERE aps_in.appointment_id = a.id AND (
                            ($2::INTEGER IS NULL) OR 
                            (aps_in.staff_id = $2) OR 
                            (aps_in.staff_id IS NULL AND a.staff_id = $2)
                        )),
                        CASE WHEN ($2::INTEGER IS NULL OR a.staff_id = $2) 
                             THEN COALESCE(a.collected_price, a.price, s.price, 0) 
                             ELSE 0 
                        END,
                        0
                    )
                ELSE 0 END) as actual_collected
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.company_id = $1 
            ${staffFilter}
            AND a.status != 'cancelled'
            AND ${dateFilter}
        `;

        const result = await pool.query(query, params);

        const expQuery = `
            SELECT SUM(amount) as total_expenses
            FROM expenses
            WHERE company_id = $1
            AND ${dateFilterExp}
            ${staffFilterExp}
        `;
        const expResult = await pool.query(expQuery, params);

        return {
            total_appointments: parseInt(result.rows[0].total_appointments) || 0,
            total_booked_value: parseFloat(result.rows[0].total_booked_value) || 0,
            actual_collected: parseFloat(result.rows[0].actual_collected) || 0,
            total_expenses: parseFloat(expResult.rows[0].total_expenses) || 0
        };
    }

    async getDetailedCompanyReports(companyId: number, period: 'today' | 'week' | 'month' | 'year', localDate?: string) {
        let statsFilter = '';
        let chartFilter = '';
        const todayStr = localDate ? `'${localDate}'::date` : 'CURRENT_DATE';

        switch (period) {
            case 'today':
                statsFilter = `appointment_date = ${todayStr}`;
                chartFilter = `appointment_date >= date_trunc('week', ${todayStr})`; // Today evaluates the week for charts
                break;
            case 'week':
                statsFilter = `appointment_date >= date_trunc('week', ${todayStr})`;
                chartFilter = statsFilter;
                break;
            case 'month':
                statsFilter = `appointment_date >= date_trunc('month', ${todayStr})`;
                chartFilter = statsFilter;
                break;
            case 'year':
                statsFilter = `appointment_date >= date_trunc('year', ${todayStr})`;
                chartFilter = statsFilter;
                break;
        }

        // 1. Staff Breakdown (Uses STRICT statsFilter)
        // Fetches staff-specific commission rate or falls back to company's default rate
        const staffQuery = `
            WITH staff_all AS (
                SELECT 
                    u.id as staff_id, 
                    u.first_name || ' ' || u.last_name as staff_name,
                    u.commission_rate as staff_commission_rate,
                    c.commission_rate as company_commission_rate
                FROM users u
                JOIN (
                    SELECT id as user_id FROM users WHERE company_id = $1
                    UNION
                    SELECT user_id FROM company_users WHERE company_id = $1
                ) cu_all ON u.id = cu_all.user_id
                JOIN companies c ON u.company_id = c.id
                WHERE u.role != 'customer'
            )
            SELECT 
                sa.staff_id,
                sa.staff_name,
                sa.staff_commission_rate,
                sa.company_commission_rate,
                COUNT(DISTINCT a.id) as count,
                SUM(
                    COALESCE(
                        (SELECT SUM(aps_in.price) FROM appointment_services aps_in WHERE aps_in.appointment_id = a.id AND (
                            (aps_in.staff_id = sa.staff_id) OR 
                            (aps_in.staff_id IS NULL AND a.staff_id = sa.staff_id)
                        )),
                        CASE WHEN (a.staff_id = sa.staff_id AND NOT EXISTS (SELECT 1 FROM appointment_services WHERE appointment_id = a.id)) 
                             THEN COALESCE(a.original_price, a.price, s.price, 0) 
                             ELSE 0 
                        END
                    )
                ) as total_booked_value,
                SUM(CASE WHEN a.status IN ('completed', 'invoiced') THEN 
                    COALESCE(
                        (SELECT SUM(aps_in.price) FROM appointment_services aps_in WHERE aps_in.appointment_id = a.id AND (
                            (aps_in.staff_id = sa.staff_id) OR 
                            (aps_in.staff_id IS NULL AND a.staff_id = sa.staff_id)
                        )),
                        CASE WHEN (a.staff_id = sa.staff_id) 
                             THEN COALESCE(a.collected_price, a.price, s.price, 0) 
                             ELSE 0 
                        END,
                        0
                    )
                ELSE 0 END) as actual_collected
            FROM staff_all sa
            LEFT JOIN (
                SELECT DISTINCT a_in.*
                FROM appointments a_in
                LEFT JOIN appointment_services aps_in ON a_in.id = aps_in.appointment_id
                WHERE a_in.company_id = $1 AND a_in.status != 'cancelled' AND ${statsFilter}
            ) a ON sa.staff_id = a.staff_id OR EXISTS (SELECT 1 FROM appointment_services WHERE appointment_id = a.id AND staff_id = sa.staff_id)
            LEFT JOIN services s ON a.service_id = s.id
            GROUP BY sa.staff_id, sa.staff_name, sa.staff_commission_rate, sa.company_commission_rate
            ORDER BY count DESC
        `;

        // 2. Hourly Distribution (Uses chartFilter)
        const hourlyQuery = `
            SELECT 
                EXTRACT(HOUR FROM start_time)::INTEGER as hour,
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
                SUM(COALESCE(a.original_price, a.price, s.price, 0)) as total_booked_value,
                SUM(CASE WHEN a.status IN ('completed', 'invoiced') THEN COALESCE(a.collected_price, a.price, s.price, 0) ELSE 0 END) as actual_collected
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
                SUM(COALESCE(a.original_price, a.price, s.price, 0)) as total_booked_value,
                SUM(CASE WHEN a.status IN ('completed', 'invoiced') THEN COALESCE(a.collected_price, a.price, s.price, 0) ELSE 0 END) as actual_collected
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
                COUNT(DISTINCT a.id) as count,
                SUM(COALESCE(
                    (SELECT SUM(aps_in.price) FROM appointment_services aps_in WHERE aps_in.appointment_id = a.id AND EXISTS (SELECT 1 FROM users u2 WHERE u2.id = aps_in.staff_id AND u2.department_id = d.id)),
                    CASE WHEN EXISTS (SELECT 1 FROM users u2 WHERE u2.id = a.staff_id AND u2.department_id = d.id) AND NOT EXISTS (SELECT 1 FROM appointment_services WHERE appointment_id = a.id)
                         THEN COALESCE(a.original_price, a.price, s.price, 0)
                         ELSE 0
                    END
                )) as total_booked_value,
                SUM(CASE WHEN a.status IN ('completed', 'invoiced') THEN 
                    COALESCE(
                        (SELECT SUM(aps_in.price) FROM appointment_services aps_in WHERE aps_in.appointment_id = a.id AND EXISTS (SELECT 1 FROM users u2 WHERE u2.id = aps_in.staff_id AND u2.department_id = d.id)),
                        CASE WHEN EXISTS (SELECT 1 FROM users u2 WHERE u2.id = a.staff_id AND u2.department_id = d.id) AND NOT EXISTS (SELECT 1 FROM appointment_services WHERE appointment_id = a.id)
                             THEN COALESCE(a.collected_price, a.price, s.price, 0)
                             ELSE 0
                        END
                    )
                ELSE 0 END) as actual_collected
            FROM departments d
            LEFT JOIN users u ON u.department_id = d.id
            LEFT JOIN appointments a ON (a.staff_id = u.id OR EXISTS (SELECT 1 FROM appointment_services aps_in WHERE aps_in.appointment_id = a.id AND aps_in.staff_id = u.id))
                AND a.company_id = $1 AND a.status != 'cancelled' AND ${statsFilter}
            LEFT JOIN services s ON a.service_id = s.id
            WHERE d.company_id = $1
            GROUP BY d.id, d.name
            ORDER BY actual_collected DESC
        `;

        const [staffRes, hourlyRes, weeklyRes, monthlyRes, deptRes] = await Promise.all([
            pool.query(staffQuery, [companyId]),
            pool.query(hourlyQuery, [companyId]),
            pool.query(weeklyQuery, [companyId]),
            pool.query(monthlyQuery, [companyId]),
            pool.query(departmentQuery, [companyId])
        ]);

        return {
            staffStats: staffRes.rows.map(r => {
                const actualCollected = parseFloat(r.actual_collected || 0);
                const rate = parseFloat(r.staff_commission_rate || r.company_commission_rate || 0);
                return {
                    ...r,
                    count: parseInt(r.count),
                    total_booked_value: parseFloat(r.total_booked_value || 0),
                    actual_collected: actualCollected,
                    actual_commission: (actualCollected * rate) / 100
                };
            }),
            hourlyStats: hourlyRes.rows.map(r => ({ hour: parseInt(r.hour), count: parseInt(r.count) })),
            weeklyStats: weeklyRes.rows.map(r => ({ day: r.day_name.trim(), count: parseInt(r.count), total_booked_value: parseFloat(r.total_booked_value || 0), actual_collected: parseFloat(r.actual_collected || 0) })),
            monthlyStats: monthlyRes.rows.map(r => ({ month: r.month_name.trim(), count: parseInt(r.count), total_booked_value: parseFloat(r.total_booked_value || 0), actual_collected: parseFloat(r.actual_collected || 0) })),
            departmentStats: deptRes.rows.map(r => ({ ...r, count: parseInt(r.count), total_booked_value: parseFloat(r.total_booked_value || 0), actual_collected: parseFloat(r.actual_collected || 0) }))
        };
    }
}

export default new ReportService();
