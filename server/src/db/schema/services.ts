import { pgTable, foreignKey, check, primaryKey, serial, integer, time, varchar, text, numeric, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { companies } from './core';

/**
 * services tablosu
 */
export const services = pgTable('services', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id'),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    durationMinutes: integer('duration_minutes').notNull(),
    price: numeric({ precision: 10, scale: 2 }).notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
    departmentId: integer('department_id'),
    quantity: numeric(),
    unit: varchar({ length: 30 }),
    photo: text(),
    /** staff: çalışanın zamanı · resource: saha/kulvar/oda · class: grup dersi seansında yer */
    bookingMode: varchar('booking_mode', { length: 10 }).default('staff').notNull(),
    /** Müşterinin seçebileceği süreler (örn. halı saha 60/90/120); boşsa sadece duration_minutes */
    durationOptions: integer('duration_options').array(),
}, (table) => {
    return {
        servicesCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'services_company_id_fkey'
        }).onDelete('cascade'),
        servicesBookingModeCheck: check('services_booking_mode_check', sql`booking_mode IN ('staff', 'resource', 'class')`),
    }
});

/**
 * working_hours tablosu
 */
export const workingHours = pgTable('working_hours', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id'),
    dayOfWeek: integer('day_of_week').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
    return {
        workingHoursCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'working_hours_company_id_fkey'
        }).onDelete('cascade'),
        workingHoursDayOfWeekCheck: check('working_hours_day_of_week_check', sql`(day_of_week >= 0) AND (day_of_week <= 6)`),
    }
});
