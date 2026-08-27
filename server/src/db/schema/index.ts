/**
 * Tüm Drizzle schema'larını tek noktadan re-export eder.
 *
 * Bu dosya drizzle.config.ts tarafından schema path olarak kullanılır.
 * Drizzle generate komutu tüm tabloları buradan okur.
 *
 * Domain dosyaları:
 *   - core.ts          → users, companies, main_companies, company_users, departments
 *   - services.ts      → services, packages, package_services, working_hours
 *   - appointments.ts  → appointments, appointment_services
 *   - finance.ts       → payments, invoices, purchase_*, cash_transactions, current_accounts
 *   - inventory.ts     → inventory_categories/products/stocks/assignments/usage, service_materials
 *   - communication.ts → sms_settings/logs, otp_codes, customer_devices, push_logs, callback_logs
 *   - ai.ts            → ai_call_logs
 */

export * from './core';
export * from './services';
export * from './appointments';
export * from './finance';
export * from './inventory';
export * from './communication';
export * from './ai';
