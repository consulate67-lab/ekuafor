import { pgTable, serial, integer, bigint, smallint, varchar, text, boolean, timestamp, time, date, numeric, decimal, jsonb, json, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';


// user_role enum (idempotent — created in migrate.ts but referenced here)
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'company_admin', 'customer', 'staff']);


/**
 * users tablosu
 */
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    companyId: integer('company_id'),
    boardCode: varchar('board_code', { length: 20 }).unique(),
    gender: varchar('gender', { length: 10 }),
    departmentId: integer('department_id'),
    photo: text('photo'),
    quantity: decimal('quantity', { precision: 10, scale: 2 }),
    unit: varchar('unit', { length: 20 }),
    commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }),
    isActive: boolean('is_active'),
    isPhoneVerified: boolean('is_phone_verified'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
});

/**
 * companies tablosu
 */
export const companies = pgTable('companies', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    website: varchar('website', { length: 255 }),
    addressLine: text('address_line'),
    city: varchar('city', { length: 100 }),
    district: varchar('district', { length: 100 }),
    neighborhood: varchar('neighborhood', { length: 100 }),
    postalCode: varchar('postal_code', { length: 10 }),
    latitude: decimal('latitude', { precision: 10, scale: 8 }),
    longitude: decimal('longitude', { precision: 11, scale: 8 }),
    bankName: varchar('bank_name', { length: 255 }),
    bankBranch: varchar('bank_branch', { length: 255 }),
    iban: varchar('iban', { length: 34 }),
    accountHolderName: varchar('account_holder_name', { length: 255 }),
    workStartTime: varchar('work_start_time', { length: 10 }),
    workEndTime: varchar('work_end_time', { length: 10 }),
    slotInterval: text('slot_interval'),
    genders: text('genders').array(),
    commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }),
    paymentEnabled: boolean('payment_enabled'),
    isActive: boolean('is_active'),
    isVerified: boolean('is_verified'),
    createdBy: integer('created_by').references(() => users.id),
    adminKey: varchar('admin_key', { length: 20 }).unique(),
    boardKey: varchar('board_key', { length: 20 }).unique(),
    companyType: varchar('company_type', { length: 20 }),
    mainCompanyId: integer('main_company_id'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
});

/**
 * main_companies tablosu
 */
export const mainCompanies = pgTable('main_companies', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    addressLine: text('address_line'),
    city: varchar('city', { length: 100 }),
    district: varchar('district', { length: 100 }),
    adminCode: varchar('admin_code', { length: 50 }).notNull().unique(),
    isActive: boolean('is_active'),
    createdAt: timestamp('created_at', { withTimezone: true })
});

/**
 * company_users tablosu
 */
export const companyUsers = pgTable('company_users', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    userId: integer('user_id').references(() => users.id),
    role: varchar('role', { length: 50 }),
    isActive: boolean('is_active')
});

/**
 * departments tablosu
 */
export const departments = pgTable('departments', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    name: varchar('name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
});

/**
 * KVKK veri sahibi talepleri tablosu
 * - delete: veri silme talebi
 * - correct: veri düzeltme talebi
 * - info: bilgi alma talebi
 * Status: pending | processed | rejected
 */
export const kvkkRequests = pgTable('kvkk_requests', {
    id: serial('id').primaryKey(),
    requestType: varchar('request_type', { length: 20 }).notNull(), // 'delete' | 'correct' | 'info'
    requesterName: varchar('requester_name', { length: 200 }).notNull(),
    requesterEmail: varchar('requester_email', { length: 255 }).notNull(),
    requesterPhone: varchar('requester_phone', { length: 20 }),
    companyId: integer('company_id').references((): any => companies.id, { onDelete: 'set null' }),
    companyName: varchar('company_name', { length: 255 }),
    reason: text('reason'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    adminNote: text('admin_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true })
});
