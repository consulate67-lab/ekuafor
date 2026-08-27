import { pgTable, serial, integer, bigint, smallint, varchar, text, boolean, timestamp, time, date, numeric, decimal, jsonb, json, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { companies } from './core';
import { services } from './services';
import { users } from './core';
import { appointments } from './appointments';

/**
 * inventory_categories tablosu
 */
export const inventoryCategories = pgTable('inventory_categories', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true })
});

/**
 * inventory_products tablosu
 */
export const inventoryProducts = pgTable('inventory_products', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    categoryId: integer('category_id').references(() => inventoryCategories.id),
    brand: varchar('brand', { length: 100 }),
    name: varchar('name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 100 }),
    barcode: varchar('barcode', { length: 100 }),
    unit: varchar('unit', { length: 20 }),
    specs: jsonb('specs'),
    minStockLevel: decimal('min_stock_level', { precision: 10, scale: 2 }),
    trackStock: boolean('track_stock'),
    isActive: boolean('is_active'),
    createdAt: timestamp('created_at', { withTimezone: true })
});

/**
 * service_materials tablosu
 */
export const serviceMaterials = pgTable('service_materials', {
    id: serial('id').primaryKey(),
    serviceId: integer('service_id').references(() => services.id),
    productId: integer('product_id').references(() => inventoryProducts.id),
    requiredQuantity: decimal('required_quantity', { precision: 10, scale: 2 })
});

/**
 * inventory_stocks tablosu
 */
export const inventoryStocks = pgTable('inventory_stocks', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    productId: integer('product_id').references(() => inventoryProducts.id),
    quantity: decimal('quantity', { precision: 10, scale: 2 }),
    avgCost: decimal('avg_cost', { precision: 10, scale: 2 }),
    lastPurchasePrice: decimal('last_purchase_price', { precision: 10, scale: 2 })
});

/**
 * inventory_assignments tablosu
 */
export const inventoryAssignments = pgTable('inventory_assignments', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    staffId: integer('staff_id').references(() => users.id),
    productId: integer('product_id').references(() => inventoryProducts.id),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }),
    notes: text('notes'),
    assignedAt: timestamp('assigned_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true })
});

/**
 * inventory_usage_logs tablosu
 */
export const inventoryUsageLogs = pgTable('inventory_usage_logs', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    appointmentId: integer('appointment_id').references(() => appointments.id),
    staffId: integer('staff_id').references(() => users.id),
    productId: integer('product_id').references(() => inventoryProducts.id),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
    usageType: varchar('usage_type', { length: 20 }),
    createdAt: timestamp('created_at', { withTimezone: true })
});
