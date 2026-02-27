import { Request, Response, NextFunction } from 'express';
import financeService from '../services/finance.service';

class FinanceController {
    async createInvoice(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) return res.status(403).json({ success: false, error: 'Firma ID eksik' });

            const invoice = await financeService.createInvoice({
                ...req.body,
                company_id: companyId
            });
            res.status(201).json({ success: true, data: invoice });
        } catch (error) {
            next(error);
        }
    }

    async getMonthlyBalance(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.params.companyId ? parseInt(req.params.companyId) : req.user?.companyId;
            if (!companyId) return res.status(400).json({ success: false, error: 'Firma ID eksik' });

            if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') {
                return res.status(403).json({ success: false, error: 'Yetkisiz erişim' });
            }

            const balance = await financeService.getMonthlyBalance(companyId);
            res.json({ success: true, data: balance });
        } catch (error) {
            next(error);
        }
    }

    async getCashTransactions(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.params.companyId ? parseInt(req.params.companyId) : req.user?.companyId;
            const { startDate, endDate, search } = req.query;
            if (!companyId) return res.status(400).json({ success: false, error: 'Firma ID eksik' });

            if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') {
                return res.status(403).json({ success: false, error: 'Yetkisiz erişim' });
            }

            const transactions = await financeService.getCashTransactions(companyId, startDate as string, endDate as string, search as string);
            res.json({ success: true, data: transactions });
        } catch (error) {
            next(error);
        }
    }

    async createPurchaseInvoice(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) return res.status(403).json({ success: false, error: 'Firma ID eksik' });

            const invoice = await financeService.createPurchaseInvoice({
                ...req.body,
                company_id: companyId
            });
            res.status(201).json({ success: true, data: invoice });
        } catch (error) {
            next(error);
        }
    }

    async getPurchaseInvoices(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.params.companyId ? parseInt(req.params.companyId) : req.user?.companyId;
            const { startDate, endDate, search } = req.query;
            if (!companyId) return res.status(400).json({ success: false, error: 'Firma ID eksik' });

            if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') {
                return res.status(403).json({ success: false, error: 'Yetkisiz erişim' });
            }

            const invoices = await financeService.getPurchaseInvoices(companyId, startDate as string, endDate as string, search as string);
            res.json({ success: true, data: invoices });
        } catch (error) {
            next(error);
        }
    }

    async createCashTransaction(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) return res.status(403).json({ success: false, error: 'Firma ID eksik' });

            const transaction = await financeService.createCashTransaction({
                ...req.body,
                company_id: companyId
            });
            res.status(201).json({ success: true, data: transaction });
        } catch (error) {
            next(error);
        }
    }

    async getInvoices(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.params.companyId ? parseInt(req.params.companyId) : req.user?.companyId;
            const { startDate, endDate, search } = req.query;
            if (!companyId) return res.status(400).json({ success: false, error: 'Firma ID eksik' });

            if (req.user?.companyId !== companyId && req.user?.role !== 'super_admin') {
                return res.status(403).json({ success: false, error: 'Yetkisiz erişim' });
            }

            const invoices = await financeService.getInvoices(companyId, startDate as string, endDate as string, search as string);
            res.json({ success: true, data: invoices });
        } catch (error) {
            next(error);
        }
    }

    async prepareInvoice(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const invoiceId = parseInt(req.params.invoiceId);
            if (!companyId) return res.status(403).json({ success: false, error: 'Firma ID eksik' });
            if (!invoiceId) return res.status(400).json({ success: false, error: 'Fatura ID eksik' });

            const invoice = await financeService.prepareInvoice(invoiceId, companyId);
            res.json({ success: true, data: invoice });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    async getInvoicePreview(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const invoiceId = parseInt(req.params.invoiceId);
            if (!companyId) return res.status(403).json({ success: false, error: 'Firma ID eksik' });
            if (!invoiceId) return res.status(400).json({ success: false, error: 'Fatura ID eksik' });

            const html = await financeService.getInvoiceHTML(invoiceId, companyId);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    async sendToGIB(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const invoiceId = parseInt(req.params.invoiceId);
            if (!companyId) return res.status(403).json({ success: false, error: 'Firma ID eksik' });
            if (!invoiceId) return res.status(400).json({ success: false, error: 'Fatura ID eksik' });

            const result = await financeService.sendToGIB(invoiceId, companyId);
            res.json({ success: true, data: result });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }

    async checkEInvoiceUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { vkn } = req.query;
            const companyId = req.user?.companyId;
            if (!vkn) return res.status(400).json({ success: false, error: 'VKN/TCKN eksik' });
            if (!companyId) return res.status(403).json({ success: false, error: 'Firma ID eksik' });

            const result = await financeService.checkEInvoiceUser(vkn as string, companyId);
            res.json({ success: true, data: result });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
}

export default new FinanceController();
