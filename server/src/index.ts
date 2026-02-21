import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database';

// Routes
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import addressRoutes from './routes/address.routes';
import serviceRoutes from './routes/service.routes';
import appointmentRoutes from './routes/appointment.routes';
import smsRoutes from './routes/sms.routes';
import mapsRoutes from './routes/maps.routes';
import departmentRoutes from './routes/department.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for debugging
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    res.json({ message: 'Saloon API v1.0.5', status: 'running' });
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

app.use('/api/appointments', appointmentRoutes);
app.use('/ekuafor/api/appointments', appointmentRoutes);

app.use('/api/sms', smsRoutes);
app.use('/ekuafor/api/sms', smsRoutes);

app.use('/api/maps', mapsRoutes);
app.use('/ekuafor/api/maps', mapsRoutes);

app.use('/api/departments', departmentRoutes);
app.use('/ekuafor/api/departments', departmentRoutes);

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
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20)');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)');
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
