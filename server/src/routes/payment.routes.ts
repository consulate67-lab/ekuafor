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

export default router;
