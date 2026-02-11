import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database';

// Routes
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import addressRoutes from './routes/address.routes';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS not allowed'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (Always)
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.1' });
});

// Welcome Message
app.get('/', (req: Request, res: Response) => {
    res.send('<h1>Saloon Backend is Live! (v1.0.1)</h1><p>Visit <a href="/api">/api</a> for more info.</p>');
});

// Root API Check
const apiInfo = (req: Request, res: Response) => {
    res.json({
        message: 'Saloon API is running',
        version: '1.0.1',
        environment: process.env.NODE_ENV || 'development'
    });
};

app.get('/api', apiInfo);
app.get('/api/', apiInfo);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/address', addressRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
});

// Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const server = app.listen(PORT, () => {
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

export default app;
