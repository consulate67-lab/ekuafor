import { pgTable, serial, integer, bigint, smallint, varchar, text, boolean, timestamp, time, date, numeric, decimal, jsonb, json, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { companies } from './core';
import { appointments } from './appointments';

/**
 * ai_call_logs tablosu
 */
export const aiCallLogs = pgTable('ai_call_logs', {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    transcription: text('transcription'),
    extractedInfo: jsonb('extracted_info'),
    appointmentId: integer('appointment_id').references(() => appointments.id),
    wasAutoCreated: boolean('was_auto_created'),
    confidence: varchar('confidence', { length: 10 }),
    feedback: varchar('feedback', { length: 20 }),
    matchedServiceName: varchar('matched_service_name', { length: 255 }),
    source: varchar('source', { length: 20 }),
    createdAt: timestamp('created_at', { withTimezone: true })
});
