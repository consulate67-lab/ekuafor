import { db } from '../db';
import { companies } from '../db/schema';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import redis from '../config/redis';

export interface MainCompany {
    id?: number;
    name: string;
    description?: string;
    address_line?: string;
    city?: string;
    district?: string;
    admin_code: string;
    board_key?: string;
    is_active?: boolean;
    created_at?: Date;
}

class MainCompanyService {
    private async clearCompanyCache() {
        if (!redis) return;
        try {
            const keys = await redis.keys('companies:list:*');
            keys.push('main_companies:all');
            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`[Redis] MainCompanyService cleared ${keys.length} cache keys`);
            }
        } catch (err) {
            console.error('[Redis] MainCompanyService cache clear error:', err);
        }
    }

    async create(data: any): Promise<MainCompany> {
        const [row] = await db
            .insert(companies)
            .values({
                name: data.name,
                description: data.description,
                addressLine: data.address_line,
                city: data.city,
                district: data.district,
                adminKey: data.admin_key || data.admin_code,
                boardKey: data.board_key,
                companyType: 'ÜST FİRMA'
            })
            .returning({
                id: companies.id,
                name: companies.name,
                description: companies.description,
                address_line: companies.addressLine,
                city: companies.city,
                district: companies.district,
                admin_code: companies.adminKey,
                board_key: companies.boardKey,
                is_active: companies.isActive,
                created_at: companies.createdAt
            });
        await this.clearCompanyCache();
        return row as MainCompany;
    }

    async getAll(): Promise<MainCompany[]> {
        const cacheKey = 'main_companies:all';
        if (redis) {
            const cached = await redis.get(cacheKey);
            if (cached) return JSON.parse(cached);
        }

        const data = await db
            .select({
                id: companies.id,
                name: companies.name,
                description: companies.description,
                address_line: companies.addressLine,
                city: companies.city,
                district: companies.district,
                admin_code: companies.adminKey,
                is_active: companies.isActive,
                created_at: companies.createdAt
            })
            .from(companies)
            .where(eq(companies.companyType, 'ÜST FİRMA'))
            .orderBy(desc(companies.createdAt));

        if (redis && data.length > 0) {
            await redis.setex(cacheKey, 3600, JSON.stringify(data)); // 1 hour cache
        }
        return data as MainCompany[];
    }

    async getById(id: number): Promise<MainCompany | null> {
        const [row] = await db
            .select({
                id: companies.id,
                name: companies.name,
                description: companies.description,
                address_line: companies.addressLine,
                city: companies.city,
                district: companies.district,
                admin_code: companies.adminKey,
                is_active: companies.isActive,
                created_at: companies.createdAt
            })
            .from(companies)
            .where(
                and(
                    eq(companies.id, id),
                    eq(companies.companyType, 'ÜST FİRMA')
                )
            );
        return (row as MainCompany) || null;
    }

    async getByAdminCode(code: string): Promise<MainCompany | null> {
        const [row] = await db
            .select({
                id: companies.id,
                name: companies.name,
                description: companies.description,
                address_line: companies.addressLine,
                city: companies.city,
                district: companies.district,
                admin_code: companies.adminKey,
                is_active: companies.isActive,
                created_at: companies.createdAt
            })
            .from(companies)
            .where(
                and(
                    eq(companies.adminKey, code),
                    eq(companies.companyType, 'ÜST FİRMA')
                )
            );
        return (row as MainCompany) || null;
    }

    async update(id: number, data: Partial<MainCompany>): Promise<MainCompany | null> {
        // Map admin_code back to admin_key if present
        const dbData: any = { ...data };
        if (dbData.admin_code !== undefined) {
            dbData.admin_key = dbData.admin_code;
            delete dbData.admin_code;
        }

        const setObj: Record<string, any> = {};
        if (dbData.name !== undefined) setObj.name = dbData.name;
        if (dbData.description !== undefined) setObj.description = dbData.description;
        if (dbData.address_line !== undefined) setObj.addressLine = dbData.address_line;
        if (dbData.city !== undefined) setObj.city = dbData.city;
        if (dbData.district !== undefined) setObj.district = dbData.district;
        if (dbData.admin_key !== undefined) setObj.adminKey = dbData.admin_key;
        if (dbData.board_key !== undefined) setObj.boardKey = dbData.board_key;
        if (dbData.is_active !== undefined) setObj.isActive = dbData.is_active;

        if (Object.keys(setObj).length === 0) return null;

        const [row] = await db
            .update(companies)
            .set(setObj)
            .where(
                and(
                    eq(companies.id, id),
                    eq(companies.companyType, 'ÜST FİRMA')
                )
            )
            .returning({
                id: companies.id,
                name: companies.name,
                description: companies.description,
                address_line: companies.addressLine,
                city: companies.city,
                district: companies.district,
                admin_code: companies.adminKey,
                board_key: companies.boardKey,
                is_active: companies.isActive,
                created_at: companies.createdAt
            });
        if (row) await this.clearCompanyCache();
        return (row as MainCompany) || null;
    }

    async getBranches(mainCompanyId: number): Promise<any[]> {
        return await db
            .select({
                id: companies.id,
                name: companies.name,
                city: companies.city,
                district: companies.district,
                latitude: companies.latitude,
                longitude: companies.longitude,
                is_active: companies.isActive
            })
            .from(companies)
            .where(eq(companies.mainCompanyId, mainCompanyId))
            .orderBy(asc(companies.name));
    }

    async getStats(mainCompanyId: number): Promise<any> {
        // Karmaşık aggregations (COUNT/SUM/CASE) için raw SQL template kullanılır.
        const result = await db.execute(sql`
            SELECT
                COUNT(a.id) as total_appointments,
                COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
                COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.price ELSE 0 END), 0) as total_revenue,
                (SELECT COUNT(*) FROM companies WHERE main_company_id = ${mainCompanyId}) as branch_count,
                COUNT(DISTINCT COALESCE(a.customer_phone, a.device_id, a.customer_name)) as unique_customers
            FROM appointments a
            JOIN companies c ON a.company_id = c.id
            WHERE c.main_company_id = ${mainCompanyId} AND a.status != 'cancelled'
        `);
        return (result as any).rows?.[0] ?? (Array.isArray(result) ? (result as any)[0] : null);
    }

    async getByBoardKey(key: string): Promise<MainCompany | null> {
        const [row] = await db
            .select({
                id: companies.id,
                name: companies.name,
                description: companies.description,
                address_line: companies.addressLine,
                city: companies.city,
                district: companies.district,
                admin_code: companies.adminKey,
                board_key: companies.boardKey,
                is_active: companies.isActive,
                created_at: companies.createdAt
            })
            .from(companies)
            .where(
                and(
                    eq(companies.boardKey, key),
                    eq(companies.companyType, 'ÜST FİRMA')
                )
            );
        return (row as MainCompany) || null;
    }

    async getBranchPerformance(mainCompanyId: number): Promise<any[]> {
        // GROUP BY + çoklu aggregations — raw SQL template ile çözüldü.
        const result = await db.execute(sql`
            SELECT
                c.id as branch_id,
                c.name as branch_name,
                c.city,
                c.district,
                c.latitude,
                c.longitude,
                COUNT(a.id) as appointment_count,
                COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.price ELSE 0 END), 0) as revenue
            FROM companies c
            LEFT JOIN appointments a ON a.company_id = c.id AND a.status != 'cancelled'
            WHERE c.main_company_id = ${mainCompanyId}
            GROUP BY c.id, c.name, c.city, c.district, c.latitude, c.longitude
            ORDER BY revenue DESC
        `);
        const rows = (result as any).rows ?? result;
        return Array.isArray(rows) ? rows : [];
    }

    async delete(id: number): Promise<boolean> {
        const result = await db.transaction(async (tx) => {
            // 1. Decouple branches
            await tx
                .update(companies)
                .set({ mainCompanyId: null })
                .where(eq(companies.mainCompanyId, id));

            // 2. Delete the main company
            const deleted = await tx
                .delete(companies)
                .where(
                    and(
                        eq(companies.id, id),
                        eq(companies.companyType, 'ÜST FİRMA')
                    )
                )
                .returning({ id: companies.id });

            return deleted.length > 0;
        });

        if (result) await this.clearCompanyCache();
        return result;
    }
}

export default new MainCompanyService();
