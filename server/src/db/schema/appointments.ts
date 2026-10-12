import { pgTable, index, uniqueIndex, foreignKey, check, serial, integer, date, time, varchar, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { users, companies } from './core';
import { services } from './services';
import { resources, classSessions } from './booking';

/**
 * appointments tablosu
 */
export const appointments = pgTable('appointments', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id'),
    customerId: integer('customer_id'),
    serviceId: integer('service_id'),
    staffId: integer('staff_id'),
    appointmentDate: date('appointment_date').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    status: varchar({ length: 50 }).default('pending'),
    notes: text(),
    price: numeric({ precision: 10, scale: 2 }),
    paymentStatus: varchar('payment_status', { length: 50 }).default('unpaid'),
    paymentMethod: varchar('payment_method', { length: 50 }),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
    customerPhone: varchar('customer_phone', { length: 20 }),
    customerName: varchar('customer_name', { length: 255 }),
    deviceId: varchar('device_id', { length: 255 }),
    rating: integer(),
    comment: text(),
    originalPrice: numeric('original_price', { precision: 10, scale: 2 }),
    collectedPrice: numeric('collected_price', { precision: 10, scale: 2 }),
    usedMaterials: text('used_materials'),
    technicalNotes: text('technical_notes'),
    resourceId: integer('resource_id'),
    classSessionId: integer('class_session_id'),
    partySize: integer('party_size').default(1).notNull(),
    /** İstemcinin ürettiği tekil anahtar; aynı istek tekrar gelirse yeni kayıt açılmaz */
    clientRequestId: varchar('client_request_id', { length: 64 }),
}, (table) => {
    return {
        idxAppointmentsCompany: index('idx_appointments_company').using('btree', table.companyId.asc().nullsLast().op('int4_ops')),
        idxAppointmentsCustomer: index('idx_appointments_customer').using('btree', table.customerId.asc().nullsLast().op('int4_ops')),
        idxAppointmentsDate: index('idx_appointments_date').using('btree', table.appointmentDate.asc().nullsLast().op('date_ops')),
        idxAppointmentsStaffDate: index('idx_appointments_staff_date').using('btree', table.staffId, table.appointmentDate),
        idxAppointmentsResourceDate: index('idx_appointments_resource_date').using('btree', table.resourceId, table.appointmentDate),
        idxAppointmentsClassSession: index('idx_appointments_class_session').using('btree', table.classSessionId),
        uqAppointmentsClientRequest: uniqueIndex('uq_appointments_client_request').using('btree', table.companyId, table.clientRequestId),
        appointmentsResourceIdFkey: foreignKey({
            columns: [table.resourceId],
            foreignColumns: [resources.id],
            name: 'appointments_resource_id_fkey'
        }).onDelete('set null'),
        appointmentsClassSessionIdFkey: foreignKey({
            columns: [table.classSessionId],
            foreignColumns: [classSessions.id],
            name: 'appointments_class_session_id_fkey'
        }),
        appointmentsPartySizeCheck: check('appointments_party_size_check', sql`party_size > 0`),
        appointmentsCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'appointments_company_id_fkey'
        }).onDelete('cascade'),
        appointmentsCustomerIdFkey: foreignKey({
            columns: [table.customerId],
            foreignColumns: [users.id],
            name: 'appointments_customer_id_fkey'
        }),
        appointmentsServiceIdFkey: foreignKey({
            columns: [table.serviceId],
            foreignColumns: [services.id],
            name: 'appointments_service_id_fkey'
        }),
        appointmentsStaffIdFkey: foreignKey({
            columns: [table.staffId],
            foreignColumns: [users.id],
            name: 'appointments_staff_id_fkey'
        }),
        appointmentsRatingCheck: check('appointments_rating_check', sql`(rating >= 1) AND (rating <= 5)`),
    }
});

/**
 * appointment_services tablosu
 */
export const appointmentServices = pgTable('appointment_services', {
    id: serial().primaryKey().notNull(),
    appointmentId: integer('appointment_id'),
    serviceId: integer('service_id'),
    price: numeric({ precision: 10, scale: 2 }),
    durationMinutes: integer('duration_minutes'),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    staffId: integer('staff_id'),
    status: varchar({ length: 20 }).default('pending'),
    startTime: varchar('start_time', { length: 5 }),
    endTime: varchar('end_time', { length: 5 }),
}, (table) => {
    return {
        idxAppointmentServicesAppointment: index('idx_appointment_services_appointment').using('btree', table.appointmentId.asc().nullsLast().op('int4_ops')),
        appointmentServicesAppointmentIdFkey: foreignKey({
            columns: [table.appointmentId],
            foreignColumns: [appointments.id],
            name: 'appointment_services_appointment_id_fkey'
        }).onDelete('cascade'),
        appointmentServicesServiceIdFkey: foreignKey({
            columns: [table.serviceId],
            foreignColumns: [services.id],
            name: 'appointment_services_service_id_fkey'
        }).onDelete('cascade'),
        appointmentServicesStaffIdFkey: foreignKey({
            columns: [table.staffId],
            foreignColumns: [users.id],
            name: 'appointment_services_staff_id_fkey'
        }),
    }
});
