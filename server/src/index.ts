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

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Root Route
app.get('/', (req, res) => {
    res.send('<h1>Saloon Backend is Live!</h1>');
});

// Health Checks (Explicit)
const healthHandler = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW()');

        // Extract DB Host for debugging (Masking credentials)
        let dbHost = 'Unknown';
        try {
            if (process.env.DATABASE_URL) {
                const url = new URL(process.env.DATABASE_URL);
                dbHost = url.hostname;
            }
        } catch (e) { dbHost = 'Parse Error'; }

        // Check for critical tables
        const tableCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const tableList = tableCheck.rows.map(r => r.table_name);

        res.json({
            success: true,
            db: 'Connected',
            time: result.rows[0].now,
            connected_host: dbHost,
            tables_found: tableList, // Verify if company_users is here
            env: process.env.NODE_ENV
        });
    } catch (error: any) {
        console.error('Health Check Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || String(error) || 'Unknown Error',
            debug: {
                has_db_url: !!process.env.DATABASE_URL,
                node_env: process.env.NODE_ENV
            }
        });
    }
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// API Info
app.get('/api', (req, res) => {
    res.json({ message: 'Saloon API v1.1.0', status: 'running' });
});

// API Routes (Explicit Definition)
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


// Setup Route (For DB Init)
import setupRoutes from './routes/setup.routes';
app.use('/api/setup', setupRoutes);
app.use('/ekuafor/api/setup', setupRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
    console.warn(`[404] ${req.method} ${req.originalUrl} - Bulunamadı`);
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        help: 'Check if you included /api prefix and correct endpoint name'
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

// Auto-migration on startup
const runMigrations = async () => {
    try {
        console.log('🔄 Running auto-migrations...');

        // 1. Core Tables First (Dependency order)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS main_companies (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                address_line TEXT,
                province_id INTEGER,
                province_name VARCHAR(100),
                admin_code VARCHAR(50) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

        await pool.query(`
            CREATE TABLE IF NOT EXISTS customer_devices (
                id SERIAL PRIMARY KEY,
                device_id VARCHAR(255) UNIQUE NOT NULL,
                customer_phone VARCHAR(20) NOT NULL,
                last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

        // 2. Add Columns & References
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20)');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS device_id VARCHAR(255)');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating BETWEEN 1 AND 5)');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS comment TEXT');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES packages(id)');

        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INTEGER');

        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS genders TEXT[]');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_type VARCHAR(20) DEFAULT \'ASIL\'');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS main_company_id INTEGER REFERENCES main_companies(id)');
        await pool.query("UPDATE companies SET genders = '{\"Erkek\", \"Kadın\", \"Çocuk\"}' WHERE genders IS NULL");

        await pool.query('ALTER TABLE services ADD COLUMN IF NOT EXISTS department_id INTEGER');
        await pool.query('UPDATE services SET is_active = true WHERE is_active IS NULL');
        await pool.query('UPDATE packages SET is_active = true WHERE is_active IS NULL');

        // 3. Indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_customer_devices_id ON customer_devices(device_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_customer_devices_phone ON customer_devices(customer_phone)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment ON appointment_services(appointment_id)');

        console.log('✅ Auto-migrations completed.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    }
};

// Start server
const server = app.listen(PORT, async () => {
    await runMigrations();
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
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
