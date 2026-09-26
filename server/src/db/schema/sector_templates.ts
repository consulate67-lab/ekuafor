import { pgTable, serial, integer, varchar, boolean, timestamp, decimal } from 'drizzle-orm/pg-core';

import { sectors } from './sectors';

/**
 * sector_service_templates tablosu — Sektör hizmet şablonları
 *
 * Sprint 1: Yeni firma kaydında sektör seçilince, hizmet katalogu bu
 * şablonlardan kopyalanır. Her sektör için tipik hizmetler tanımlıdır
 * (örn: dental → "Diş Temizliği", "Kanal Tedavisi", "Dolgu", vb.).
 *
 * - `sector_id` bağlı sektör
 * - `name_tr` / `name_en` hizmet adı (Türkçe / İngilizce)
 * - `default_duration_minutes` sektör default'u üzerine override
 * - `default_price` firma yeni açıldığında referans fiyat
 * - `requires_specialist` uzman personel zorunlu mu (örn: ortodonti)
 * - `display_order` UI sıralama
 * - `is_active` soft-delete
 */
export const sectorServiceTemplates = pgTable('sector_service_templates', {
    id: serial('id').primaryKey(),
    sectorId: integer('sector_id')
        .notNull()
        .references(() => sectors.id),
    nameTr: varchar('name_tr', { length: 100 }).notNull(),
    nameEn: varchar('name_en', { length: 100 }).notNull(),
    defaultDurationMinutes: integer('default_duration_minutes'),
    defaultPrice: decimal('default_price', { precision: 10, scale: 2 }),
    requiresSpecialist: boolean('requires_specialist').notNull().default(false),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * sector_service_templates satır tipi (SELECT için)
 */
export type SectorServiceTemplate = typeof sectorServiceTemplates.$inferSelect;

/**
 * sector_service_templates INSERT tipi (yeni satır eklerken)
 */
export type NewSectorServiceTemplate = typeof sectorServiceTemplates.$inferInsert;
