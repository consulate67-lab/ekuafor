import { pgTable, serial, integer, bigint, smallint, varchar, text, boolean, timestamp, time, date, numeric, decimal, jsonb, json, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { companies } from './core';

/**
 * sms_settings tablosu
 */
export const smsSettings = pgTable('sms_settings', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    provider: varchar('provider', { length: 50 }),
    apiUrl: text('api_url').notNull(),
    apiKey: text('api_key'),
    senderId: varchar('sender_id', { length: 50 }),
    isActive: boolean('is_active'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
});

/**
 * sms_logs tablosu
 */
export const smsLogs = pgTable('sms_logs', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    message: text('message').notNull(),
    status: varchar('status', { length: 20 }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true })
});

/**
 * otp_codes tablosu
 */
export const otpCodes = pgTable('otp_codes', {
    id: serial('id').primaryKey(),
    phone: varchar('phone', { length: 20 }).notNull(),
    code: varchar('code', { length: 6 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    isUsed: boolean('is_used'),
    createdAt: timestamp('created_at', { withTimezone: true })
});

/**
 * customer_devices tablosu
 */
export const customerDevices = pgTable('customer_devices', {
    id: serial('id').primaryKey(),
    deviceId: varchar('device_id', { length: 255 }).notNull().unique(),
    customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
    pushToken: varchar('push_token', { length: 255 }),
    lastSync: timestamp('last_sync', { withTimezone: true })
});

/**
 * push_logs tablosu
 */
export const pushLogs = pgTable('push_logs', {
    id: serial('id').primaryKey(),
    phoneNumber: varchar('phone_number', { length: 20 }),
    title: text('title'),
    body: text('body'),
    status: varchar('status', { length: 20 }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true })
});

/**
 * callback_logs tablosu
 */
export const callbackLogs = pgTable('callback_logs', {
    id: serial('id').primaryKey(),
    method: varchar('method', { length: 10 }),
    url: text('url'),
    headers: text('headers'),
    allData: text('all_data'),
    detectedGsm: varchar('detected_gsm', { length: 50 }),
    detectedMsg: text('detected_msg'),
    result: text('result'),
    createdAt: timestamp('created_at', { withTimezone: true })
});
