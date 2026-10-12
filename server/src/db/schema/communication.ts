import { pgTable, index, foreignKey, unique, primaryKey, serial, integer, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { companies } from './core';

/**
 * sms_settings tablosu
 */
export const smsSettings = pgTable('sms_settings', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id'),
    provider: varchar({ length: 50 }).default('local_gateway'),
    apiUrl: text('api_url').notNull(),
    apiKey: text('api_key'),
    senderId: varchar('sender_id', { length: 50 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
    return {
        smsSettingsCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'sms_settings_company_id_fkey'
        }).onDelete('cascade'),
        smsSettingsCompanyIdKey: unique('sms_settings_company_id_key').on(table.companyId),
    }
});

/**
 * sms_logs tablosu
 */
export const smsLogs = pgTable('sms_logs', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id'),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    message: text().notNull(),
    status: varchar({ length: 20 }).default('pending'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
    return {
        smsLogsCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'sms_logs_company_id_fkey'
        }).onDelete('cascade'),
    }
});

/**
 * otp_codes tablosu
 */
export const otpCodes = pgTable('otp_codes', {
    id: serial().primaryKey().notNull(),
    phone: varchar({ length: 20 }).notNull(),
    code: varchar({ length: 6 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    isUsed: boolean('is_used').default(false),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});

/**
 * customer_devices tablosu
 */
export const customerDevices = pgTable('customer_devices', {
    id: serial().primaryKey().notNull(),
    deviceId: varchar('device_id', { length: 255 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
    lastSync: timestamp('last_sync').default(sql`CURRENT_TIMESTAMP`),
    pushToken: varchar('push_token', { length: 255 }),
}, (table) => {
    return {
        idxCustomerDevicesId: index('idx_customer_devices_id').using('btree', table.deviceId.asc().nullsLast().op('text_ops')),
        idxCustomerDevicesPhone: index('idx_customer_devices_phone').using('btree', table.customerPhone.asc().nullsLast().op('text_ops')),
        customerDevicesDeviceIdKey: unique('customer_devices_device_id_key').on(table.deviceId),
    }
});

/**
 * push_logs tablosu
 */
export const pushLogs = pgTable('push_logs', {
    id: serial().primaryKey().notNull(),
    phoneNumber: varchar('phone_number', { length: 20 }),
    title: text(),
    body: text(),
    status: varchar({ length: 20 }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});

/**
 * callback_logs tablosu
 */
export const callbackLogs = pgTable('callback_logs', {
    id: serial().primaryKey().notNull(),
    method: varchar({ length: 10 }),
    url: text(),
    headers: text(),
    allData: text('all_data'),
    detectedGsm: varchar('detected_gsm', { length: 50 }),
    detectedMsg: text('detected_msg'),
    result: text(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
});
