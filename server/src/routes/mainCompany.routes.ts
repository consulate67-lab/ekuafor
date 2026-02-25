import { Router } from 'express';
import MainCompanyController from '../controllers/mainCompany.controller';

const router = Router();

router.post('/', MainCompanyController.create);
router.post('/reports-login', MainCompanyController.reportsLogin);
router.get('/', MainCompanyController.getAll);
router.get('/:id', MainCompanyController.getById);
router.get('/code/:code', MainCompanyController.getByAdminCode);
router.put('/:id', MainCompanyController.update);
router.get('/:id/branches', MainCompanyController.getBranches);
router.get('/:id/reports', MainCompanyController.getReports);

export default router;
