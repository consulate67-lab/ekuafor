import { Router, Request, Response } from 'express';
import paymentService from '../services/payment.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/payments/initialize
 * Initialize payment for an appointment
 */
router.post('/initialize', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { appointment_id } = req.body;
        const customerIp = req.ip || '127.0.0.1';

        if (!appointment_id) {
            return res.status(400).json({ success: false, error: 'Randevu ID gereklidir' });
        }

        const result = await paymentService.initializeIyzico(appointment_id, customerIp);

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Ödeme başlatılamadı'
        });
    }
});

/**
 * POST /api/payments/callback
 * Iyzico success callback
 */
router.post('/callback', async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, error: 'Token gereklidir' });
        }

        const result = await paymentService.processCallback(token);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Ödeme doğrulanamadı'
        });
    }
});

/**
 * POST /api/payments/ceppos/initialize
 * Initialize SoftPOS (Cep POS) payment for staff
 */
router.post('/ceppos/initialize', authMiddleware, async (req: any, res: Response) => {
    try {
        const { appointment_id, amount } = req.body;
        const companyId = req.user.company_id;
        const staffId = req.user.id;

        if (!appointment_id || !amount) {
            return res.status(400).json({ success: false, error: 'Eksik bilgi: appointment_id ve amount gereklidir' });
        }

        const result = await paymentService.initializeCepPos(appointment_id, companyId, staffId, amount);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Cep POS başlatılamadı'
        });
    }
});

/**
 * POST /api/payments/license/initialize
 * Initialize payment for license renewal
 */
router.post('/license/initialize', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { months } = req.body;
        const companyId = (req as any).user.companyId;

        if (!companyId) {
            return res.status(400).json({ success: false, error: 'Firma ID bulunamadı' });
        }

        const result = await paymentService.initializeLicenseRenewal(companyId, months || 12);

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Lisans yenileme başlatılamadı'
        });
    }
});

/**
 * POST /api/payments/license/callback
 * License renewal callback from Iyzico
 */
router.post('/license/callback', async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, error: 'Token gereklidir' });
        }

        const result = await paymentService.processLicenseCallback(token);

        if (result.success) {
            // Redirect to dashboard with success message or just send JSON
            // For SPA, usually we'd redirect back to the app with a status
            res.send(`
                <html>
                    <body>
                        <h1>Ödeme Başarılı!</h1>
                        <p>Lisansınız başarıyla yenilendi. Yönlendiriliyorsunuz...</p>
                        <script>
                            setTimeout(() => {
                                window.location.href = '/dashboard?payment=success';
                            }, 3000);
                        </script>
                    </body>
                </html>
            `);
        } else {
            res.status(400).send(`
                <html>
                    <body>
                        <h1>Ödeme Başarısız</h1>
                        <p>${result.message}</p>
                        <button onclick="window.location.href='/dashboard'">Geri Dön</button>
                    </body>
                </html>
            `);
        }
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Ödeme doğrulanamadı'
        });
    }
});

export default router;
