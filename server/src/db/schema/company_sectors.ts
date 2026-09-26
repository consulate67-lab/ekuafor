import { pgTable, integer, varchar, boolean, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';

import { companies } from './core';
import { sectors } from './sectors';

/**
 * company_sectors tablosu — Firma ↔ Sektör many-to-many ilişki tablosu
 *
 * Sprint 1: Çok sektörlü destek için junction tablosu. Bir firma birden
 * fazla sektörde hizmet verebilir (örn: hem güzellik hem diş kliniği).
 *
 * NOT: Task brief'inde `company_id uuid` yazıyordu ancak mevcut `companies.id`
 * `serial` (integer) tanımlı — tüm mevcut FK referansları da `integer`
 * (bkz. services.ts, appointments.ts). FK tip uyumu için burada da `integer`
 * kullanıldı. companies.id ileride uuid'ye migrate edilirse bu sütun da
 * güncellenmeli.
 *
 * - composite PK: (company_id, sector_id) → aynı firma aynı sektörü iki kez ekleyemez
 * - `sub_specialty` sektör altındaki uzmanlık alanı (örn: dental → ortodonti)
 * - `is_primary` firmanın ana sektörü (UI rozet gösterimi için)
 * - ON DELETE CASCADE: firma silinirse ilişki de silinir
 * - idx_company_sectors_sector: sektör bazlı firma araması için (örn: "tüm diş klinikleri")
 */
export const companySectors = pgTable(
    'company_sectors',
    {
        companyId: integer('company_id')
            .notNull()
            .references(() => companies.id, { onDelete: 'cascade' }),
        sectorId: integer('sector_id')
            .notNull()
            .references(() => sectors.id),
        subSpecialty: varchar('sub_specialty', { length: 100 }),
        isPrimary: boolean('is_primary').notNull().default(false),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.companyId, table.sectorId] }),
            sectorIdx: index('idx_company_sectors_sector').on(table.sectorId),
        };
    }
);

/**
 * company_sectors satır tipi (SELECT için)
 */
export type CompanySector = typeof companySectors.$inferSelect;

/**
 * company_sectors INSERT tipi (yeni satır eklerken)
 */
export type NewCompanySector = typeof companySectors.$inferInsert;
