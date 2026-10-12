import { pgTable, index, foreignKey, primaryKey, serial, integer, date, varchar, text, numeric, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { users, companies } from './core';
import { appointments } from './appointments';

/**
 * invoices tablosu
 */
export const invoices = pgTable('invoices', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id'),
    appointmentId: integer('appointment_id'),
    customerName: varchar('customer_name', { length: 255 }),
    customerTaxNumber: varchar('customer_tax_number', { length: 20 }),
    customerTaxOffice: varchar('customer_tax_office', { length: 100 }),
    type: varchar({ length: 20 }).default('e-arsiv'),
    paymentMethod: varchar('payment_method', { length: 20 }).default('nakit'),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    status: varchar({ length: 20 }).default('completed'),
    invoiceNo: varchar('invoice_no', { length: 50 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    gibStatus: varchar('gib_status', { length: 20 }).default('not_sent'),
    gibUuid: varchar('gib_uuid', { length: 100 }),
    gibSentAt: timestamp('gib_sent_at', { withTimezone: true }),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).default('20'),
    vatAmount: numeric('vat_amount', { precision: 15, scale: 2 }).default('0'),
    discountRate: numeric('discount_rate', { precision: 5, scale: 2 }).default('0'),
    discountAmount: numeric('discount_amount', { precision: 15, scale: 2 }).default('0'),
    grandTotal: numeric('grand_total', { precision: 15, scale: 2 }).default('0'),
    xmlContent: text('xml_content'),
    customerId: integer('customer_id'),
}, (table) => {
    return {
        invoicesCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'invoices_company_id_fkey'
        }).onDelete('cascade'),
        invoicesAppointmentIdFkey: foreignKey({
            columns: [table.appointmentId],
            foreignColumns: [appointments.id],
            name: 'invoices_appointment_id_fkey'
        }).onDelete('set null'),
        invoicesCustomerIdFkey: foreignKey({
            columns: [table.customerId],
            foreignColumns: [users.id],
            name: 'invoices_customer_id_fkey'
        }).onDelete('set null'),
    }
});

/**
 * purchase_invoices tablosu
 */
export const purchaseInvoices = pgTable('purchase_invoices', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id'),
    supplierName: varchar('supplier_name', { length: 255 }),
    invoiceNo: varchar('invoice_no', { length: 50 }),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    invoiceDate: date('invoice_date').default(sql`CURRENT_DATE`),
    description: text(),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    subtotal: numeric({ precision: 15, scale: 2 }).default('0'),
    vatTotal: numeric('vat_total', { precision: 15, scale: 2 }).default('0'),
    discountTotal: numeric('discount_total', { precision: 15, scale: 2 }).default('0'),
    isClosed: boolean('is_closed').default(true),
    currentAccountId: integer('current_account_id'),
}, (table) => {
    return {
        purchaseInvoicesCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'purchase_invoices_company_id_fkey'
        }).onDelete('cascade'),
        purchaseInvoicesCurrentAccountIdFkey: foreignKey({
            columns: [table.currentAccountId],
            foreignColumns: [currentAccounts.id],
            name: 'purchase_invoices_current_account_id_fkey'
        }).onDelete('set null'),
    }
});

/**
 * purchase_invoice_items tablosu
 */
export const purchaseInvoiceItems = pgTable('purchase_invoice_items', {
    id: serial().primaryKey().notNull(),
    invoiceId: integer('invoice_id'),
    productName: varchar('product_name', { length: 255 }).notNull(),
    quantity: numeric({ precision: 15, scale: 3 }).default('1'),
    unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).default('0'),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).default('20'),
    vatAmount: numeric('vat_amount', { precision: 15, scale: 2 }).default('0'),
    discountRate: numeric('discount_rate', { precision: 5, scale: 2 }).default('0'),
    discountAmount: numeric('discount_amount', { precision: 15, scale: 2 }).default('0'),
    totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).default('0'),
}, (table) => {
    return {
        purchaseInvoiceItemsInvoiceIdFkey: foreignKey({
            columns: [table.invoiceId],
            foreignColumns: [purchaseInvoices.id],
            name: 'purchase_invoice_items_invoice_id_fkey'
        }).onDelete('cascade'),
    }
});

/**
 * cash_transactions tablosu
 */
export const cashTransactions = pgTable('cash_transactions', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id'),
    type: varchar({ length: 10 }).notNull(),
    category: varchar({ length: 50 }),
    paymentMethod: varchar('payment_method', { length: 20 }).default('nakit'),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    description: text(),
    transactionDate: date('transaction_date').default(sql`CURRENT_DATE`),
    dueDate: date('due_date'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    debit: numeric({ precision: 15, scale: 2 }).default('0'),
    credit: numeric({ precision: 15, scale: 2 }).default('0'),
}, (table) => {
    return {
        cashTransactionsCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'cash_transactions_company_id_fkey'
        }).onDelete('cascade'),
    }
});

/**
 * current_accounts tablosu
 */
export const currentAccounts = pgTable('current_accounts', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id'),
    code: varchar({ length: 50 }),
    name: varchar({ length: 255 }).notNull(),
    title: varchar({ length: 255 }),
    taxOffice: varchar('tax_office', { length: 100 }),
    taxNumber: varchar('tax_number', { length: 20 }),
    type: varchar({ length: 20 }).default('ALL'),
    phone: varchar({ length: 20 }),
    email: varchar({ length: 255 }),
    website: varchar({ length: 255 }),
    addressLine: text('address_line'),
    city: varchar({ length: 100 }),
    district: varchar({ length: 100 }),
    country: varchar({ length: 100 }).default('Türkiye'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
    neighborhood: varchar({ length: 100 }),
}, (table) => {
    return {
        idxCurrAccCode: index('idx_curr_acc_code').using('btree', table.code.asc().nullsLast().op('text_ops')),
        idxCurrAccCompany: index('idx_curr_acc_company').using('btree', table.companyId.asc().nullsLast().op('int4_ops')),
        currentAccountsCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'current_accounts_company_id_fkey'
        }).onDelete('cascade'),
    }
});

/**
 * expenses tablosu
 */
export const expenses = pgTable('expenses', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id'),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    description: text().notNull(),
    category: varchar({ length: 30 }),
    expenseDate: date('expense_date').default(sql`CURRENT_DATE`).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
    createdBy: integer('created_by'),
}, (table) => {
    return {
        expensesCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'expenses_company_id_fkey'
        }).onDelete('cascade'),
        expensesCreatedByFkey: foreignKey({
            columns: [table.createdBy],
            foreignColumns: [users.id],
            name: 'expenses_created_by_fkey'
        }).onDelete('set null'),
    }
});
