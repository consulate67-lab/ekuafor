CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'company_admin', 'customer', 'staff');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"phone" varchar(20),
	"email" varchar(255),
	"website" varchar(255),
	"address_line" text,
	"province_id" integer,
	"province_name" varchar(100),
	"district_id" integer,
	"district_name" varchar(100),
	"neighborhood_id" integer,
	"neighborhood_name" varchar(100),
	"postal_code" varchar(10),
	"street_name" varchar(100),
	"building_no" varchar(20),
	"apartment_no" varchar(20),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"bank_name" varchar(255),
	"bank_branch" varchar(255),
	"iban" varchar(34),
	"account_holder_name" varchar(255),
	"tax_number" varchar(20),
	"tax_office" varchar(100),
	"commission_rate" numeric(5, 2) DEFAULT '0.00',
	"payment_enabled" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_by" integer,
	"board_key" varchar(100),
	"work_start_time" varchar(10) DEFAULT '08:00',
	"work_end_time" varchar(10) DEFAULT '20:00',
	"slot_interval" integer DEFAULT 30,
	"admin_key" varchar(20),
	"genders" text[],
	"company_type" varchar(20) DEFAULT 'ASIL',
	"main_company_id" integer,
	"booking_flow" varchar(10) DEFAULT 'SHP',
	"staff_label" varchar(50) DEFAULT 'Personel',
	"service_label" varchar(50) DEFAULT 'Hizmet',
	"city" varchar(50),
	"district" varchar(50),
	"qnb_username" varchar(100),
	"qnb_password" varchar(100),
	"qnb_vkn" varchar(20),
	"efatura_test_mode" boolean DEFAULT true,
	"invoice_prefix" varchar(3) DEFAULT 'GIB',
	"nace_code" varchar(20),
	"building_number" varchar(20),
	"door_number" varchar(20),
	"fax_number" varchar(20),
	"ubl_incoming_alias" varchar(255),
	"ubl_outgoing_alias" varchar(255),
	"neighborhood" varchar(100),
	"bank_iban" varchar(34),
	"license_end_date" timestamp with time zone,
	"license_status" varchar(20) DEFAULT 'active',
	"sms_enabled" boolean DEFAULT true,
	"address_line2" text,
	"photo" text,
	"verification_code" varchar(10),
	"original_price" numeric(10, 2),
	"collected_price" numeric(10, 2),
	"rating_avg" numeric(3, 2) DEFAULT '0',
	"review_count" integer DEFAULT 0,
	"staff_count" integer DEFAULT 0,
	"service_count" integer DEFAULT 0,
	CONSTRAINT "companies_admin_key_key" UNIQUE("admin_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"user_id" integer,
	"role" varchar(50) DEFAULT 'staff',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "company_users_company_id_user_id_key" UNIQUE("company_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kvkk_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_type" varchar(20) NOT NULL,
	"requester_name" varchar(200) NOT NULL,
	"requester_email" varchar(255) NOT NULL,
	"requester_phone" varchar(20),
	"company_id" integer,
	"company_name" varchar(255),
	"reason" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "main_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"address_line" text,
	"province_id" integer,
	"province_name" varchar(100),
	"admin_code" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "main_companies_admin_code_key" UNIQUE("admin_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"company_id" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"board_code" varchar(20),
	"gender" varchar(10),
	"department_id" integer,
	"photo" text,
	"quantity" numeric,
	"unit" varchar(30),
	"is_phone_verified" boolean DEFAULT false,
	"title" varchar(100) DEFAULT 'Personel',
	"commission_rate" numeric(5, 2),
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_board_code_key" UNIQUE("board_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"department_id" integer,
	"quantity" numeric,
	"unit" varchar(30),
	"photo" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "working_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "working_hours_day_of_week_check" CHECK ((day_of_week >= 0) AND (day_of_week <= 6))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer,
	"service_id" integer,
	"price" numeric(10, 2),
	"duration_minutes" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"staff_id" integer,
	"status" varchar(20) DEFAULT 'pending',
	"start_time" varchar(5),
	"end_time" varchar(5)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"customer_id" integer,
	"service_id" integer,
	"staff_id" integer,
	"appointment_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"notes" text,
	"price" numeric(10, 2),
	"payment_status" varchar(50) DEFAULT 'unpaid',
	"payment_method" varchar(50),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"customer_phone" varchar(20),
	"customer_name" varchar(255),
	"device_id" varchar(255),
	"rating" integer,
	"comment" text,
	"original_price" numeric(10, 2),
	"collected_price" numeric(10, 2),
	"used_materials" text,
	"technical_notes" text,
	CONSTRAINT "appointments_rating_check" CHECK ((rating >= 1) AND (rating <= 5))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cash_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"type" varchar(10) NOT NULL,
	"category" varchar(50),
	"payment_method" varchar(20) DEFAULT 'nakit',
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"transaction_date" date DEFAULT CURRENT_DATE,
	"due_date" date,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"debit" numeric(15, 2) DEFAULT '0',
	"credit" numeric(15, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "current_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"code" varchar(50),
	"name" varchar(255) NOT NULL,
	"title" varchar(255),
	"tax_office" varchar(100),
	"tax_number" varchar(20),
	"type" varchar(20) DEFAULT 'ALL',
	"phone" varchar(20),
	"email" varchar(255),
	"website" varchar(255),
	"address_line" text,
	"city" varchar(100),
	"district" varchar(100),
	"country" varchar(100) DEFAULT 'Türkiye',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"neighborhood" varchar(100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"description" text NOT NULL,
	"expense_date" date DEFAULT CURRENT_DATE NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"appointment_id" integer,
	"customer_name" varchar(255),
	"customer_tax_number" varchar(20),
	"customer_tax_office" varchar(100),
	"type" varchar(20) DEFAULT 'e-arsiv',
	"payment_method" varchar(20) DEFAULT 'nakit',
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'completed',
	"invoice_no" varchar(50),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"gib_status" varchar(20) DEFAULT 'not_sent',
	"gib_uuid" varchar(100),
	"gib_sent_at" timestamp with time zone,
	"vat_rate" numeric(5, 2) DEFAULT '20',
	"vat_amount" numeric(15, 2) DEFAULT '0',
	"discount_rate" numeric(5, 2) DEFAULT '0',
	"discount_amount" numeric(15, 2) DEFAULT '0',
	"grand_total" numeric(15, 2) DEFAULT '0',
	"xml_content" text,
	"customer_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer,
	"product_name" varchar(255) NOT NULL,
	"quantity" numeric(15, 3) DEFAULT '1',
	"unit_price" numeric(15, 2) DEFAULT '0',
	"vat_rate" numeric(5, 2) DEFAULT '20',
	"vat_amount" numeric(15, 2) DEFAULT '0',
	"discount_rate" numeric(5, 2) DEFAULT '0',
	"discount_amount" numeric(15, 2) DEFAULT '0',
	"total_amount" numeric(15, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"supplier_name" varchar(255),
	"invoice_no" varchar(50),
	"amount" numeric(10, 2) NOT NULL,
	"invoice_date" date DEFAULT CURRENT_DATE,
	"description" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"subtotal" numeric(15, 2) DEFAULT '0',
	"vat_total" numeric(15, 2) DEFAULT '0',
	"discount_total" numeric(15, 2) DEFAULT '0',
	"is_closed" boolean DEFAULT true,
	"current_account_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "callback_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"method" varchar(10),
	"url" text,
	"headers" text,
	"all_data" text,
	"detected_gsm" varchar(50),
	"detected_msg" text,
	"result" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" varchar(255) NOT NULL,
	"customer_phone" varchar(20) NOT NULL,
	"last_sync" timestamp DEFAULT CURRENT_TIMESTAMP,
	"push_token" varchar(255),
	CONSTRAINT "customer_devices_device_id_key" UNIQUE("device_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "push_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" varchar(20),
	"title" text,
	"body" text,
	"status" varchar(20),
	"error_message" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sms_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"phone_number" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"error_message" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sms_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"provider" varchar(50) DEFAULT 'local_gateway',
	"api_url" text NOT NULL,
	"api_key" text,
	"sender_id" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "sms_settings_company_id_key" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name_tr" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"icon" varchar(10),
	"color" varchar(7),
	"has_medical_consent" boolean DEFAULT false NOT NULL,
	"default_duration_minutes" integer DEFAULT 30 NOT NULL,
	"commission_rate" numeric(4, 2) DEFAULT '5.00' NOT NULL,
	"custom_fields_schema" jsonb,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sectors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sector_service_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"sector_id" integer NOT NULL,
	"name_tr" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"default_duration_minutes" integer,
	"default_price" numeric(10, 2),
	"requires_specialist" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sector_employee_specialties" (
	"id" serial PRIMARY KEY NOT NULL,
	"sector_id" integer NOT NULL,
	"name_tr" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"requires_certification" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_sectors" (
	"company_id" integer NOT NULL,
	"sector_id" integer NOT NULL,
	"sub_specialty" varchar(100),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_sectors_company_id_sector_id_pk" PRIMARY KEY("company_id","sector_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "companies" ADD CONSTRAINT "companies_main_company_id_fkey" FOREIGN KEY ("main_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_users" ADD CONSTRAINT "company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_users" ADD CONSTRAINT "company_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kvkk_requests" ADD CONSTRAINT "kvkk_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "services" ADD CONSTRAINT "services_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "current_accounts" ADD CONSTRAINT "current_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."purchase_invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_current_account_id_fkey" FOREIGN KEY ("current_account_id") REFERENCES "public"."current_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sms_settings" ADD CONSTRAINT "sms_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sector_service_templates" ADD CONSTRAINT "sector_service_templates_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sector_employee_specialties" ADD CONSTRAINT "sector_employee_specialties_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_sectors" ADD CONSTRAINT "company_sectors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_sectors" ADD CONSTRAINT "company_sectors_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_active" ON "companies" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_active_verified" ON "companies" USING btree ("is_active" bool_ops,"is_verified" bool_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_admin_key" ON "companies" USING btree ("admin_key" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_bank_iban" ON "companies" USING btree ("bank_iban" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_board_key" ON "companies" USING btree ("board_key" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_booking_flow" ON "companies" USING btree ("booking_flow" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_city" ON "companies" USING btree ("city" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_city_trgm" ON "companies" USING gist ("city" gist_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_company_type" ON "companies" USING btree ("company_type" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_created_at" ON "companies" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_district" ON "companies" USING btree ("district" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_district_trgm" ON "companies" USING gist ("district" gist_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_is_active" ON "companies" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_is_verified" ON "companies" USING btree ("is_verified" bool_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_license_end_date" ON "companies" USING btree ("license_end_date" timestamptz_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_license_status" ON "companies" USING btree ("license_status" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_location" ON "companies" USING btree ("latitude" numeric_ops,"longitude" numeric_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_main_company_id" ON "companies" USING btree ("main_company_id" int4_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_nace_code" ON "companies" USING btree ("nace_code" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_name" ON "companies" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_name_trgm" ON "companies" USING gist ("name" gist_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_neighborhood" ON "companies" USING btree ("neighborhood" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_qnb_vkn" ON "companies" USING btree ("qnb_vkn" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_search" ON "companies" USING btree ("name" text_ops,"city" text_ops,"district" text_ops,"neighborhood" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_search_tr" ON "companies" USING gin (to_tsvector('turkish'::regconfig, (((((name)::text || ' '::text) || (COALESCE(city, ''::character varying))::text) || ' '::text) || (COALESCE(district, ''::character varying))::text)));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_service_label" ON "companies" USING btree ("service_label" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_sms_enabled" ON "companies" USING btree ("sms_enabled" bool_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_staff_label" ON "companies" USING btree ("staff_label" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_tax_number" ON "companies" USING btree ("tax_number" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_tax_office" ON "companies" USING btree ("tax_office" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_ubl_incoming_alias" ON "companies" USING btree ("ubl_incoming_alias" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_ubl_outgoing_alias" ON "companies" USING btree ("ubl_outgoing_alias" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_updated_at" ON "companies" USING btree ("updated_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_verification_code" ON "companies" USING btree ("verification_code" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kvkk_created" ON "kvkk_requests" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kvkk_email" ON "kvkk_requests" USING btree ("requester_email" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kvkk_status" ON "kvkk_requests" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" USING btree ("role" enum_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointment_services_appointment" ON "appointment_services" USING btree ("appointment_id" int4_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_company" ON "appointments" USING btree ("company_id" int4_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_customer" ON "appointments" USING btree ("customer_id" int4_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_date" ON "appointments" USING btree ("appointment_date" date_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_curr_acc_code" ON "current_accounts" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_curr_acc_company" ON "current_accounts" USING btree ("company_id" int4_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customer_devices_id" ON "customer_devices" USING btree ("device_id" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customer_devices_phone" ON "customer_devices" USING btree ("customer_phone" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_sectors_sector" ON "company_sectors" USING btree ("sector_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();