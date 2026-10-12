import { pgTable, index, foreignKey, check, primaryKey, serial, integer, date, time, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { users, companies } from './core';
import { services } from './services';

/**
 * resources tablosu — rezerve edilebilen saha, kulvar, oda, kort...
 * Bir kaynak aynı anda tek rezervasyon alır.
 */
export const resources = pgTable('resources', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id').notNull(),
    name: varchar({ length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 30 }).default('room').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
    return {
        idxResourcesCompany: index('idx_resources_company').using('btree', table.companyId),
        resourcesCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'resources_company_id_fkey'
        }).onDelete('cascade'),
    }
});

/**
 * service_resources tablosu — hizmetin verilebildiği kaynaklar.
 * `resource` tipindeki bir hizmetin hiç bağlantısı yoksa firmanın tüm aktif kaynakları kullanılır.
 */
export const serviceResources = pgTable('service_resources', {
    serviceId: integer('service_id').notNull(),
    resourceId: integer('resource_id').notNull(),
}, (table) => {
    return {
        serviceResourcesPkey: primaryKey({ columns: [table.serviceId, table.resourceId], name: 'service_resources_pkey' }),
        idxServiceResourcesResource: index('idx_service_resources_resource').using('btree', table.resourceId),
        serviceResourcesServiceIdFkey: foreignKey({
            columns: [table.serviceId],
            foreignColumns: [services.id],
            name: 'service_resources_service_id_fkey'
        }).onDelete('cascade'),
        serviceResourcesResourceIdFkey: foreignKey({
            columns: [table.resourceId],
            foreignColumns: [resources.id],
            name: 'service_resources_resource_id_fkey'
        }).onDelete('cascade'),
    }
});

/**
 * class_sessions tablosu — grup dersi seansları (pilates, yüzme kursu...).
 * Haftalık tekrar eden seanslar aynı `series_id` ile ayrı satırlar olarak tutulur.
 */
export const classSessions = pgTable('class_sessions', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id').notNull(),
    serviceId: integer('service_id').notNull(),
    staffId: integer('staff_id'),
    resourceId: integer('resource_id'),
    sessionDate: date('session_date').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    capacity: integer().notNull(),
    status: varchar({ length: 20 }).default('scheduled').notNull(),
    seriesId: varchar('series_id', { length: 36 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
    return {
        idxClassSessionsCompanyDate: index('idx_class_sessions_company_date').using('btree', table.companyId, table.sessionDate),
        idxClassSessionsSeries: index('idx_class_sessions_series').using('btree', table.seriesId),
        classSessionsCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'class_sessions_company_id_fkey'
        }).onDelete('cascade'),
        classSessionsServiceIdFkey: foreignKey({
            columns: [table.serviceId],
            foreignColumns: [services.id],
            name: 'class_sessions_service_id_fkey'
        }).onDelete('cascade'),
        classSessionsStaffIdFkey: foreignKey({
            columns: [table.staffId],
            foreignColumns: [users.id],
            name: 'class_sessions_staff_id_fkey'
        }).onDelete('set null'),
        classSessionsResourceIdFkey: foreignKey({
            columns: [table.resourceId],
            foreignColumns: [resources.id],
            name: 'class_sessions_resource_id_fkey'
        }).onDelete('set null'),
        classSessionsCapacityCheck: check('class_sessions_capacity_check', sql`capacity > 0`),
        classSessionsTimeCheck: check('class_sessions_time_check', sql`end_time > start_time`),
        classSessionsStatusCheck: check('class_sessions_status_check', sql`status IN ('scheduled', 'cancelled')`),
    }
});
