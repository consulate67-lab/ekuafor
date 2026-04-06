import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, roleCheck } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/inventory/products
 * List all products for the company (including global ones)
 */
router.get('/products', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = req.user!.companyId;
        const result = await pool.query(
            `SELECT p.*, c.name as category_name, s.quantity as current_stock
             FROM inventory_products p
             LEFT JOIN inventory_categories c ON p.category_id = c.id
             LEFT JOIN inventory_stocks s ON s.product_id = p.id AND s.company_id = $1
             WHERE p.company_id = $1 OR p.company_id IS NULL
             ORDER BY p.brand, p.name`,
            [companyId]
        );
        res.json({ success: true, data: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/inventory/products
 * Create a new product
 */
router.post('/products', authMiddleware, roleCheck(['company_admin', 'super_admin']), async (req: Request, res: Response) => {
    try {
        const companyId = req.user!.companyId;
        const { category_id, brand, name, sku, barcode, unit, specs, min_stock_level, track_stock } = req.body;

        const result = await pool.query(
            `INSERT INTO inventory_products (company_id, category_id, brand, name, sku, barcode, unit, specs, min_stock_level, track_stock)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [companyId, category_id, brand, name, sku, barcode, unit, specs, min_stock_level, track_stock !== undefined ? track_stock : true]
        );

        // Initialize stock if not exists
        await pool.query(
            'INSERT INTO inventory_stocks (company_id, product_id, quantity) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING',
            [companyId, result.rows[0].id]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/inventory/assign
 * Assign product to a staff member
 */
router.post('/assign', authMiddleware, roleCheck(['company_admin']), async (req: Request, res: Response) => {
    try {
        const companyId = req.user!.companyId;
        const { staff_id, product_id, quantity, notes } = req.body;

        // 1. Check stock
        const stockRes = await pool.query(
            'SELECT quantity FROM inventory_stocks WHERE company_id = $1 AND product_id = $2',
            [companyId, product_id]
        );

        const currentQty = stockRes.rows[0]?.quantity || 0;
        if (currentQty < quantity) {
            return res.status(400).json({ success: false, error: 'Yetersiz stok!' });
        }

        // 2. Reduce stock
        await pool.query(
            'UPDATE inventory_stocks SET quantity = quantity - $1 WHERE company_id = $2 AND product_id = $3',
            [quantity, companyId, product_id]
        );

        // 3. Log assignment
        const result = await pool.query(
            `INSERT INTO inventory_assignments (company_id, staff_id, product_id, quantity, notes)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [companyId, staff_id, product_id, quantity, notes]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/inventory/staff-assignments/:staffId
 */
router.get('/staff-assignments/:staffId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { staffId } = req.params;
        const result = await pool.query(
            `SELECT a.*, p.name as product_name, p.brand, p.unit
             FROM inventory_assignments a
             JOIN inventory_products p ON a.product_id = p.id
             WHERE a.staff_id = $1 AND a.status = 'in_use'
             ORDER BY a.assigned_at DESC`,
            [staffId]
        );
        res.json({ success: true, data: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/inventory/service-materials
 * Link a service to a material
 */
router.post('/service-materials', authMiddleware, roleCheck(['company_admin']), async (req: Request, res: Response) => {
    try {
        const { service_id, product_id, required_quantity } = req.body;
        const result = await pool.query(
            `INSERT INTO service_materials (service_id, product_id, required_quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (service_id, product_id) DO UPDATE SET required_quantity = $3
             RETURNING *`,
            [service_id, product_id, required_quantity]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/inventory/service-materials/:serviceId
 */
router.get('/service-materials/:serviceId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { serviceId } = req.params;
        const result = await pool.query(
            `SELECT sm.*, p.name as product_name, p.brand, p.unit
             FROM service_materials sm
             JOIN inventory_products p ON sm.product_id = p.id
             WHERE sm.service_id = $1`,
            [serviceId]
        );
        res.json({ success: true, data: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
