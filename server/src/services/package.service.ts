import { db } from '../db';
import { packages, packageServices, services, users, departments } from '../db/schema';
import { eq, and, sql, asc } from 'drizzle-orm';

export interface Package {
    id?: number | null;
    company_id: number;
    name: string;
    description?: string | null;
    duration_minutes: number;
    price: number;
    is_active?: boolean;
    staff_id?: number | null;
    department_id?: number | null;
    services?: any[];
}

export interface PackageServiceItem {
    id?: number;
    service_id: number;
    staff_id?: number | null;
    department_id?: number | null;
    order_index?: number;
}

class PackageService {
    async createPackage(pkg: Package, items: PackageServiceItem[]): Promise<Package> {
        return await db.transaction(async (tx) => {
            const [newPackage] = await tx
                .insert(packages)
                .values({
                    companyId: pkg.company_id,
                    name: pkg.name,
                    description: pkg.description,
                    durationMinutes: pkg.duration_minutes,
                    price: pkg.price as any,
                    staffId: pkg.staff_id || null,
                    departmentId: pkg.department_id || null,
                    isActive: true
                })
                .returning({
                    id: packages.id,
                    company_id: packages.companyId,
                    name: packages.name,
                    description: packages.description,
                    duration_minutes: packages.durationMinutes,
                    price: packages.price,
                    staff_id: packages.staffId,
                    department_id: packages.departmentId,
                    is_active: packages.isActive
                });

            if (items && items.length > 0) {
                await tx.insert(packageServices).values(
                    items.map((item, i) => ({
                        packageId: newPackage.id,
                        serviceId: item.service_id,
                        staffId: item.staff_id || null,
                        departmentId: item.department_id || null,
                        orderIndex: String(i)
                    }))
                );
            }

            return newPackage as unknown as Package;
        });
    }

    async getPackagesByCompany(companyId: number): Promise<Package[]> {
        // json_agg içeren karmaşık JOIN + aggregation — raw SQL template ile çözüldü.
        // Drizzle query builder'da json_agg doğrudan desteği yok.
        const result = await db.execute(sql`
            SELECT p.*,
                   u.first_name as staff_first_name, u.last_name as staff_last_name,
                   d.name as department_name,
                   json_agg(json_build_object(
                       'id', s.id,
                       'name', s.name,
                       'duration_minutes', s.duration_minutes,
                       'price', s.price,
                       'staff_id', ps.staff_id,
                       'staff_name', su.first_name || ' ' || su.last_name,
                       'department_id', ps.department_id
                   ) ORDER BY ps.order_index) as services
            FROM packages p
            LEFT JOIN package_services ps ON p.id = ps.package_id
            LEFT JOIN services s ON ps.service_id = s.id
            LEFT JOIN users su ON ps.staff_id = su.id
            LEFT JOIN users u ON p.staff_id = u.id
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.company_id = ${companyId} AND p.is_active = true
            GROUP BY p.id, u.id, d.id, u.first_name, u.last_name, d.name
            ORDER BY p.name
        `);
        const rows = (result as any).rows ?? result;
        return Array.isArray(rows) ? (rows as unknown as Package[]) : [];
    }

    async updatePackage(id: number, pkg: Partial<Package>, items?: PackageServiceItem[]): Promise<Package | null> {
        await db.transaction(async (tx) => {
            const { services: _services, ...pkgData } = pkg;

            const setObj: Record<string, any> = {};
            if (pkgData.name !== undefined) setObj.name = pkgData.name;
            if (pkgData.description !== undefined) setObj.description = pkgData.description;
            if (pkgData.duration_minutes !== undefined) setObj.durationMinutes = pkgData.duration_minutes;
            if (pkgData.price !== undefined) setObj.price = pkgData.price;
            if (pkgData.staff_id !== undefined) setObj.staffId = pkgData.staff_id;
            if (pkgData.department_id !== undefined) setObj.departmentId = pkgData.department_id;
            if (pkgData.is_active !== undefined) setObj.isActive = pkgData.is_active;

            if (Object.keys(setObj).length > 0) {
                await tx.update(packages).set(setObj).where(eq(packages.id, id));
            }

            if (items) {
                // Remove old services
                await tx.delete(packageServices).where(eq(packageServices.packageId, id));
                // Add new services
                if (items.length > 0) {
                    await tx.insert(packageServices).values(
                        items.map((item, i) => ({
                            packageId: id,
                            serviceId: item.service_id,
                            staffId: item.staff_id || null,
                            departmentId: item.department_id || null,
                            orderIndex: String(i)
                        }))
                    );
                }
            }
        });

        // Fetch updated package with services
        const updated = await this.getPackageById(id);
        return updated;
    }

    async getPackageById(id: number): Promise<Package | null> {
        // json_agg içeren karmaşık JOIN + aggregation — raw SQL template ile çözüldü.
        const result = await db.execute(sql`
            SELECT p.*,
                   u.first_name as staff_first_name, u.last_name as staff_last_name,
                   d.name as department_name,
                   json_agg(json_build_object(
                       'id', s.id,
                       'name', s.name,
                       'duration_minutes', s.duration_minutes,
                       'price', s.price,
                       'staff_id', ps.staff_id,
                       'staff_name', su.first_name || ' ' || su.last_name,
                       'department_id', ps.department_id
                   ) ORDER BY ps.order_index) as services
            FROM packages p
            LEFT JOIN package_services ps ON p.id = ps.package_id
            LEFT JOIN services s ON ps.service_id = s.id
            LEFT JOIN users su ON ps.staff_id = su.id
            LEFT JOIN users u ON p.staff_id = u.id
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.id = ${id}
            GROUP BY p.id, u.id, d.id, u.first_name, u.last_name, d.name
        `);
        const rows = (result as any).rows ?? result;
        return Array.isArray(rows) ? ((rows[0] as unknown as Package) || null) : null;
    }

    async deletePackage(id: number): Promise<boolean> {
        const result = await db
            .update(packages)
            .set({ isActive: false })
            .where(eq(packages.id, id))
            .returning({ id: packages.id });
        return result.length > 0;
    }
}

export default new PackageService();
