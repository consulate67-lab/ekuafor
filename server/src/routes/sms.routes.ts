import { Router, Request, Response } from 'express';
import smsService from '../services/sms.service';
import { authMiddleware, canAccessCompany, requireCompanyAccess } from '../middleware/auth.middleware';

const router = Router();

// companyId = 0 sistem geneli ayarları ifade eder; sadece super_admin erişebilir.
router.use(authMiddleware);

/**
 * @route GET /api/sms/settings/:companyId
 * @desc Get SMS settings for a company
 */
router.get('/settings/:companyId', requireCompanyAccess('companyId', ['company_admin']), async (req: Request, res: Response) => {
    try {
        const settings = await smsService.getSettings(parseInt(req.params.companyId));
        res.json({ success: true, settings });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route POST /api/sms/settings
 * @desc Save SMS settings
 */
router.post('/settings', async (req: Request, res: Response) => {
    try {
        if (!canAccessCompany(req, req.body?.company_id) || !['company_admin', 'super_admin'].includes(req.user!.role)) {
            return res.status(403).json({ success: false, message: 'Bu firmada yetkiniz bulunmuyor.' });
        }
        const settings = await smsService.saveSettings(req.body);
        res.json({ success: true, settings });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route POST /api/sms/send
 * @desc Send a manual SMS (for testing)
 */
router.post('/send', async (req: Request, res: Response) => {
    try {
        const { companyId, phoneNumber, message } = req.body;
        if (companyId === undefined || !phoneNumber || !message) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        if (!canAccessCompany(req, companyId) || !['company_admin', 'super_admin'].includes(req.user!.role)) {
            return res.status(403).json({ success: false, message: 'Bu firmada yetkiniz bulunmuyor.' });
        }

        const result = await smsService.sendSms(companyId, phoneNumber, message);
        if (result) {
            res.json({ success: true, message: 'SMS sent successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to send SMS. Check settings or logs.' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route GET /api/sms/logs/:companyId
 * @desc Get SMS logs for a company
 */
router.get('/logs/:companyId', requireCompanyAccess('companyId', ['company_admin']), async (req: Request, res: Response) => {
    try {
        const logs = await smsService.getLogs(parseInt(req.params.companyId));
        res.json({ success: true, logs });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
