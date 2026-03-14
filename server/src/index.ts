import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database';

// Routes
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import addressRoutes from './routes/address.routes';
import serviceRoutes from './routes/service.routes';
import packageRoutes from './routes/package.routes';
import appointmentRoutes from './routes/appointment.routes';
import smsRoutes from './routes/sms.routes';
import mapsRoutes from './routes/maps.routes';
import departmentRoutes from './routes/department.routes';
import reportRoutes from './routes/report.routes';
import mainCompanyRoutes from './routes/mainCompany.routes';
import financeRoutes from './routes/finance.routes';
import generatorRoutes from './routes/generator.routes';
import paymentRoutes from './routes/payment.routes';
import expenseRoutes from './routes/expense.routes';
import companyService from './services/company.service';
import cronService from './services/cron.service';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Cron Jobs
cronService.init();

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for debugging
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Detailed Request Logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[REQ] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// --- GLOBAL TEST & HEALTH ROUTES ---
const commonPing = (req: Request, res: Response) => res.json({
    status: 'pong',
    time: new Date().toISOString(),
    version: '1.69.11-NETGSM-FIX',
    port: PORT
});

const commonVerify = async (req: Request, res: Response) => {
    try {
        const { gsm, msg } = req.query;
        console.log(`[VerifyTest] Global Call. GSM: ${gsm}, MSG: ${msg}`);
        if (!gsm || !msg) return res.json({ success: false, error: 'GSM ve MSG eksik' });
        const company = await companyService.verifyBySmsCode(String(msg), String(gsm));
        res.json({
            success: !!company,
            name: company?.name || 'BULUNAMADI',
            status: !!company ? 'APPROVED' : 'PENDING'
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};

// Map these routes everywhere they might be called
app.get('/ping', commonPing);
app.get('/api/ping', commonPing);
app.get('/ekuafor/api/ping', commonPing);

app.get('/verify-test', commonVerify);
app.get('/api/verify-test', commonVerify);
app.get('/api/companies/verify-test', commonVerify);
app.get('/ekuafor/api/verify-test', commonVerify);
app.get('/ekuafor/api/companies/verify-test', commonVerify);

// Root Route
app.get('/', (req, res) => {
    res.send('<h1>Salon Cebinde Backend is Live!</h1> <p>Try <a href="/api/ping">/api/ping</a></p>');
});

// Health Checks (Explicit)
const healthHandler = async (req: Request, res: Response) => {
    console.log('[Health] Request received');
    let dbStatus = 'Pending';
    try {
        const result = await pool.query('SELECT NOW()');
        dbStatus = result ? 'Connected' : 'Error';
    } catch (err: any) {
        dbStatus = 'Critical Error: ' + err.message;
    }
    res.json({ success: true, db: dbStatus, timestamp: new Date().toISOString() });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/ekuafor/api/health', healthHandler);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/ekuafor/api/auth', authRoutes);

app.use('/api/companies', companyRoutes);
app.use('/ekuafor/api/companies', companyRoutes);

app.use('/api/address', addressRoutes);
app.use('/ekuafor/api/address', addressRoutes);

app.use('/api/services', serviceRoutes);
app.use('/ekuafor/api/services', serviceRoutes);

app.use('/api/packages', packageRoutes);
app.use('/ekuafor/api/packages', packageRoutes);

app.use('/api/appointments', appointmentRoutes);
app.use('/ekuafor/api/appointments', appointmentRoutes);

app.use('/api/sms', smsRoutes);
app.use('/ekuafor/api/sms', smsRoutes);

app.use('/api/maps', mapsRoutes);
app.use('/ekuafor/api/maps', mapsRoutes);

app.use('/api/departments', departmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/ekuafor/api/reports', reportRoutes);

app.use('/api/main-companies', mainCompanyRoutes);
app.use('/ekuafor/api/main-companies', mainCompanyRoutes);

app.use('/api/finance', financeRoutes);
app.use('/ekuafor/api/finance', financeRoutes);

app.use('/api/generator', generatorRoutes);
app.use('/ekuafor/api/generator', generatorRoutes);

app.use('/api/payments', paymentRoutes);
app.use('/ekuafor/api/payments', paymentRoutes);

app.use('/api/expenses', expenseRoutes);
app.use('/ekuafor/api/expenses', expenseRoutes);


// Setup Route (For DB Init)
import setupRoutes from './routes/setup.routes';
app.use('/api/setup', setupRoutes);
app.use('/ekuafor/api/setup', setupRoutes);

// 404 Handler - Catch everything else
app.all('*', (req: Request, res: Response) => {
    console.warn(`[404] ${req.method} ${req.originalUrl} - Not Found`);
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        help: 'Verify the URL and API prefix (e.g., /api/ping or /ekuafor/api/ping)'
    });
});

// Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('------------------------------------------------');
    console.error(`[Global Error Handler] Error at ${req.method} ${req.originalUrl}`);
    console.error('Message:', err.message);
    if (err.stack) console.error('Stack:', err.stack);
    if (err.response) console.error('Axios/Ext Response:', err.response.data);
    console.error('------------------------------------------------');

    // Prevent crashing if headers sent
    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message || 'Sunucu hatası',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const runMigrations = async () => {
    let client;
    try {
        console.log('🔄 Running auto-migrations...');
        client = await pool.connect();

        // 0. Enum Types
        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
                    CREATE TYPE user_role AS ENUM ('super_admin', 'company_admin', 'customer', 'staff');
                ELSE
                    -- Add staff if not exists in enum
                    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'staff') THEN
                        ALTER TYPE user_role ADD VALUE 'staff';
                    END IF;
                END IF;
            END $$;
        `);

        // 1. Core Tables First (Dependency order)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role user_role NOT NULL DEFAULT 'customer',
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                company_id INTEGER,
                board_code VARCHAR(20) UNIQUE,
                gender VARCHAR(10),
                department_id INTEGER,
                photo TEXT,
                is_active BOOLEAN DEFAULT true,
                is_phone_verified BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS companies (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                phone VARCHAR(20),
                email VARCHAR(255),
                website VARCHAR(255),
                address_line TEXT,
                city VARCHAR(100),
                district VARCHAR(100),
                neighborhood VARCHAR(100),
                postal_code VARCHAR(10),
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                bank_name VARCHAR(255),
                bank_branch VARCHAR(255),
                iban VARCHAR(34),
                account_holder_name VARCHAR(255),
                work_start_time VARCHAR(10) DEFAULT '08:00',
                work_end_time VARCHAR(10) DEFAULT '20:00',
                slot_interval INTEGER DEFAULT 30,
                genders TEXT[],
                commission_rate DECIMAL(5, 2) DEFAULT 0.00,
                payment_enabled BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                is_verified BOOLEAN DEFAULT false,
                created_by INTEGER REFERENCES users(id),
                admin_key VARCHAR(20) UNIQUE,
                board_key VARCHAR(20) UNIQUE,
                company_type VARCHAR(20) DEFAULT 'ASIL',
                main_company_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS main_companies (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                address_line TEXT,
                city VARCHAR(100),
                district VARCHAR(100),
                admin_code VARCHAR(50) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS services (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                duration_minutes INTEGER NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                department_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS working_hours (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointments (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                customer_id INTEGER REFERENCES users(id),
                service_id INTEGER REFERENCES services(id),
                staff_id INTEGER REFERENCES users(id),
                appointment_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                notes TEXT,
                price DECIMAL(10, 2),
                payment_status VARCHAR(50) DEFAULT 'unpaid',
                payment_method VARCHAR(50),
                customer_phone VARCHAR(20),
                customer_name VARCHAR(255),
                device_id VARCHAR(255),
                rating INTEGER CHECK (rating BETWEEN 1 AND 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS packages (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                duration_minutes INTEGER NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                staff_id INTEGER REFERENCES users(id),
                department_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES packages(id)');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS package_services (
                id SERIAL PRIMARY KEY,
                package_id INTEGER REFERENCES packages(id) ON DELETE CASCADE,
                service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
                staff_id INTEGER REFERENCES users(id),
                department_id INTEGER,
                order_index INTEGER DEFAULT 0
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointment_services (
                id SERIAL PRIMARY KEY,
                appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
                service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
                price DECIMAL(10, 2),
                duration_minutes INTEGER,
                staff_id INTEGER REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'pending',
                start_time VARCHAR(5),
                end_time VARCHAR(5),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                appointment_id INTEGER REFERENCES appointments(id),
                company_id INTEGER REFERENCES companies(id),
                amount DECIMAL(10, 2) NOT NULL,
                commission_amount DECIMAL(10, 2) DEFAULT 0.00,
                net_amount DECIMAL(10, 2) NOT NULL,
                payment_method VARCHAR(50),
                payment_status VARCHAR(50) DEFAULT 'pending',
                transaction_id VARCHAR(255),
                transaction_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS sms_settings (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                provider VARCHAR(50) DEFAULT 'local_gateway',
                api_url TEXT NOT NULL,
                api_key TEXT,
                sender_id VARCHAR(50),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id)
            )
        `);

        // Migration: Make company_id nullable if it's already created
        await pool.query('ALTER TABLE sms_settings ALTER COLUMN company_id DROP NOT NULL');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS customer_devices (
                id SERIAL PRIMARY KEY,
                device_id VARCHAR(255) UNIQUE NOT NULL,
                customer_phone VARCHAR(20) NOT NULL,
                push_token VARCHAR(255),
                last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS push_logs (
                id SERIAL PRIMARY KEY,
                phone_number VARCHAR(20),
                title TEXT,
                body TEXT,
                status VARCHAR(20),
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS company_users (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(50) DEFAULT 'staff',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id, user_id)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS otp_codes (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_used BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS sms_logs (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                phone_number VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS current_accounts (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                code VARCHAR(50),
                name VARCHAR(255) NOT NULL,
                title VARCHAR(255),
                tax_office VARCHAR(100),
                tax_number VARCHAR(20),
                type VARCHAR(20) DEFAULT 'ALL', -- CUSTOMER, SUPPLIER, ALL
                phone VARCHAR(20),
                email VARCHAR(255),
                website VARCHAR(255),
                address_line TEXT,
                city VARCHAR(100),
                district VARCHAR(100),
                country VARCHAR(100) DEFAULT 'Türkiye',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_curr_acc_company ON current_accounts(company_id);
            CREATE INDEX IF NOT EXISTS idx_curr_acc_code ON current_accounts(code);

            -- Ensure current_accounts has standardized address fields
            ALTER TABLE current_accounts ADD COLUMN IF NOT EXISTS city VARCHAR(100);
            ALTER TABLE current_accounts ADD COLUMN IF NOT EXISTS district VARCHAR(100);
            ALTER TABLE current_accounts ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);
        `);

        // Finance Module Tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
                customer_name VARCHAR(255),
                customer_tax_number VARCHAR(20),
                customer_tax_office VARCHAR(100),
                type VARCHAR(20) DEFAULT 'e-arsiv', -- e-fatura, e-arsiv, fis
                payment_method VARCHAR(20) DEFAULT 'nakit', -- nakit, kart
                amount DECIMAL(10, 2) NOT NULL,
                status VARCHAR(20) DEFAULT 'completed',
                invoice_no VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS purchase_invoices (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                current_account_id INTEGER REFERENCES current_accounts(id) ON DELETE SET NULL,
                supplier_name VARCHAR(255),
                invoice_no VARCHAR(50),
                amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
                subtotal DECIMAL(15, 2) DEFAULT 0,
                vat_total DECIMAL(15, 2) DEFAULT 0,
                discount_total DECIMAL(15, 2) DEFAULT 0,
                invoice_date DATE DEFAULT CURRENT_DATE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS purchase_invoice_items (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER REFERENCES purchase_invoices(id) ON DELETE CASCADE,
                product_name VARCHAR(255) NOT NULL,
                quantity NUMERIC(15, 3) DEFAULT 1,
                unit_price DECIMAL(15, 2) DEFAULT 0,
                vat_rate NUMERIC(5, 2) DEFAULT 20,
                vat_amount DECIMAL(15, 2) DEFAULT 0,
                discount_rate NUMERIC(5, 2) DEFAULT 0,
                discount_amount DECIMAL(15, 2) DEFAULT 0,
                total_amount DECIMAL(15, 2) DEFAULT 0
            );
        `);

        await pool.query(`
            ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS current_account_id INTEGER REFERENCES current_accounts(id) ON DELETE SET NULL;
            ALTER TABLE purchase_invoices ALTER COLUMN supplier_name DROP NOT NULL;
            
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
            -- We don't need current_account_id for sales invoices as per user request
            -- ALTER TABLE invoices ADD COLUMN IF NOT EXISTS current_account_id INTEGER REFERENCES current_accounts(id) ON DELETE SET NULL;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS cash_transactions (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                type VARCHAR(10) NOT NULL, -- income, expense
                category VARCHAR(50), -- sales, purchase, general_expense, payment, devir
                payment_method VARCHAR(20) DEFAULT 'nakit', -- nakit, kart
                amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
                debit DECIMAL(15, 2) DEFAULT 0,
                credit DECIMAL(15, 2) DEFAULT 0,
                description TEXT,
                transaction_date DATE DEFAULT CURRENT_DATE,
                due_date DATE, -- For card payments
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS callback_logs (
                id SERIAL PRIMARY KEY,
                method VARCHAR(10),
                url TEXT,
                headers TEXT,
                all_data TEXT,
                detected_gsm VARCHAR(50),
                detected_msg TEXT,
                result TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Add Columns & References (Incremental updates for existing tables)
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20)');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS device_id VARCHAR(255)');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating BETWEEN 1 AND 5)');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS comment TEXT');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS iyzico_token VARCHAR(255)');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255)');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS used_materials TEXT');

        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INTEGER');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(100) DEFAULT \'Personel\'');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT false');
        await pool.query('ALTER TABLE customer_devices ADD COLUMN IF NOT EXISTS push_token VARCHAR(255)');

        try {
            await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS genders TEXT[]');
            await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_type VARCHAR(20) DEFAULT \'ASIL\'');
            await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS main_company_id INTEGER');
            await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100)');
            await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS district VARCHAR(100)');
            await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100)');
            await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS sub_merchant_key VARCHAR(255)');
            await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS iyzico_commission_rate DECIMAL(5, 2) DEFAULT 0.00');
            await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_iban VARCHAR(34)');
            await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100)');
            await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS license_end_date TIMESTAMP WITH TIME ZONE');
            await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS license_status VARCHAR(20) DEFAULT \'active\'');

            await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2)');
            await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS collected_price DECIMAL(10, 2)');

            // Migrate existing address data if new columns are empty (Legacy - column province_name removed)
            try {
                // We check if the columns exist first in the query to avoid errors
                await pool.query(`
                    DO $$ 
                    BEGIN
                        -- Migrate province_name
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'province_name') THEN
                            UPDATE companies SET city = province_name WHERE (city IS NULL OR city = '') AND province_name IS NOT NULL AND province_name != '';
                        END IF;
                        -- Migrate district_name
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'district_name') THEN
                            UPDATE companies SET district = district_name WHERE (district IS NULL OR district = '') AND district_name IS NOT NULL AND district_name != '';
                        END IF;
                        -- Migrate neighborhood_name
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'neighborhood_name') THEN
                            UPDATE companies SET neighborhood = neighborhood_name WHERE (neighborhood IS NULL OR neighborhood = '') AND neighborhood_name IS NOT NULL AND neighborhood_name != '';
                        END IF;
                    END $$;
                `);
            } catch (e) { }

            // Drop ANY and ALL existing constraints on main_company_id column
            await pool.query(`
                DO $$ 
                DECLARE r RECORD;
                BEGIN
                    FOR r IN (SELECT constraint_name FROM information_schema.key_column_usage 
                              WHERE table_name = 'companies' AND column_name = 'main_company_id') 
                    LOOP
                        EXECUTE 'ALTER TABLE companies DROP CONSTRAINT ' || quote_ident(r.constraint_name) || ' CASCADE';
                    END LOOP;
                END $$;
            `);

            // --- DATA UNIFICATION MIGRATION (One-time) ---
            const mainCount = await pool.query('SELECT COUNT(*) FROM main_companies');
            const unifiedCount = await pool.query('SELECT COUNT(*) FROM companies WHERE company_type = \'ÜST FİRMA\'');

            if (parseInt(mainCount.rows[0].count) > 0 && parseInt(unifiedCount.rows[0].count) === 0) {
                console.log('📦 Migrating legacy main_companies to companies table...');
                await pool.query(`
                    INSERT INTO companies (
                        name, description, address_line, city, district, 
                        company_type, is_active, created_at, admin_key
                    )
                    SELECT 
                        name, description, address_line, city, district, 
                        'ÜST FİRMA', is_active, created_at, admin_code
                    FROM main_companies
                `);

                // Re-link branches using names
                await pool.query(`
                    UPDATE companies c
                    SET main_company_id = m_new.id
                    FROM main_companies m_old
                    JOIN companies m_new ON m_new.name = m_old.name AND m_new.company_type = 'ÜST FİRMA'
                    WHERE c.main_company_id = m_old.id
                    AND c.company_type = 'ŞUBE'
                `);
                console.log('✅ Data migration and re-linking completed.');
            }

            // Cleanup invalid IDs that don't exist in companies table before adding FK
            await pool.query(`
                UPDATE companies 
                SET main_company_id = NULL 
                WHERE main_company_id IS NOT NULL 
                AND main_company_id NOT IN (SELECT id FROM companies)
            `);

            // Set default board_key for existing ÜST FİRMA entries if missing
            await pool.query(`
        UPDATE companies 
        SET board_key = admin_key 
        WHERE company_type = 'ÜST FİRMA' 
        AND (board_key IS NULL OR board_key = '')
    `);

            await pool.query('ALTER TABLE companies ADD CONSTRAINT companies_main_company_id_fkey FOREIGN KEY (main_company_id) REFERENCES companies(id)');
            console.log('✅ Company hierarchy hierarchy migration completed.');
        } catch (fkErr: any) {
            console.warn('⚠️ Company FK Migration warning (non-fatal):', fkErr.message);
        }
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_line2 TEXT');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_rules TEXT');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS photo TEXT');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS building_number VARCHAR(20)');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS door_number VARCHAR(20)');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS nace_code VARCHAR(20)');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS fax_number VARCHAR(20)');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_number VARCHAR(20)');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_office VARCHAR(100)');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS qnb_username VARCHAR(100)');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS qnb_password VARCHAR(100)');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS qnb_vkn VARCHAR(20)');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS efatura_test_mode BOOLEAN DEFAULT true');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR(10) DEFAULT \'GIB\'');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS ubl_incoming_alias VARCHAR(255)');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS ubl_outgoing_alias VARCHAR(255)');
        await pool.query("UPDATE companies SET genders = '{\"Erkek\", \"Kadın\", \"Çocuk\", \"Güzellik Merkezi\"}' WHERE genders IS NULL");

        await pool.query('ALTER TABLE services ADD COLUMN IF NOT EXISTS department_id INTEGER');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT true');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS booking_flow VARCHAR(10) DEFAULT \'SPDT\'');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS staff_label VARCHAR(50) DEFAULT \'Personel\'');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS service_label VARCHAR(50) DEFAULT \'Hizmet\'');
        await pool.query('ALTER TABLE services ADD COLUMN IF NOT EXISTS quantity NUMERIC');
        await pool.query('ALTER TABLE services ADD COLUMN IF NOT EXISTS unit VARCHAR(30)');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS quantity NUMERIC');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS unit VARCHAR(30)');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100)');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(100)');
        await pool.query('ALTER TABLE services ADD COLUMN IF NOT EXISTS photo TEXT');
        await pool.query('UPDATE services SET is_active = true WHERE is_active IS NULL');
        await pool.query('UPDATE packages SET is_active = true WHERE is_active IS NULL');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_iban VARCHAR(34)');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10)');

        // 3. Triggers & Functions
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        const triggers = [
            { table: 'users', name: 'update_users_updated_at' },
            { table: 'companies', name: 'update_companies_updated_at' },
            { table: 'services', name: 'update_services_updated_at' },
            { table: 'appointments', name: 'update_appointments_updated_at' }
        ];

        for (const tg of triggers) {
            await pool.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${tg.name}') THEN
                        CREATE TRIGGER ${tg.name} BEFORE UPDATE ON ${tg.table} FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                    END IF;
                END $$;
            `);
        }

        // 4. Seeding (Super Admin)
        await pool.query(`
            INSERT INTO users (email, password, role, first_name, last_name, phone, is_active)
            VALUES (
                'sarpyilmaz@saloncebinde.com',
                '$2a$10$Ba0KuHHWuOcEFC/OnP/6gu3CFAcF.Z.4iz2h.ira1C0.xH4vdy4a6',
                'super_admin',
                'sarp',
                'yılmaz',
                '5336660125',
                true
            )
            ON CONFLICT (email) 
            DO UPDATE SET
                password  = EXCLUDED.password,
                role      = 'super_admin',
                is_active = true
        `);

        // 5. Indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_customer_devices_id ON customer_devices(device_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_customer_devices_phone ON customer_devices(customer_phone)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment ON appointment_services(appointment_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_appointments_company ON appointments(company_id)');
        // Performance Extensions
        await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING gist (name gist_trgm_ops)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_city_trgm ON companies USING gist (city gist_trgm_ops)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_district_trgm ON companies USING gist (district gist_trgm_ops)');

        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_search_tr ON companies USING gin (to_tsvector(\'turkish\', name || \' \' || COALESCE(city, \'\') || \' \' || COALESCE(district, \'\')));');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_search ON companies (name, city, district, neighborhood)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_active_verified ON companies(is_active, is_verified)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_main_company_id ON companies(main_company_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_is_verified ON companies(is_verified)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_admin_key ON companies(admin_key)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_board_key ON companies(board_key)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_district ON companies(district)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_neighborhood ON companies(neighborhood)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_company_type ON companies(company_type)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_updated_at ON companies(updated_at)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_license_status ON companies(license_status)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_license_end_date ON companies(license_end_date)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_tax_number ON companies(tax_number)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_tax_office ON companies(tax_office)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_nace_code ON companies(nace_code)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_qnb_vkn ON companies(qnb_vkn)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_ubl_incoming_alias ON companies(ubl_incoming_alias)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_ubl_outgoing_alias ON companies(ubl_outgoing_alias)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_sms_enabled ON companies(sms_enabled)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_booking_flow ON companies(booking_flow)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_staff_label ON companies(staff_label)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_service_label ON companies(service_label)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_bank_iban ON companies(bank_iban)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_companies_verification_code ON companies(verification_code)');

        console.log('✅ Auto-migrations and seeding completed.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        if (client) client.release();
    }
};

// Start server
const server = app.listen(PORT, () => {
    console.log('================================================');
    console.log(`🚀 SERVIS CALISIYOR! PORT: ${PORT}`);
    console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🔗 DB_URL_TEST: ${process.env.DATABASE_URL ? 'VAR' : 'YOK'}`);
    console.log('================================================');

    // Run migrations in background
    setTimeout(async () => {
        console.log('🏁 Starting background migrations...');
        try {
            await runMigrations();
        } catch (e) {
            console.error('🔥 Background migration failed:', e);
        }
    }, 5000);
});

// Graceful shutdown
const shutdown = async () => {
    console.log('Shutting down server...');
    server.close(async () => {
        console.log('HTTP server closed.');
        await pool.end();
        console.log('Database pool closed.');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    // Keep running if possible or exit gracefully
    // process.exit(1); // Standard practice is to exit, but for debugging connection refused, let's see.
});

process.on('unhandledRejection', (err: any) => {
    console.error('UNHANDLED REJECTION! 💥');
    console.error(err.name, err.message);
});

export default app;
