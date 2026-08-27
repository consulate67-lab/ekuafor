import { pgTable, serial, integer, bigint, smallint, varchar, text, boolean, timestamp, time, date, numeric, decimal, jsonb, json, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { companies } from './core';
import { users } from './core';
import { services } from './services';

/**
 * appointments tablosu
 */
export const appointments = pgTable('appointments', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    customerId: integer('customer_id').references(() => users.id),
    serviceId: integer('service_id').references(() => services.id),
    staffId: integer('staff_id').references(() => users.id),
    appointmentDate: date('appointment_date').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    status: varchar('status', { length: 50 }),
    notes: text('notes'),
    price: decimal('price', { precision: 10, scale: 2 }),
    paymentStatus: varchar('payment_status', { length: 50 }),
    paymentMethod: varchar('payment_method', { length: 50 }),
    customerPhone: varchar('customer_phone', { length: 20 }),
    customerName: varchar('customer_name', { length: 255 }),
    deviceId: varchar('device_id', { length: 255 }),
    rating: text('rating'),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
});

/**
 * appointment_services tablosu
 */
export const appointmentServices = pgTable('appointment_services', {
    id: serial('id').primaryKey(),
    appointmentId: integer('appointment_id').references(() => appointments.id),
    serviceId: integer('service_id').references(() => services.id),
    price: decimal('price', { precision: 10, scale: 2 }),
    durationMinutes: integer('duration_minutes'),
    staffId: integer('staff_id').references(() => users.id),
    status: varchar('status', { length: 20 }),
    startTime: varchar('start_time', { length: 5 }),
    endTime: varchar('end_time', { length: 5 }),
    createdAt: timestamp('created_at', { withTimezone: true })
});
