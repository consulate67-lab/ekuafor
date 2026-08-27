import { pgTable, serial, integer, bigint, smallint, varchar, text, boolean, timestamp, time, date, numeric, decimal, jsonb, json, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { companies } from './core';
import { users } from './core';

/**
 * services tablosu
 */
export const services = pgTable('services', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    durationMinutes: integer('duration_minutes').notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    isActive: boolean('is_active'),
    departmentId: integer('department_id'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
});

/**
 * packages tablosu
 */
export const packages = pgTable('packages', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    durationMinutes: integer('duration_minutes').notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    isActive: boolean('is_active'),
    staffId: integer('staff_id').references(() => users.id),
    departmentId: integer('department_id'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
});

/**
 * package_services tablosu
 */
export const packageServices = pgTable('package_services', {
    id: serial('id').primaryKey(),
    packageId: integer('package_id').references(() => packages.id),
    serviceId: integer('service_id').references(() => services.id),
    staffId: integer('staff_id').references(() => users.id),
    departmentId: integer('department_id'),
    orderIndex: text('order_index')
});

/**
 * working_hours tablosu
 */
export const workingHours = pgTable('working_hours', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    dayOfWeek: text('day_of_week').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    isActive: boolean('is_active'),
    createdAt: timestamp('created_at', { withTimezone: true })
});
