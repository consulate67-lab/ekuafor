import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

/**
 * GET /api/departments?company_id=X
 * Firma departmanlarını listele
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { company_id } = req.query;
        if (!company_id) {
            return res.status(400).json({ success: false, error: 'company_id gereklidir' });
        }

        const result = await pool.query(
            'SELECT * FROM departments WHERE company_id = $1 ORDER BY name',
            [company_id]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Departmanlar yüklenirken hata oluştu'
        });
    }
});

/**
 * POST /api/departments
 * Yeni departman oluştur
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { company_id, name } = req.body;
        if (!company_id || !name) {
            return res.status(400).json({ success: false, error: 'company_id ve name gereklidir' });
        }

        const result = await pool.query(
            'INSERT INTO departments (company_id, name) VALUES ($1, $2) RETURNING *',
            [company_id, name]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Departman oluşturulurken hata oluştu'
        });
    }
});

/**
 * DELETE /api/departments/:id
 * Departman sil
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM departments WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Departman silinirken hata oluştu'
        });
    }
});

export default router;
