import { pgTable, serial, integer, varchar, boolean } from 'drizzle-orm/pg-core';

import { sectors } from './sectors';

/**
 * sector_employee_specialties tablosu — Sektör personel uzmanlık alanları
 *
 * Sprint 1: Her sektörün kendi uzmanlık alanları vardır. Personel kaydında
 * uzmanlık ataması için kullanılır (örn: dental → "Ortodontist", "Periodontolog").
 *
 * - `sector_id` bağlı sektör
 * - `name_tr` / `name_en` uzmanlık adı
 * - `requires_certification` sertifika zorunlu mu (tıbbi sektörler için true)
 * - `display_order` UI sıralama
 * - `is_active` soft-delete
 *
 * NOT: Bu tablo `created_at` kolonu içermez çünkü sektör katalogu master
 * data'dır, sprint sonu seed ile dolu gelir ve audit gerektirmez.
 */
export const sectorEmployeeSpecialties = pgTable('sector_employee_specialties', {
    id: serial('id').primaryKey(),
    sectorId: integer('sector_id')
        .notNull()
        .references(() => sectors.id),
    nameTr: varchar('name_tr', { length: 100 }).notNull(),
    nameEn: varchar('name_en', { length: 100 }).notNull(),
    requiresCertification: boolean('requires_certification').notNull().default(false),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
});

/**
 * sector_employee_specialties satır tipi (SELECT için)
 */
export type SectorEmployeeSpecialty = typeof sectorEmployeeSpecialties.$inferSelect;

/**
 * sector_employee_specialties INSERT tipi (yeni satır eklerken)
 */
export type NewSectorEmployeeSpecialty = typeof sectorEmployeeSpecialties.$inferInsert;
