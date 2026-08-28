import { db } from '../db';
import { services, departments } from '../db/schema';
import { and, eq, asc } from 'drizzle-orm';
import redis from '../config/redis';

export interface Service {
    id?: number;
    company_id: number;
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    is_active?: boolean;
    department_id?: number | null;
    quantity?: number | null;
    unit?: string | null;
    photo?: string | null;
    department_name?: string | null;
}

class ServiceService {
    private async clearCompanyCache() {
        if (!redis) return;
        try {
            const keys = await redis.keys('companies:list:*');
            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`[Redis] ServiceService cleared ${keys.length} cache keys`);
            }
        } catch (err) {
            console.error('[Redis] ServiceService cache clear error:', err);
        }
    }

    /**
     * Drizzle row → Service interface dönüşümü (camelCase → snake_case).
     * Schema'da olmayan alanlar (quantity/unit/photo) DB'de tutulmuyor;
     * public API'yi korumak için interface'de opsiyonel bırakıldı.
     */
    private mapRow(row: any): Service {
        return {
            id: row.id,
            company_id: row.companyId,
            name: row.name,
            description: row.description,
            duration_minutes: row.durationMinutes,
            price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
            is_active: row.isActive,
            department_id: row.departmentId,
            department_name: row.departmentName ?? null,
        };
    }

    async createService(service: Service): Promise<Service> {
        const [created] = await db
            .insert(services)
            .values({
                companyId: service.company_id,
                name: service.name,
                description: service.description ?? null,
                durationMinutes: service.duration_minutes,
                price: String(service.price),
                departmentId: service.department_id ?? null,
            })
            .returning();
        await this.clearCompanyCache();
        return this.mapRow(created);
    }

    async getServicesByCompany(companyId: number): Promise<Service[]> {
        const rows = await db
            .select({
                id: services.id,
                companyId: services.companyId,
                name: services.name,
                description: services.description,
                durationMinutes: services.durationMinutes,
                price: services.price,
                isActive: services.isActive,
                departmentId: services.departmentId,
                departmentName: departments.name,
            })
            .from(services)
            .leftJoin(departments, eq(services.departmentId, departments.id))
            .where(and(eq(services.companyId, companyId), eq(services.isActive, true)))
            .orderBy(asc(services.name));
        return rows.map(r => this.mapRow(r));
    }

    async updateService(id: number, service: Partial<Service>): Promise<Service | null> {
        const updates: Record<string, any> = {};
        if (service.name !== undefined) updates.name = service.name;
        if (service.description !== undefined) updates.description = service.description;
        if (service.duration_minutes !== undefined) updates.durationMinutes = service.duration_minutes;
        if (service.price !== undefined) updates.price = String(service.price);
        if (service.is_active !== undefined) updates.isActive = service.is_active;
        if (service.department_id !== undefined) updates.departmentId = service.department_id;

        if (Object.keys(updates).length === 0) return null;

        const [updated] = await db
            .update(services)
            .set(updates)
            .where(eq(services.id, id))
            .returning();

        if (updated) await this.clearCompanyCache();
        return updated ? this.mapRow(updated) : null;
    }

    async deleteService(id: number): Promise<boolean> {
        const result = await db
            .update(services)
            .set({ isActive: false })
            .where(eq(services.id, id))
            .returning({ id: services.id });
        if (result.length > 0) await this.clearCompanyCache();
        return result.length > 0;
    }
}

export default new ServiceService();
