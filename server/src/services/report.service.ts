import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Rapor Servisi — Drizzle ORM (raw SQL template).
 *
 * ESKİ: raw pg.query() + string concatenation
 * YENİ: db.execute(sql\`...\`)` — Drizzle'in parametreli raw SQL escape'i.
 *
 * Tüm sorguları raw SQL'e çevirdik çünkü:
 * - `expenses` tablosu Drizzle schema'da yok (migrate.ts'de de yok)
 * - `appointments.original_price` / `collected_price` kolonları schema'da yok
 * - `companies.license_end_date` kolonu schema'da yok
 * - Sorgular CTE, EXTRACT, TO_CHAR, date_trunc, generate_series, correlated EXISTS
 *   subquery gibi yapılar içeriyor — query builder ile yazılamaz
 * - Public API snake_case alan bekliyor; `db.execute()` sonucu zaten snake_case
 *   döndüğü için ek map'e gerek yok
 */
class ReportService {
    async getEmployeeStats(companyId: number, staffId: number | undefined, period: 'today' | 'week' | 'month' | 'year', localDate?: string) {
        // Drizzle sql fragment'ları — güvenli parametrik injection
        const todayExpr = localDate ? sql`${localDate}::date` : sql`CURRENT_DATE`;

        let dateFilter = sql``;
        let dateFilterExp = sql``;

        switch (period) {
            case 'today':
                dateFilter = sql`appointment_date = ${todayExpr}`;
                dateFilterExp = sql`expense_date = ${todayExpr}`;
                break;
            case 'week':
                dateFilter = sql`appointment_date >= date_trunc('week', ${todayExpr})`;
                dateFilterExp = sql`expense_date >= date_trunc('week', ${todayExpr})`;
                break;
            case 'month':
                dateFilter = sql`appointment_date >= date_trunc('month', ${todayExpr})`;
                dateFilterExp = sql`expense_date >= date_trunc('month', ${todayExpr})`;
                break;
            case 'year':
                dateFilter = sql`appointment_date >= date_trunc('year', ${todayExpr})`;
                dateFilterExp = sql`expense_date >= date_trunc('year', ${todayExpr})`;
                break;
        }

        const staffParam = staffId ? sql`${staffId}` : sql`NULL::INTEGER`;

        let staffFilter = sql``;
        let staffFilterExp = sql``;
        if (staffId) {
            staffFilter = sql`AND (a.staff_id = ${staffParam} OR EXISTS (SELECT 1 FROM appointment_services WHERE appointment_id = a.id AND staff_id = ${staffParam}))`;
            staffFilterExp = sql`AND created_by = ${staffParam}`;
        }

        const query = sql`
            SELECT
                COUNT(DISTINCT a.id) as total_appointments,
                SUM(
                    COALESCE(
                        (SELECT SUM(aps_in.price) FROM appointment_services aps_in WHERE aps_in.appointment_id = a.id AND (
                            (${staffParam}::INTEGER IS NULL) OR
                            (aps_in.staff_id = ${staffParam}) OR
                            (aps_in.staff_id IS NULL AND a.staff_id = ${staffParam})
                        )),
                        CASE WHEN (${staffParam}::INTEGER IS NULL OR (a.staff_id = ${staffParam} AND NOT EXISTS (SELECT 1 FROM appointment_services WHERE appointment_id = a.id)))
                             THEN COALESCE(a.original_price, a.price, s.price, 0)
                             ELSE 0
                        END
                    )
                ) as total_booked_value,
                SUM(CASE WHEN a.status IN ('completed', 'invoiced') THEN
                    COALESCE(
                        (SELECT SUM(aps_in.price) FROM appointment_services aps_in WHERE aps_in.appointment_id = a.id AND (
                            (${staffParam}::INTEGER IS NULL) OR
                            (aps_in.staff_id = ${staffParam}) OR
                            (aps_in.staff_id IS NULL AND a.staff_id = ${staffParam})
                        )),
                        CASE WHEN (${staffParam}::INTEGER IS NULL OR a.staff_id = ${staffParam})
                             THEN COALESCE(a.collected_price, a.price, s.price, 0)
                             ELSE 0
                        END,
                        0
                    )
                ELSE 0 END) as actual_collected
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.company_id = ${companyId}
            ${staffFilter}
            AND a.status != 'cancelled'
            AND ${dateFilter}
        `;

        const result = await db.execute(query);
        const resultRows = (result as any).rows as any[];

        const expQuery = sql`
            SELECT SUM(amount) as total_expenses
            FROM expenses
            WHERE company_id = ${companyId}
            AND ${dateFilterExp}
            ${staffFilterExp}
        `;
        const expResult = await db.execute(expQuery);
        const expRows = (expResult as any).rows as any[];

        return {
            total_appointments: parseInt(resultRows[0]?.total_appointments) || 0,
            total_booked_value: parseFloat(resultRows[0]?.total_booked_value) || 0,
            actual_collected: parseFloat(resultRows[0]?.actual_collected) || 0,
            total_expenses: parseFloat(expRows[0]?.total_expenses) || 0
        };
    }

    async getDetailedCompanyReports(companyId: number, period: 'today' | 'week' | 'month' | 'year', localDate?: string) {
        const todayExpr = localDate ? sql`${localDate}::date` : sql`CURRENT_DATE`;

        let statsFilter = sql``;
        let chartFilter = sql``;

        switch (period) {
            case 'today':
                statsFilter = sql`appointment_date = ${todayExpr}`;
                // Today evaluates the week for charts
                chartFilter = sql`appointment_date >= date_trunc('week', ${todayExpr})`;
                break;
            case 'week':
                statsFilter = sql`appointment_date >= date_trunc('week', ${todayExpr})`;
                chartFilter = statsFilter;
                break;
            case 'month':
                statsFilter = sql`appointment_date >= date_trunc('month', ${todayExpr})`;
                chartFilter = statsFilter;
                break;
            case 'year':
                statsFilter = sql`appointment_date >= date_trunc('year', ${todayExpr})`;
                chartFilter = statsFilter;
                break;
        }

        // 1. Staff Breakdown (Uses STRICT statsFilter)
        // Fetches staff-specific commission rate or falls back to company's default rate
        const staffQuery = sql`
            WITH staff_all AS (
                SELECT
                    u.id as staff_id,
                    u.first_name || ' ' || u.last_name as staff_name,
                    u.commission_rate as staff_commission_rate,
                    c.commission_rate as company_commission_rate
                FROM users u
                JOIN (
                    SELECT id as user_id FROM users WHERE company_id = ${companyId}
                    UNION
                    SELECT user_id FROM company_users WHERE company_id = ${companyId}
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
                WHERE a_in.company_id = ${companyId} AND a_in.status != 'cancelled' AND ${statsFilter}
            ) a ON sa.staff_id = a.staff_id OR EXISTS (SELECT 1 FROM appointment_services WHERE appointment_id = a.id AND staff_id = sa.staff_id)
            LEFT JOIN services s ON a.service_id = s.id
            GROUP BY sa.staff_id, sa.staff_name, sa.staff_commission_rate, sa.company_commission_rate
            ORDER BY count DESC
        `;

        // 2. Hourly Distribution (Uses chartFilter)
        const hourlyQuery = sql`
            SELECT
                EXTRACT(HOUR FROM start_time)::INTEGER as hour,
                COUNT(*) as count
            FROM appointments
            WHERE company_id = ${companyId} AND status != 'cancelled' AND ${chartFilter}
            GROUP BY hour
            ORDER BY hour
        `;

        // 3. Weekly Distribution (Uses chartFilter)
        const weeklyQuery = sql`
            SELECT
                TO_CHAR(appointment_date, 'Day') as day_name,
                EXTRACT(DOW FROM appointment_date) as day_index,
                COUNT(*) as count,
                SUM(COALESCE(a.original_price, a.price, s.price, 0)) as total_booked_value,
                SUM(CASE WHEN a.status IN ('completed', 'invoiced') THEN COALESCE(a.collected_price, a.price, s.price, 0) ELSE 0 END) as actual_collected
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.company_id = ${companyId} AND a.status != 'cancelled' AND ${chartFilter}
            GROUP BY day_name, day_index
            ORDER BY day_index
        `;

        // 4. Monthly Distribution (Uses chartFilter)
        const monthlyQuery = sql`
            SELECT
                TO_CHAR(appointment_date, 'Month') as month_name,
                EXTRACT(MONTH FROM appointment_date) as month_index,
                COUNT(*) as count,
                SUM(COALESCE(a.original_price, a.price, s.price, 0)) as total_booked_value,
                SUM(CASE WHEN a.status IN ('completed', 'invoiced') THEN COALESCE(a.collected_price, a.price, s.price, 0) ELSE 0 END) as actual_collected
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.company_id = ${companyId} AND a.status != 'cancelled' AND ${chartFilter}
            GROUP BY month_name, month_index
            ORDER BY month_index
        `;

        // 5. Department Breakdown
        const departmentQuery = sql`
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
                AND a.company_id = ${companyId} AND a.status != 'cancelled' AND ${statsFilter}
            LEFT JOIN services s ON a.service_id = s.id
            WHERE d.company_id = ${companyId}
            GROUP BY d.id, d.name
            ORDER BY actual_collected DESC
        `;

        const [staffRes, hourlyRes, weeklyRes, monthlyRes, deptRes] = await Promise.all([
            db.execute(staffQuery),
            db.execute(hourlyQuery),
            db.execute(weeklyQuery),
            db.execute(monthlyQuery),
            db.execute(departmentQuery)
        ]);

        const staffRows = (staffRes as any).rows as any[];
        const hourlyRows = (hourlyRes as any).rows as any[];
        const weeklyRows = (weeklyRes as any).rows as any[];
        const monthlyRows = (monthlyRes as any).rows as any[];
        const deptRows = (deptRes as any).rows as any[];

        return {
            staffStats: staffRows.map(r => {
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
            hourlyStats: hourlyRows.map(r => ({ hour: parseInt(r.hour), count: parseInt(r.count) })),
            weeklyStats: weeklyRows.map(r => ({ day: r.day_name.trim(), count: parseInt(r.count), total_booked_value: parseFloat(r.total_booked_value || 0), actual_collected: parseFloat(r.actual_collected || 0) })),
            monthlyStats: monthlyRows.map(r => ({ month: r.month_name.trim(), count: parseInt(r.count), total_booked_value: parseFloat(r.total_booked_value || 0), actual_collected: parseFloat(r.actual_collected || 0) })),
            departmentStats: deptRows.map(r => ({ ...r, count: parseInt(r.count), total_booked_value: parseFloat(r.total_booked_value || 0), actual_collected: parseFloat(r.actual_collected || 0) }))
        };
    }

    async getSuperAdminStats(localDate?: string) {
        const todayExpr = localDate ? sql`${localDate}::date` : sql`CURRENT_DATE`;

        // 1. Today's Summary
        const summaryQuery = sql`
            SELECT
                (SELECT COUNT(*) FROM companies WHERE created_at::date = ${todayExpr}) as new_companies_today,
                (SELECT COUNT(*) FROM appointments WHERE created_at::date = ${todayExpr}) as new_appointments_today,
                (SELECT COUNT(*) FROM users WHERE role = 'company_admin') as total_company_admins,
                (SELECT COUNT(*) FROM companies WHERE is_active = true) as total_active_companies
        `;
        const summaryRes = await db.execute(summaryQuery);
        const summaryRows = (summaryRes as any).rows as any[];

        // 2. License Expiry Check (Expiring in less than 30 days)
        // `license_end_date` kolonu Drizzle schema'da yok → raw SQL
        const expiringQuery = sql`
            SELECT
                id, name, license_end_date,
                EXTRACT(DAY FROM (license_end_date - CURRENT_TIMESTAMP))::INTEGER as days_left
            FROM companies
            WHERE license_end_date IS NOT NULL
            AND license_end_date > CURRENT_TIMESTAMP
            AND license_end_date < CURRENT_TIMESTAMP + INTERVAL '30 days'
            ORDER BY license_end_date ASC
        `;
        const expiringRes = await db.execute(expiringQuery);
        const expiringRows = (expiringRes as any).rows as any[];

        // 3. Last 7 Days Registration Trend
        const trendQuery = sql`
            SELECT
                TO_CHAR(d.day, 'DD/MM') as date,
                COALESCE(COUNT(c.id), 0) as company_count,
                COALESCE((SELECT COUNT(*) FROM appointments WHERE created_at::date = d.day), 0) as appointment_count
            FROM (
                SELECT generate_series(${todayExpr} - INTERVAL '6 days', ${todayExpr}, '1 day')::date as day
            ) d
            LEFT JOIN companies c ON c.created_at::date = d.day
            GROUP BY d.day
            ORDER BY d.day ASC
        `;
        const trendRes = await db.execute(trendQuery);
        const trendRows = (trendRes as any).rows as any[];

        return {
            summary: {
                new_companies_today: parseInt(summaryRows[0]?.new_companies_today),
                new_appointments_today: parseInt(summaryRows[0]?.new_appointments_today),
                total_company_admins: parseInt(summaryRows[0]?.total_company_admins),
                total_active_companies: parseInt(summaryRows[0]?.total_active_companies)
            },
            expiring_companies: expiringRows.map(r => ({
                ...r,
                days_left: parseInt(r.days_left)
            })),
            trends: trendRows.map(r => ({
                ...r,
                company_count: parseInt(r.company_count),
                appointment_count: parseInt(r.appointment_count)
            }))
        };
    }
}

export default new ReportService();
