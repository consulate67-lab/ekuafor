import { Router, Request, Response } from 'express';
import googleMapsService from '../services/google-maps.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Google Maps üzerinde işletme ara
router.get('/search', authMiddleware, async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
        const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

        if (!query) {
            return res.status(400).json({ success: false, error: 'Arama terimi (q) gereklidir' });
        }

        const results = await googleMapsService.searchBusinesses(query, lat, lng);
        res.json({ success: true, data: results });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Detaylı işletme bilgisi getir
router.get('/details/:placeId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { placeId } = req.params;
        const details = await googleMapsService.getPlaceDetails(placeId);
        res.json({ success: true, data: details });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
