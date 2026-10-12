/**
 * Tüm Drizzle schema'larını tek noktadan re-export eder.
 *
 * Bu dosya drizzle.config.ts tarafından schema path olarak kullanılır.
 * Drizzle generate komutu tüm tabloları buradan okur.
 *
 * Domain dosyaları:
 *   - core.ts              → users, companies, main_companies, company_users, departments, kvkk_requests
 *   - services.ts          → services, working_hours
 *   - booking.ts           → resources, service_resources, class_sessions
 *   - appointments.ts      → appointments, appointment_services
 *   - finance.ts           → invoices, purchase_*, cash_transactions, current_accounts
 *   - communication.ts     → sms_settings/logs, otp_codes, customer_devices, push_logs, callback_logs
 *   - sectors.ts           → sectors (master data)
 *   - sector_templates.ts  → sector_service_templates (yeni firmaya kopyalanacak hizmet şablonları)
 *   - sector_specialties.ts → sector_employee_specialties (sektör personel uzmanlıkları)
 *   - company_sectors.ts   → company_sectors (firma ↔ sektör junction, composite PK)
 */

export * from './core';
export * from './services';
export * from './booking';
export * from './appointments';
export * from './finance';
export * from './communication';
export * from './sectors';
export * from './sector_templates';
export * from './sector_specialties';
export * from './company_sectors';
