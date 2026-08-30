import { Express, Request, Response } from 'express';
import companyService from '../services/company.service';

// Routes
import authRoutes from './auth.routes';
import companyRoutes from './company.routes';
import addressRoutes from './address.routes';
import serviceRoutes from './service.routes';
import packageRoutes from './package.routes';
import appointmentRoutes from './appointment.routes';
import smsRoutes from './sms.routes';
import mapsRoutes from './maps.routes';
import departmentRoutes from './department.routes';
import reportRoutes from './report.routes';
import mainCompanyRoutes from './mainCompany.routes';
import financeRoutes from './finance.routes';
import generatorRoutes from './generator.routes';
import paymentRoutes from './payment.routes';
import expenseRoutes from './expense.routes';
import aiRoutes from './ai.routes';
import inventoryRoutes from './inventory.routes';
import setupRoutes from './setup.routes';
import adminRoutes from './admin.routes';
import kvkkRoutes from './kvkk.routes';

const commonPing = (req: Request, res: Response) => res.json({
    status: 'pong',
    time: new Date().toISOString(),
    version: '1.69.11-NETGSM-FIX',
    port: process.env.PORT || 3000
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

const healthHandler = async (req: Request, res: Response) => {
    console.log('[Health] Request received');
    let dbStatus = 'Pending';
    try {
        const pool = (await import('../config/database')).default;
        const result = await pool.query('SELECT NOW()');
        dbStatus = result ? 'Connected' : 'Error';
    } catch (err: any) {
        dbStatus = 'Critical Error: ' + err.message;
    }
    res.json({ success: true, db: dbStatus, timestamp: new Date().toISOString() });
};

/**
 * Tüm route'ları /api/* altında toplar.
 *
 * ESKİ: Her route 3 prefix ile mount edilmişti (/auth, /api/auth, /ekuafor/api/auth).
 * YENİ: Sadece /api/* (client zaten /api kullanıyor, eski prefix'ler kimse tarafından
 *       çağrılmıyordu).
 */
export const mountRoutes = (app: Express) => {
    // Health & Debug Endpoints
    app.get('/ping', commonPing);
    app.get('/api/ping', commonPing);
    app.get('/verify-test', commonVerify);
    app.get('/api/verify-test', commonVerify);
    app.get('/api/companies/verify-test', commonVerify);
    app.get('/health', healthHandler);
    app.get('/api/health', healthHandler);

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/companies', companyRoutes);
    app.use('/api/address', addressRoutes);
    app.use('/api/services', serviceRoutes);
    app.use('/api/packages', packageRoutes);
    app.use('/api/appointments', appointmentRoutes);
    app.use('/api/sms', smsRoutes);
    app.use('/api/maps', mapsRoutes);
    app.use('/api/departments', departmentRoutes);
    app.use('/api/reports', reportRoutes);
    app.use('/api/main-companies', mainCompanyRoutes);
    app.use('/api/finance', financeRoutes);
    app.use('/api/generator', generatorRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/expenses', expenseRoutes);
    app.use('/api/inventory', inventoryRoutes);
    app.use('/api/setup', setupRoutes);
    app.use('/api/ai', aiRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/kvkk', kvkkRoutes);

    // 404 Catch-all
    app.all('*', (req: Request, res: Response) => {
        console.warn(`[404] ${req.method} ${req.originalUrl} - Not Found`);
        res.status(404).json({
            success: false,
            error: 'Route not found',
            path: req.originalUrl,
            method: req.method,
            help: 'Verify the URL and API prefix (e.g., /api/ping)'
        });
    });
};