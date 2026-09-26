import { pgTable, serial, integer, varchar, boolean, timestamp, decimal, jsonb } from 'drizzle-orm/pg-core';

/**
 * sectors tablosu — Sektör master data
 *
 * Sprint 1: Çok sektörlü mimari için sektör katalogu. Her firma bir veya
 * daha fazla sektör ile ilişkilendirilebilir (bkz. company_sectors).
 *
 * - `slug` URL/identifier için kullanılır (örn: 'beauty', 'dental')
 * - `name_tr` / `name_en` UI için insan-okur etiketler
 * - `icon` emoji veya kısa kod (örn: '💅', '💇')
 * - `color` UI badge rengi (hex)
 * - `has_medical_consent` tıbbi onay formu zorunluluğu (dental, plastic_surgery, medical, veterinary için true)
 * - `default_duration_minutes` yeni hizmet eklerken varsayılan süre
 * - `commission_rate` sektör varsayılan komisyon oranı (%)
 * - `custom_fields_schema` sektöre özel dinamik alan tanımları (jsonb)
 * - `display_order` UI sıralama (düşük = önce)
 * - `is_active` soft-delete bayrağı
 */
export const sectors = pgTable('sectors', {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 50 }).notNull().unique(),
    nameTr: varchar('name_tr', { length: 100 }).notNull(),
    nameEn: varchar('name_en', { length: 100 }).notNull(),
    icon: varchar('icon', { length: 10 }),
    color: varchar('color', { length: 7 }),
    hasMedicalConsent: boolean('has_medical_consent').notNull().default(false),
    defaultDurationMinutes: integer('default_duration_minutes').notNull().default(30),
    commissionRate: decimal('commission_rate', { precision: 4, scale: 2 }).notNull().default('5.00'),
    customFieldsSchema: jsonb('custom_fields_schema'),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * sectors satır tipi (SELECT için)
 */
export type Sector = typeof sectors.$inferSelect;

/**
 * sectors INSERT tipi (yeni satır eklerken)
 */
export type NewSector = typeof sectors.$inferInsert;
