import { Router, Request, Response } from 'express';
import employeeService from '../services/employee.service';
import { authMiddleware, requireCompanyAccess } from '../middleware/auth.middleware';
import { pool } from '../db';
import { z } from 'zod';

const router = Router({ mergeParams: true }); // Firma ID'sini parent route'dan almak için

const employeeSchema = z.object({
    user_id: z.number().positive('Geçerli bir kullanıcı seçiniz'),
    role: z.enum(['owner', 'manager', 'staff']).default('staff')
});

/** Fotoğrafı olmayan demo çalışanlar için portre (kalıcı yazılır) */
const DEFAULT_STAFF_PHOTOS: Record<string, string> = {
    'reyah|yilmaz':
        'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=400&h=400&q=80',
    'selim|yilmaz':
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80',
};

function staffPhotoKey(first?: string | null, last?: string | null) {
    const norm = (s: string) =>
        s
            .toLocaleLowerCase('tr-TR')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/ı/g, 'i')
            .trim();
    return `${norm(first || '')}|${norm(last || '')}`;
}

/**
 * GET /api/companies/:companyId/employees
 * Firmanın çalışanlarını listele
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const companyId = parseInt(req.params.companyId);
        let employees = await employeeService.getEmployeesByCompany(companyId);

        for (const emp of employees) {
            if (emp.photo) continue;
            const url = DEFAULT_STAFF_PHOTOS[staffPhotoKey(emp.first_name, emp.last_name)];
            if (!url) continue;
            try {
                await pool.query(`UPDATE users SET photo = $1 WHERE id = $2 AND company_id = $3 AND (photo IS NULL OR photo = '')`, [
                    url,
                    emp.id,
                    companyId,
                ]);
                emp.photo = url;
            } catch {
                emp.photo = url;
            }
        }

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
router.post('/', authMiddleware, requireCompanyAccess('companyId', ['company_admin']), async (req: Request, res: Response) => {
    try {
        const companyId = parseInt(req.params.companyId);
        const validatedData = employeeSchema.parse(req.body);

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
router.delete('/:employeeId', authMiddleware, requireCompanyAccess('companyId', ['company_admin']), async (req: Request, res: Response) => {
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
