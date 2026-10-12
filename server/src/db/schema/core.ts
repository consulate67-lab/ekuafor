import { pgTable, pgEnum, index, foreignKey, unique, serial, type PgTableExtraConfig, integer, varchar, text, numeric, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * user_role enum
 */
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'company_admin', 'customer', 'staff']);

/**
 * users tablosu
 */
export const users = pgTable('users', {
    id: serial().primaryKey().notNull(),
    email: varchar({ length: 255 }).notNull(),
    password: varchar({ length: 255 }).notNull(),
    role: userRoleEnum('role').default('customer').notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    phone: varchar({ length: 20 }),
    companyId: integer('company_id'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
    boardCode: varchar('board_code', { length: 20 }),
    gender: varchar({ length: 10 }),
    departmentId: integer('department_id'),
    photo: text(),
    quantity: numeric(),
    unit: varchar({ length: 30 }),
    isPhoneVerified: boolean('is_phone_verified').default(false),
    title: varchar({ length: 100 }).default('Personel'),
    commissionRate: numeric('commission_rate', { precision: 5, scale: 2 }),
}, (table): PgTableExtraConfig => {
    return {
        idxUsersEmail: index('idx_users_email').using('btree', table.email.asc().nullsLast().op('text_ops')),
        idxUsersRole: index('idx_users_role').using('btree', table.role.asc().nullsLast().op('enum_ops')),
        usersDepartmentIdFkey: foreignKey({
            columns: [table.departmentId],
            foreignColumns: [departments.id],
            name: 'users_department_id_fkey'
        }),
        usersEmailKey: unique('users_email_key').on(table.email),
        usersBoardCodeKey: unique('users_board_code_key').on(table.boardCode),
    }
});

/**
 * companies tablosu
 */
export const companies = pgTable('companies', {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    phone: varchar({ length: 20 }),
    email: varchar({ length: 255 }),
    website: varchar({ length: 255 }),
    addressLine: text('address_line'),
    provinceId: integer('province_id'),
    provinceName: varchar('province_name', { length: 100 }),
    districtId: integer('district_id'),
    districtName: varchar('district_name', { length: 100 }),
    neighborhoodId: integer('neighborhood_id'),
    neighborhoodName: varchar('neighborhood_name', { length: 100 }),
    postalCode: varchar('postal_code', { length: 10 }),
    streetName: varchar('street_name', { length: 100 }),
    buildingNo: varchar('building_no', { length: 20 }),
    apartmentNo: varchar('apartment_no', { length: 20 }),
    latitude: numeric({ precision: 10, scale: 8 }),
    longitude: numeric({ precision: 11, scale: 8 }),
    bankName: varchar('bank_name', { length: 255 }),
    bankBranch: varchar('bank_branch', { length: 255 }),
    iban: varchar({ length: 34 }),
    accountHolderName: varchar('account_holder_name', { length: 255 }),
    taxNumber: varchar('tax_number', { length: 20 }),
    taxOffice: varchar('tax_office', { length: 100 }),
    commissionRate: numeric('commission_rate', { precision: 5, scale: 2 }).default('0.00'),
    paymentEnabled: boolean('payment_enabled').default(false),
    isActive: boolean('is_active').default(true),
    isVerified: boolean('is_verified').default(false),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
    createdBy: integer('created_by'),
    boardKey: varchar('board_key', { length: 100 }),
    workStartTime: varchar('work_start_time', { length: 10 }).default('08:00'),
    workEndTime: varchar('work_end_time', { length: 10 }).default('20:00'),
    slotInterval: integer('slot_interval').default(30),
    adminKey: varchar('admin_key', { length: 20 }),
    genders: text().array(),
    companyType: varchar('company_type', { length: 20 }).default('ASIL'),
    mainCompanyId: integer('main_company_id'),
    bookingFlow: varchar('booking_flow', { length: 10 }).default('SHP'),
    staffLabel: varchar('staff_label', { length: 50 }).default('Personel'),
    serviceLabel: varchar('service_label', { length: 50 }).default('Hizmet'),
    city: varchar({ length: 50 }),
    district: varchar({ length: 50 }),
    qnbUsername: varchar('qnb_username', { length: 100 }),
    qnbPassword: varchar('qnb_password', { length: 100 }),
    qnbVkn: varchar('qnb_vkn', { length: 20 }),
    efaturaTestMode: boolean('efatura_test_mode').default(true),
    invoicePrefix: varchar('invoice_prefix', { length: 3 }).default('GIB'),
    naceCode: varchar('nace_code', { length: 20 }),
    buildingNumber: varchar('building_number', { length: 20 }),
    doorNumber: varchar('door_number', { length: 20 }),
    faxNumber: varchar('fax_number', { length: 20 }),
    ublIncomingAlias: varchar('ubl_incoming_alias', { length: 255 }),
    ublOutgoingAlias: varchar('ubl_outgoing_alias', { length: 255 }),
    neighborhood: varchar({ length: 100 }),
    bankIban: varchar('bank_iban', { length: 34 }),
    licenseEndDate: timestamp('license_end_date', { withTimezone: true }),
    licenseStatus: varchar('license_status', { length: 20 }).default('active'),
    smsEnabled: boolean('sms_enabled').default(true),
    addressLine2: text('address_line2'),
    photo: text(),
    verificationCode: varchar('verification_code', { length: 10 }),
    originalPrice: numeric('original_price', { precision: 10, scale: 2 }),
    collectedPrice: numeric('collected_price', { precision: 10, scale: 2 }),
    ratingAvg: numeric('rating_avg', { precision: 3, scale: 2 }).default('0'),
    reviewCount: integer('review_count').default(0),
    staffCount: integer('staff_count').default(0),
    serviceCount: integer('service_count').default(0),
}, (table) => {
    return {
        idxCompaniesActive: index('idx_companies_active').using('btree', table.isActive.asc().nullsLast().op('bool_ops')),
        idxCompaniesActiveVerified: index('idx_companies_active_verified').using('btree', table.isActive.asc().nullsLast().op('bool_ops'), table.isVerified.asc().nullsLast().op('bool_ops')),
        idxCompaniesAdminKey: index('idx_companies_admin_key').using('btree', table.adminKey.asc().nullsLast().op('text_ops')),
        idxCompaniesBankIban: index('idx_companies_bank_iban').using('btree', table.bankIban.asc().nullsLast().op('text_ops')),
        idxCompaniesBoardKey: index('idx_companies_board_key').using('btree', table.boardKey.asc().nullsLast().op('text_ops')),
        idxCompaniesBookingFlow: index('idx_companies_booking_flow').using('btree', table.bookingFlow.asc().nullsLast().op('text_ops')),
        idxCompaniesCity: index('idx_companies_city').using('btree', table.city.asc().nullsLast().op('text_ops')),
        idxCompaniesCityTrgm: index('idx_companies_city_trgm').using('gist', table.city.asc().nullsLast().op('gist_trgm_ops')),
        idxCompaniesCompanyType: index('idx_companies_company_type').using('btree', table.companyType.asc().nullsLast().op('text_ops')),
        idxCompaniesCreatedAt: index('idx_companies_created_at').using('btree', table.createdAt.asc().nullsLast().op('timestamp_ops')),
        idxCompaniesDistrict: index('idx_companies_district').using('btree', table.district.asc().nullsLast().op('text_ops')),
        idxCompaniesDistrictTrgm: index('idx_companies_district_trgm').using('gist', table.district.asc().nullsLast().op('gist_trgm_ops')),
        idxCompaniesIsActive: index('idx_companies_is_active').using('btree', table.isActive.asc().nullsLast().op('bool_ops')),
        idxCompaniesIsVerified: index('idx_companies_is_verified').using('btree', table.isVerified.asc().nullsLast().op('bool_ops')),
        idxCompaniesLicenseEndDate: index('idx_companies_license_end_date').using('btree', table.licenseEndDate.asc().nullsLast().op('timestamptz_ops')),
        idxCompaniesLicenseStatus: index('idx_companies_license_status').using('btree', table.licenseStatus.asc().nullsLast().op('text_ops')),
        idxCompaniesLocation: index('idx_companies_location').using('btree', table.latitude.asc().nullsLast().op('numeric_ops'), table.longitude.asc().nullsLast().op('numeric_ops')),
        idxCompaniesMainCompanyId: index('idx_companies_main_company_id').using('btree', table.mainCompanyId.asc().nullsLast().op('int4_ops')),
        idxCompaniesNaceCode: index('idx_companies_nace_code').using('btree', table.naceCode.asc().nullsLast().op('text_ops')),
        idxCompaniesName: index('idx_companies_name').using('btree', table.name.asc().nullsLast().op('text_ops')),
        idxCompaniesNameTrgm: index('idx_companies_name_trgm').using('gist', table.name.asc().nullsLast().op('gist_trgm_ops')),
        idxCompaniesNeighborhood: index('idx_companies_neighborhood').using('btree', table.neighborhood.asc().nullsLast().op('text_ops')),
        idxCompaniesQnbVkn: index('idx_companies_qnb_vkn').using('btree', table.qnbVkn.asc().nullsLast().op('text_ops')),
        idxCompaniesSearch: index('idx_companies_search').using('btree', table.name.asc().nullsLast().op('text_ops'), table.city.asc().nullsLast().op('text_ops'), table.district.asc().nullsLast().op('text_ops'), table.neighborhood.asc().nullsLast().op('text_ops')),
        idxCompaniesSearchTr: index('idx_companies_search_tr').using('gin', sql`to_tsvector('turkish'::regconfig, (((((name)::text || ' '::text) || (COALESCE(city, ''::character varying))::text) || ' '::text) || (COALESCE(district, ''::character varying))::text))`),
        idxCompaniesServiceLabel: index('idx_companies_service_label').using('btree', table.serviceLabel.asc().nullsLast().op('text_ops')),
        idxCompaniesSmsEnabled: index('idx_companies_sms_enabled').using('btree', table.smsEnabled.asc().nullsLast().op('bool_ops')),
        idxCompaniesStaffLabel: index('idx_companies_staff_label').using('btree', table.staffLabel.asc().nullsLast().op('text_ops')),
        idxCompaniesTaxNumber: index('idx_companies_tax_number').using('btree', table.taxNumber.asc().nullsLast().op('text_ops')),
        idxCompaniesTaxOffice: index('idx_companies_tax_office').using('btree', table.taxOffice.asc().nullsLast().op('text_ops')),
        idxCompaniesUblIncomingAlias: index('idx_companies_ubl_incoming_alias').using('btree', table.ublIncomingAlias.asc().nullsLast().op('text_ops')),
        idxCompaniesUblOutgoingAlias: index('idx_companies_ubl_outgoing_alias').using('btree', table.ublOutgoingAlias.asc().nullsLast().op('text_ops')),
        idxCompaniesUpdatedAt: index('idx_companies_updated_at').using('btree', table.updatedAt.asc().nullsLast().op('timestamp_ops')),
        idxCompaniesVerificationCode: index('idx_companies_verification_code').using('btree', table.verificationCode.asc().nullsLast().op('text_ops')),
        companiesCreatedByFkey: foreignKey({
            columns: [table.createdBy],
            foreignColumns: [users.id],
            name: 'companies_created_by_fkey'
        }),
        companiesMainCompanyIdFkey: foreignKey({
            columns: [table.mainCompanyId],
            foreignColumns: [table.id],
            name: 'companies_main_company_id_fkey'
        }),
        companiesAdminKeyKey: unique('companies_admin_key_key').on(table.adminKey),
    }
});

/**
 * main_companies tablosu
 */
export const mainCompanies = pgTable('main_companies', {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    addressLine: text('address_line'),
    provinceId: integer('province_id'),
    provinceName: varchar('province_name', { length: 100 }),
    adminCode: varchar('admin_code', { length: 50 }).notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
    return {
        mainCompaniesAdminCodeKey: unique('main_companies_admin_code_key').on(table.adminCode),
    }
});

/**
 * company_users tablosu
 */
export const companyUsers = pgTable('company_users', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id'),
    userId: integer('user_id'),
    role: varchar({ length: 50 }).default('staff'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
    return {
        companyUsersCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'company_users_company_id_fkey'
        }).onDelete('cascade'),
        companyUsersUserIdFkey: foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'company_users_user_id_fkey'
        }).onDelete('cascade'),
        companyUsersCompanyIdUserIdKey: unique('company_users_company_id_user_id_key').on(table.companyId, table.userId),
    }
});

/**
 * departments tablosu
 */
export const departments = pgTable('departments', {
    id: serial().primaryKey().notNull(),
    companyId: integer('company_id'),
    name: varchar({ length: 100 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
    return {
        departmentsCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'departments_company_id_fkey'
        }).onDelete('cascade'),
    }
});

/**
 * kvkk_requests tablosu
 */
export const kvkkRequests = pgTable('kvkk_requests', {
    id: serial().primaryKey().notNull(),
    requestType: varchar('request_type', { length: 20 }).notNull(),
    requesterName: varchar('requester_name', { length: 200 }).notNull(),
    requesterEmail: varchar('requester_email', { length: 255 }).notNull(),
    requesterPhone: varchar('requester_phone', { length: 20 }),
    companyId: integer('company_id'),
    companyName: varchar('company_name', { length: 255 }),
    reason: text(),
    status: varchar({ length: 20 }).default('pending').notNull(),
    adminNote: text('admin_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
    processedAt: timestamp('processed_at', { withTimezone: true }),
}, (table) => {
    return {
        idxKvkkCreated: index('idx_kvkk_created').using('btree', table.createdAt.desc().nullsFirst()),
        idxKvkkEmail: index('idx_kvkk_email').using('btree', table.requesterEmail.asc().nullsLast().op('text_ops')),
        idxKvkkStatus: index('idx_kvkk_status').using('btree', table.status.asc().nullsLast().op('text_ops')),
        kvkkRequestsCompanyIdFkey: foreignKey({
            columns: [table.companyId],
            foreignColumns: [companies.id],
            name: 'kvkk_requests_company_id_fkey'
        }).onDelete('set null'),
    }
});
