import { pgTable, serial, integer, bigint, smallint, varchar, text, boolean, timestamp, time, date, numeric, decimal, jsonb, json, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { appointments } from './appointments';
import { companies } from './core';

/**
 * payments tablosu
 */
export const payments = pgTable('payments', {
    id: serial('id').primaryKey(),
    appointmentId: integer('appointment_id').references(() => appointments.id),
    companyId: integer('company_id').references(() => companies.id),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 }),
    netAmount: decimal('net_amount', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: varchar('payment_method', { length: 50 }),
    paymentStatus: varchar('payment_status', { length: 50 }),
    transactionId: varchar('transaction_id', { length: 255 }),
    transactionDate: timestamp('transaction_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
});

/**
 * invoices tablosu
 */
export const invoices = pgTable('invoices', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    appointmentId: integer('appointment_id').references(() => appointments.id),
    customerName: varchar('customer_name', { length: 255 }),
    customerTaxNumber: varchar('customer_tax_number', { length: 20 }),
    customerTaxOffice: varchar('customer_tax_office', { length: 100 }),
    type: varchar('type', { length: 20 }),
    paymentMethod: varchar('payment_method', { length: 20 }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }),
    invoiceNo: varchar('invoice_no', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true })
});

/**
 * purchase_invoices tablosu
 */
export const purchaseInvoices = pgTable('purchase_invoices', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    currentAccountId: integer('current_account_id').references(() => currentAccounts.id),
    supplierName: varchar('supplier_name', { length: 255 }),
    invoiceNo: varchar('invoice_no', { length: 50 }),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    subtotal: decimal('subtotal', { precision: 15, scale: 2 }),
    vatTotal: decimal('vat_total', { precision: 15, scale: 2 }),
    discountTotal: decimal('discount_total', { precision: 15, scale: 2 }),
    invoiceDate: date('invoice_date'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true })
});

/**
 * purchase_invoice_items tablosu
 */
export const purchaseInvoiceItems = pgTable('purchase_invoice_items', {
    id: serial('id').primaryKey(),
    invoiceId: integer('invoice_id').references(() => purchaseInvoices.id),
    productName: varchar('product_name', { length: 255 }).notNull(),
    quantity: numeric('quantity', { precision: 15, scale: 3 }),
    unitPrice: decimal('unit_price', { precision: 15, scale: 2 }),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }),
    vatAmount: decimal('vat_amount', { precision: 15, scale: 2 }),
    discountRate: numeric('discount_rate', { precision: 5, scale: 2 }),
    discountAmount: decimal('discount_amount', { precision: 15, scale: 2 }),
    totalAmount: decimal('total_amount', { precision: 15, scale: 2 })
});

/**
 * cash_transactions tablosu
 */
export const cashTransactions = pgTable('cash_transactions', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    type: varchar('type', { length: 10 }).notNull(),
    category: varchar('category', { length: 50 }),
    paymentMethod: varchar('payment_method', { length: 20 }),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    debit: decimal('debit', { precision: 15, scale: 2 }),
    credit: decimal('credit', { precision: 15, scale: 2 }),
    description: text('description'),
    transactionDate: date('transaction_date'),
    dueDate: date('due_date'),
    createdAt: timestamp('created_at', { withTimezone: true })
});

/**
 * current_accounts tablosu
 */
export const currentAccounts = pgTable('current_accounts', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    code: varchar('code', { length: 50 }),
    name: varchar('name', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }),
    taxOffice: varchar('tax_office', { length: 100 }),
    taxNumber: varchar('tax_number', { length: 20 }),
    type: varchar('type', { length: 20 }),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    website: varchar('website', { length: 255 }),
    addressLine: text('address_line'),
    city: varchar('city', { length: 100 }),
    district: varchar('district', { length: 100 }),
    country: varchar('country', { length: 100 }),
    isActive: boolean('is_active'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
});
