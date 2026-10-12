CREATE TABLE IF NOT EXISTS "class_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"staff_id" integer,
	"resource_id" integer,
	"session_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"capacity" integer NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"series_id" varchar(36),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "class_sessions_capacity_check" CHECK (capacity > 0),
	CONSTRAINT "class_sessions_time_check" CHECK (end_time > start_time),
	CONSTRAINT "class_sessions_status_check" CHECK (status IN ('scheduled', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"resource_type" varchar(30) DEFAULT 'room' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_resources" (
	"service_id" integer NOT NULL,
	"resource_id" integer NOT NULL,
	CONSTRAINT "service_resources_pkey" PRIMARY KEY("service_id","resource_id")
);
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "booking_mode" varchar(10) DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "duration_options" integer[];--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "resource_id" integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "class_session_id" integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "party_size" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "client_request_id" varchar(64);--> statement-breakpoint
ALTER TABLE "sectors" ADD COLUMN "default_booking_mode" varchar(10) DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "sector_service_templates" ADD COLUMN "booking_mode" varchar(10) DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "sector_service_templates" ADD COLUMN "duration_options" integer[];--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resources" ADD CONSTRAINT "resources_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_resources" ADD CONSTRAINT "service_resources_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_resources" ADD CONSTRAINT "service_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_class_sessions_company_date" ON "class_sessions" USING btree ("company_id","session_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_class_sessions_series" ON "class_sessions" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resources_company" ON "resources" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_service_resources_resource" ON "service_resources" USING btree ("resource_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_class_session_id_fkey" FOREIGN KEY ("class_session_id") REFERENCES "public"."class_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_staff_date" ON "appointments" USING btree ("staff_id","appointment_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_resource_date" ON "appointments" USING btree ("resource_id","appointment_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_class_session" ON "appointments" USING btree ("class_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_appointments_client_request" ON "appointments" USING btree ("company_id","client_request_id");--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_booking_mode_check" CHECK (booking_mode IN ('staff', 'resource', 'class'));--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_party_size_check" CHECK (party_size > 0);