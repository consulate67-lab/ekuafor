import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import reportService from '../services/report.service';

const router = Router();

/**
 * GET /api/reports/employee-stats
 * Get statistics for the logged-in employee (staff member)
 */
router.get('/employee-stats', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        const period = (req.query.period as 'today' | 'week' | 'month' | 'year') || 'today';

        // If user is an admin, they see company total. If staff, they see their own.
        const staffId = req.user?.role === 'company_admin' ? undefined : req.user?.userId;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Firma bilgisi eksik' });
        }

        const localDate = req.query.local_date as string;
        const stats = await reportService.getEmployeeStats(companyId, staffId as any, period, localDate);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Report Error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Raporlar yüklenirken hata oluştu'
        });
    }
});

/**
 * GET /api/reports/company-detailed
 * Get comprehensive reports for company admin
 */
router.get('/company-detailed', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        const role = req.user?.role;
        const period = (req.query.period as 'today' | 'week' | 'month' | 'year') || 'today';

        if (!companyId || role !== 'company_admin') {
            return res.status(403).json({ success: false, error: 'Yetkisiz erişim' });
        }

        const localDate = req.query.local_date as string;
        const reports = await reportService.getDetailedCompanyReports(companyId, period, localDate);

        res.json({
            success: true,
            data: reports
        });
    } catch (error) {
        console.error('Detailed Report Error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Detaylı raporlar yüklenirken hata oluştu'
        });
    }
});

export default router;
