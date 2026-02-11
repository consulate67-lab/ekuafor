import { Router, Request, Response } from 'express';
import employeeService from '../services/employee.service';
import { authMiddleware, roleCheck } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router({ mergeParams: true }); // Firma ID'sini parent route'dan almak için

const employeeSchema = z.object({
    user_id: z.number().positive('Geçerli bir kullanıcı seçiniz'),
    role: z.enum(['owner', 'manager', 'staff']).default('staff')
});

/**
 * GET /api/companies/:companyId/employees
 * Firmanın çalışanlarını listele
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const companyId = parseInt(req.params.companyId);
        const employees = await employeeService.getEmployeesByCompany(companyId);

        res.json({
            success: true,
            data: employees
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Çalışanlar yüklenirken hata oluştu'
        });
    }
});

/**
 * POST /api/companies/:companyId/employees
 * Firmaya çalışan ekle
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = parseInt(req.params.companyId);
        const validatedData = employeeSchema.parse(req.body);

        // TODO: Burada işlem yapan kişinin firma sahibi olup olmadığı kontrol edilebilir

        const employee = await employeeService.addEmployee(
            companyId,
            validatedData.user_id,
            validatedData.role
        );

        res.status(201).json({
            success: true,
            data: employee
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validasyon hatası', details: error.errors });
        }
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Çalışan eklenirken hata oluştu'
        });
    }
});

/**
 * DELETE /api/companies/:companyId/employees/:employeeId
 * Çalışanı çıkar
 */
router.delete('/:employeeId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = parseInt(req.params.companyId);
        const employeeId = parseInt(req.params.employeeId);

        const success = await employeeService.removeEmployee(companyId, employeeId);

        if (!success) {
            return res.status(404).json({ success: false, error: 'Çalışan bulunamadı' });
        }

        res.json({ success: true, message: 'Çalışan başarıyla çıkarıldı' });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Çalışan çıkarılırken hata oluştu'
        });
    }
});

export default router;
