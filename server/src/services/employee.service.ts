import { db } from '../db';
import { companyUsers, users, departments } from '../db/schema';
import { eq, or, and, ne, asc, sql } from 'drizzle-orm';

export interface Employee {
    id?: number;
    companyId: number;
    userId: number;
    role: 'owner' | 'manager' | 'staff';
    isActive: boolean;
    createdAt?: string;
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
     * Firmanın tüm çalışanlarını listele (users.company_id + company_users JOIN).
     */
    async getEmployeesByCompany(companyId: number): Promise<Employee[]> {
        return (await db
            .select({
                userId: users.id,
                companyId: users.companyId,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                phone: users.phone,
                role: users.role,
                photo: users.photo,
                departmentId: users.departmentId,
                quantity: users.quantity,
                unit: users.unit,
                departmentName: departments.name,
                isActive: sql<boolean>`COALESCE(${users.isActive}, true)`,
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
                    ne(users.role, 'company_admin'),
                    ne(users.role, 'super_admin'),
                    ne(users.role, 'customer')
                )
            )
            .orderBy(asc(users.firstName))) as Employee[];
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
