import { db } from '../db';
import { companyUsers, users, departments } from '../db/schema';
import { eq, or, and, asc, sql } from 'drizzle-orm';

export interface Employee {
    id?: number;
    companyId: number;
    userId: number;
    role: 'owner' | 'manager' | 'staff';
    isActive: boolean;
    createdAt?: Date | null;
    // Join alanları
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    departmentId?: number | null;
    departmentName?: string | null;
}

/**
 * Çalışan (Employee) servisi — Drizzle ORM.
 *
 * ESKİ: raw pg.query() + parametreli SQL
 * YENİ: Drizzle query builder + type-safe schema
 *
 * Pattern: pg.query() → db.select() / db.insert() / db.update()
 * - WHERE clause'lar `eq()`, `and()`, `or()`, `ne()` ile yazılır
 * - JOIN'ler `.leftJoin(table, on)` ile yazılır
 * - RETURNING clause `.returning()` ile
 */
class EmployeeService {
    /**
     * Firmaya çalışan ekle.
     */
    async addEmployee(companyId: number, userId: number, role: 'owner' | 'manager' | 'staff' = 'staff'): Promise<Employee> {
        const [employee] = await db
            .insert(companyUsers)
            .values({ companyId, userId, role })
            .returning();
        return employee as Employee;
    }

    /**
     * Randevu alınabilen çalışanlar (users.company_id + company_users JOIN). Public uç noktada
     * kullanıldığı için iletişim bilgisi döndürülmez.
     */
    async getEmployeesByCompany(companyId: number) {
        return db
            .selectDistinct({
                id: users.id,
                user_id: users.id,
                company_id: users.companyId,
                first_name: users.firstName,
                last_name: users.lastName,
                role: users.role,
                title: users.title,
                photo: users.photo,
                department_id: users.departmentId,
                department_name: departments.name,
            })
            .from(users)
            .leftJoin(departments, eq(users.departmentId, departments.id))
            .leftJoin(
                companyUsers,
                and(
                    eq(companyUsers.userId, users.id),
                    eq(companyUsers.companyId, companyId)
                )
            )
            .where(
                and(
                    or(
                        eq(users.companyId, companyId),
                        eq(companyUsers.companyId, companyId)
                    ),
                    eq(users.role, 'staff'),
                    sql`COALESCE(${users.isActive}, true)`
                )
            )
            .orderBy(asc(users.firstName));
    }

    /**
     * Çalışanı firmadan çıkar (soft delete — isActive=false).
     */
    async removeEmployee(companyId: number, employeeId: number): Promise<boolean> {
        const result = await db
            .update(companyUsers)
            .set({ isActive: false })
            .where(
                and(
                    eq(companyUsers.companyId, companyId),
                    eq(companyUsers.id, employeeId)
                )
            )
            .returning({ id: companyUsers.id });
        return result.length > 0;
    }

    /**
     * Çalışan rolünü güncelle.
     */
    async updateEmployeeRole(companyId: number, employeeId: number, role: string): Promise<Employee | null> {
        const [employee] = await db
            .update(companyUsers)
            .set({ role })
            .where(
                and(
                    eq(companyUsers.companyId, companyId),
                    eq(companyUsers.id, employeeId)
                )
            )
            .returning();
        return (employee as Employee) || null;
    }
}

export default new EmployeeService();
