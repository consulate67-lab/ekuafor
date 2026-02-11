import { Router, Request, Response } from 'express';
import addressService from '../services/address.service';
const router = Router();

/**
 * GET /api/address/provinces
 * Tüm illeri getir
 */
router.get('/provinces', async (req: Request, res: Response) => {
    try {
        const provinces = await addressService.getProvinces();
        res.json({
            success: true,
            data: provinces
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'İller yüklenirken hata oluştu'
        });
    }
});

/**
 * GET /api/address/provinces/:id
 * Belirli bir ili getir
 */
router.get('/provinces/:id', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const province = await addressService.getProvinceById(id);

        if (!province) {
            return res.status(404).json({
                success: false,
                error: 'İl bulunamadı'
            });
        }

        res.json({
            success: true,
            data: province
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'İl yüklenirken hata oluştu'
        });
    }
});

/**
 * GET /api/address/provinces/:provinceId/districts
 * Belirli bir ilin ilçelerini getir
 */
router.get('/provinces/:provinceId/districts', async (req: Request, res: Response) => {
    try {
        const provinceId = parseInt(req.params.provinceId);
        if (isNaN(provinceId)) {
            return res.status(400).json({ success: false, error: 'Geçersiz il ID' });
        }
        const districts = await addressService.getDistricts(provinceId);

        res.json({
            success: true,
            data: districts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'İlçeler yüklenirken hata oluştu'
        });
    }
});

/**
 * GET /api/address/provinces/:provinceId/districts/:districtId/neighborhoods
 * Belirli bir ilçenin mahallelerini getir
 */
router.get('/provinces/:provinceId/districts/:districtId/neighborhoods',
    async (req: Request, res: Response) => {
        try {
            const provinceId = parseInt(req.params.provinceId);
            const districtId = parseInt(req.params.districtId);
            if (isNaN(provinceId) || isNaN(districtId)) {
                return res.status(400).json({ success: false, error: 'Geçersiz il veya ilçe ID' });
            }
            const neighborhoods = await addressService.getNeighborhoods(provinceId, districtId);

            res.json({
                success: true,
                data: neighborhoods
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Mahalleler yüklenirken hata oluştu'
            });
        }
    }
);

export default router;
