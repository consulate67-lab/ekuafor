import { Router } from 'express';
import financeController from '../controllers/finance.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Invoices
router.post('/invoices', authMiddleware, financeController.createInvoice);
router.get('/invoices/company/:companyId', authMiddleware, financeController.getInvoices);
router.post('/invoices/:invoiceId/prepare', authMiddleware, financeController.prepareInvoice);
router.get('/invoices/:invoiceId/preview', authMiddleware, financeController.getInvoicePreview);
router.post('/invoices/:invoiceId/gib-send', authMiddleware, financeController.sendToGIB);
router.get('/check-einvoice-user', authMiddleware, financeController.checkEInvoiceUser);

// Detailed Finances
router.get('/company/:companyId/balance', authMiddleware, financeController.getMonthlyBalance);
router.get('/company/:companyId/transactions', authMiddleware, financeController.getCashTransactions);
router.post('/transactions', authMiddleware, financeController.createCashTransaction);

// Purchase Invoices
router.post('/purchase-invoices', authMiddleware, financeController.createPurchaseInvoice);
router.get('/purchase-invoices/company/:companyId', authMiddleware, financeController.getPurchaseInvoices);
router.get('/purchase-invoices/:id', authMiddleware, financeController.getPurchaseInvoiceById);

export default router;
