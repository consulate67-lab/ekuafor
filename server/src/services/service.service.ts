import { db } from '../db';
import { services, departments, serviceResources, resources } from '../db/schema';
import { and, eq, asc, inArray } from 'drizzle-orm';
import redis from '../config/redis';

export type BookingMode = 'staff' | 'resource' | 'class';

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
    booking_mode?: BookingMode;
    duration_options?: number[] | null;
    resource_ids?: number[];
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

    /** Drizzle row → Service (camelCase → snake_case, public API biçimi). */
    private mapRow(row: any, resourceIds: number[] = []): Service {
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
            quantity: row.quantity === null || row.quantity === undefined ? null : Number(row.quantity),
            unit: row.unit ?? null,
            photo: row.photo ?? null,
            booking_mode: row.bookingMode,
            duration_options: row.durationOptions ?? null,
            resource_ids: resourceIds,
        };
    }

    private async getResourceIds(serviceIds: number[]): Promise<Map<number, number[]>> {
        const map = new Map<number, number[]>();
        if (serviceIds.length === 0) return map;
        const rows = await db.select().from(serviceResources).where(inArray(serviceResources.serviceId, serviceIds));
        for (const r of rows) map.set(r.serviceId, [...(map.get(r.serviceId) || []), r.resourceId]);
        return map;
    }

    /** Hizmetin kaynak bağlantılarını verilen listeyle değiştirir; başka firmanın kaynakları yok sayılır. */
    private async setResourceIds(serviceId: number, companyId: number, resourceIds: number[]) {
        await db.delete(serviceResources).where(eq(serviceResources.serviceId, serviceId));
        if (resourceIds.length === 0) return;
        const owned = await db.select({ id: resources.id }).from(resources)
            .where(and(eq(resources.companyId, companyId), inArray(resources.id, resourceIds)));
        if (owned.length > 0) {
            await db.insert(serviceResources).values(owned.map(r => ({ serviceId, resourceId: r.id })));
        }
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
                quantity: service.quantity === null || service.quantity === undefined ? null : String(service.quantity),
                unit: service.unit ?? null,
                photo: service.photo ?? null,
                bookingMode: service.booking_mode ?? 'staff',
                durationOptions: service.duration_options?.length ? service.duration_options : null,
            })
            .returning();
        if (service.resource_ids) await this.setResourceIds(created.id, service.company_id, service.resource_ids);
        await this.clearCompanyCache();
        return this.mapRow(created, service.resource_ids ?? []);
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
                quantity: services.quantity,
                unit: services.unit,
                photo: services.photo,
                bookingMode: services.bookingMode,
                durationOptions: services.durationOptions,
            })
            .from(services)
            .leftJoin(departments, eq(services.departmentId, departments.id))
            .where(and(eq(services.companyId, companyId), eq(services.isActive, true)))
            .orderBy(asc(services.name));
        const resourceIds = await this.getResourceIds(rows.map(r => r.id));
        return rows.map(r => this.mapRow(r, resourceIds.get(r.id)));
    }

    async updateService(id: number, service: Partial<Service>): Promise<Service | null> {
        const updates: Record<string, any> = {};
        if (service.name !== undefined) updates.name = service.name;
        if (service.description !== undefined) updates.description = service.description;
        if (service.duration_minutes !== undefined) updates.durationMinutes = service.duration_minutes;
        if (service.price !== undefined) updates.price = String(service.price);
        if (service.is_active !== undefined) updates.isActive = service.is_active;
        if (service.department_id !== undefined) updates.departmentId = service.department_id;
        if (service.quantity !== undefined) updates.quantity = service.quantity === null ? null : String(service.quantity);
        if (service.unit !== undefined) updates.unit = service.unit;
        if (service.photo !== undefined) updates.photo = service.photo;
        if (service.booking_mode !== undefined) updates.bookingMode = service.booking_mode;
        if (service.duration_options !== undefined) updates.durationOptions = service.duration_options?.length ? service.duration_options : null;

        if (Object.keys(updates).length === 0 && service.resource_ids === undefined) return null;

        const [updated] = Object.keys(updates).length > 0
            ? await db.update(services).set(updates).where(eq(services.id, id)).returning()
            : await db.select().from(services).where(eq(services.id, id));
        if (!updated) return null;

        if (service.resource_ids !== undefined) await this.setResourceIds(id, updated.companyId!, service.resource_ids);
        await this.clearCompanyCache();
        const resourceIds = await this.getResourceIds([id]);
        return this.mapRow(updated, resourceIds.get(id));
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
