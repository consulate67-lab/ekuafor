import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { companyAuth } from '../middleware/auth.middleware';
import pool from '../config/database';

const router = Router();

export const EXPENSE_CATEGORIES = ['rent', 'salary', 'supplies', 'utilities', 'marketing', 'tax', 'other'] as const;

const expenseSchema = z.object({
    amount: z.coerce.number().positive().max(10_000_000),
    description: z.string().trim().min(1).max(500),
    category: z.string().optional().nullable()
        .transform(c => (c ? ((EXPENSE_CATEGORIES as readonly string[]).includes(c) ? c : 'other') : null)),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const PERIOD_FILTERS: Record<string, string> = {
    today: 'e.expense_date = $2::date',
    week: "e.expense_date >= date_trunc('week', $2::date)",
    month: "e.expense_date >= date_trunc('month', $2::date)",
    year: "e.expense_date >= date_trunc('year', $2::date)",
};

const isCompanyMember = (req: Request) =>
    !!req.user?.companyId && ['company_admin', 'staff', 'board'].includes(req.user.role);

router.post('/', companyAuth, async (req: Request, res: Response) => {
    if (!isCompanyMember(req)) return res.status(403).json({ success: false, error: 'Firma bilgisi gerekli' });
    const parsed = expenseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: 'Tutar ve açıklama gereklidir' });

    try {
        const { amount, description, category, date } = parsed.data;
        const result = await pool.query(
            `INSERT INTO expenses (company_id, amount, description, category, expense_date, created_by)
             VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6) RETURNING *`,
            [req.user!.companyId, amount, description, category ?? null, date ?? null, req.user!.userId || null]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Expense add error:', error);
        res.status(500).json({ success: false, error: 'Masraf kaydedilemedi' });
    }
});

/** Yönetici firmanın tüm masraflarını, personel yalnızca kendi girdiklerini görür. */
router.get('/', companyAuth, async (req: Request, res: Response) => {
    if (!isCompanyMember(req)) return res.status(403).json({ success: false, error: 'Firma bilgisi gerekli' });

    try {
        const period = String(req.query.period || 'today');
        const filter = PERIOD_FILTERS[period] ?? PERIOD_FILTERS.today;
        const rawDate = String(req.query.local_date ?? req.query.date ?? '');
        const localDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;
        const params: unknown[] = [req.user!.companyId, localDate ?? new Date().toISOString().slice(0, 10)];
        let ownerFilter = '';
        if (req.user!.role === 'staff') {
            params.push(req.user!.userId);
            ownerFilter = `AND e.created_by = $${params.length}`;
        }

        const result = await pool.query(
            `SELECT e.*, NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), '') AS created_by_name
             FROM expenses e
             LEFT JOIN users u ON u.id = e.created_by
             WHERE e.company_id = $1 AND ${filter} ${ownerFilter}
             ORDER BY e.expense_date DESC, e.id DESC
             LIMIT 500`,
            params
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Expense get error:', error);
        res.status(500).json({ success: false, error: 'Masraflar yüklenemedi' });
    }
});

router.delete('/:id', companyAuth, async (req: Request, res: Response) => {
    if (!isCompanyMember(req)) return res.status(403).json({ success: false, error: 'Firma bilgisi gerekli' });
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, error: 'Geçersiz id' });

    try {
        const params: unknown[] = [id, req.user!.companyId];
        let ownerFilter = '';
        if (req.user!.role === 'staff') {
            params.push(req.user!.userId);
            ownerFilter = 'AND created_by = $3';
        }
        const result = await pool.query(`DELETE FROM expenses WHERE id = $1 AND company_id = $2 ${ownerFilter}`, params);
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Masraf bulunamadı' });
        res.json({ success: true });
    } catch (error) {
        console.error('Expense delete error:', error);
        res.status(500).json({ success: false, error: 'Masraf silinemedi' });
    }
});

export default router;
