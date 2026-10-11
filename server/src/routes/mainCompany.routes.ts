import { Router, Request, Response, NextFunction } from 'express';
import MainCompanyController from '../controllers/mainCompany.controller';
import MainCompanyService from '../services/mainCompany.service';
import { authMiddleware, roleCheck } from '../middleware/auth.middleware';

const router = Router();

const superAdminOnly = [authMiddleware, roleCheck(['super_admin'])];

/** Rapor ekranı: super_admin JWT'si veya ilgili ana firmanın rapor anahtarı (`X-Report-Key`). */
const reportAccess = async (req: Request, res: Response, next: NextFunction) => {
    const reportKey = req.header('x-report-key');
    if (reportKey) {
        try {
            const mainCompany = await (MainCompanyService as any).getByBoardKey(reportKey);
            if (mainCompany && Number(mainCompany.id) === parseInt(req.params.id, 10)) return next();
        } catch (error) {
            return next(error);
        }
        return res.status(403).json({ success: false, error: 'Geçersiz rapor anahtarı' });
    }
    return authMiddleware(req, res, () => roleCheck(['super_admin'])(req, res, next));
};

router.post('/reports-login', MainCompanyController.reportsLogin);
router.get('/:id/reports', reportAccess, MainCompanyController.getReports);

router.post('/', ...superAdminOnly, MainCompanyController.create);
router.get('/', ...superAdminOnly, MainCompanyController.getAll);
router.get('/code/:code', ...superAdminOnly, MainCompanyController.getByAdminCode);
router.get('/:id', ...superAdminOnly, MainCompanyController.getById);
router.put('/:id', ...superAdminOnly, MainCompanyController.update);
router.get('/:id/branches', ...superAdminOnly, MainCompanyController.getBranches);
router.delete('/:id', ...superAdminOnly, MainCompanyController.delete);

export default router;
