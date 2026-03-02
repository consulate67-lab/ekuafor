import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import pool from '../config/database';

const router = Router();

// Create Table on load just in case
pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT NOT NULL,
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );
`).catch(console.error);

router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { amount, description, date } = req.body;
        const companyId = req.user?.companyId;
        const userId = req.user?.userId;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Firma bilgisi gerekli' });
        }

        const result = await pool.query(
            'INSERT INTO expenses (company_id, amount, description, expense_date, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [companyId, amount, description, date || new Date().toISOString().split('T')[0], userId]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Expense add error:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Firma bilgisi gerekli' });
        }

        let { period } = req.query;
        if (!period) period = 'today';

        let dateFilter = "expense_date = CURRENT_DATE";
        if (period === 'week') dateFilter = "expense_date >= date_trunc('week', CURRENT_DATE)";
        if (period === 'month') dateFilter = "expense_date >= date_trunc('month', CURRENT_DATE)";
        if (period === 'year') dateFilter = "expense_date >= date_trunc('year', CURRENT_DATE)";

        const query = `
            SELECT * FROM expenses 
            WHERE company_id = $1 AND ${dateFilter}
            ORDER BY expense_date DESC, id DESC
        `;
        const result = await pool.query(query, [companyId]);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Expense get error:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

export default router;
