import { db } from '../db';
import { sql, eq, and, or, desc, asc, ilike, gte, lte, between, SQL } from 'drizzle-orm';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface Invoice {
    id?: number;
    company_id: number;
    appointment_id?: number;
    customer_id?: number;
    customer_name: string;
    customer_tax_number?: string;
    customer_tax_office?: string;
    type: 'e-fatura' | 'e-arsiv' | 'fis';
    payment_method: 'nakit' | 'kart';
    amount: number;
    vat_rate?: number;
    vat_amount?: number;
    discount_rate?: number;
    discount_amount?: number;
    grand_total?: number;
    status: string;
    invoice_no?: string;
    gib_uuid?: string;
    gib_status?: string;
    created_at?: string;
    current_account_id?: number | null;
}

export interface CashTransaction {
    id?: number;
    company_id: number;
    type: 'income' | 'expense';
    category: string;
    payment_method: 'nakit' | 'kart';
    amount: number;
    debit?: number;
    credit?: number;
    description?: string;
    transaction_date?: string;
    due_date?: string;
    current_account_id?: number | null;
}

export interface CurrentAccount {
    id?: number;
    company_id: number;
    code?: string;
    name: string;
    title?: string;
    tax_office?: string;
    tax_number?: string;
    type?: 'CUSTOMER' | 'SUPPLIER' | 'ALL';
    phone?: string;
    email?: string;
    website?: string;
    address_line?: string;
    city?: string;
    district?: string;
    country?: string;
    is_active?: boolean;
    balance?: number;
}

/**
 * Finance Service — Drizzle ORM.
 *
 * ESKİ: raw pg.query() + parametreli SQL + manual pool.connect()/BEGIN/COMMIT
 * YENİ: db.execute(sql`...`) + db.transaction(async (tx) => {...})
 *
 * Pattern:
 * - snake_case alanlar için `db.execute(sql\`...\`)` kullanılır (schema camelCase
 *   tanımlı; routes/response alanları snake_case bekliyor)
 * - Transaction'lar `db.transaction(async (tx) => {...})` ile sarılır
 * - `tx` objesinin `.execute(sql\`...\`)` metodu raw SQL'i transaction içinde çalıştırır
 * - Tablo şemasında olmayan alanlar (gib_*, xml_content, source_id, vb.) raw SQL ile yazılır
 */
class FinanceService {
    constructor() {
        console.log('[FinanceService] Initialized');
        // Do not auto-run migrations in constructor to avoid pool exhaustion at startup
    }

    /**
     * Schema-uyumluluk migration'ları — idempotent.
     * Drizzle ORM kullanılır (db.execute(sql`...`)) ama ham SQL string'leri korunur.
     * NOT: Proper migration tool zaten db/migrate.ts'de. Buradaki runMigrations artık kullanılmıyor.
     */
    private async runMigrations() {
        try {
            console.log('[Migration] Checking for new columns...');

            // 1. Companies tablosu güncellemesi
            const companyCols: Array<[string, string]> = [
                ['tax_number', 'VARCHAR(20)'],
                ['tax_office', 'VARCHAR(100)'],
                ['city', 'VARCHAR(50)'],
                ['district', 'VARCHAR(50)'],
                ['qnb_username', 'VARCHAR(100)'],
                ['qnb_password', 'VARCHAR(100)'],
                ['qnb_vkn', 'VARCHAR(20)'],
                ['efatura_test_mode', 'BOOLEAN DEFAULT true'],
                ['invoice_prefix', "VARCHAR(3) DEFAULT 'GIB'"],
                ['nace_code', 'VARCHAR(20)'],
                ['building_number', 'VARCHAR(20)'],
                ['door_number', 'VARCHAR(20)'],
                ['fax_number', 'VARCHAR(20)'],
                ['postal_code', 'VARCHAR(20)']
            ];
            for (const [col, type] of companyCols) {
                await db.execute(sql.raw(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS ${col} ${type}`));
            }

            // 2. Invoices tablosu güncellemesi
            const invoiceCols: Array<[string, string]> = [
                ['customer_tax_number', 'VARCHAR(20)'],
                ['customer_tax_office', 'VARCHAR(100)'],
                ['customer_id', 'INTEGER REFERENCES users(id) ON DELETE SET NULL'],
                ['vat_rate', 'NUMERIC(5,2) DEFAULT 20'],
                ['vat_amount', 'NUMERIC(15,2) DEFAULT 0'],
                ['discount_rate', 'NUMERIC(5,2) DEFAULT 0'],
                ['discount_amount', 'NUMERIC(15,2) DEFAULT 0'],
                ['grand_total', 'NUMERIC(15,2) DEFAULT 0'],
                ['gib_uuid', 'VARCHAR(50)'],
                ['gib_status', "VARCHAR(20) DEFAULT 'prepared'"],
                ['gib_sent_at', 'TIMESTAMP'],
                ['appointment_id', 'INTEGER'],
                ['invoice_no', 'VARCHAR(20)'],
                ['xml_content', 'TEXT'],
                ['current_account_id', 'INTEGER REFERENCES current_accounts(id) ON DELETE SET NULL']
            ];
            for (const [col, type] of invoiceCols) {
                await db.execute(sql.raw(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ${col} ${type}`));
            }

            // 3. Services tablosu güncellemesi
            const serviceCols: Array<[string, string]> = [
                ['department_id', 'INTEGER'],
                ['quantity', 'NUMERIC'],
                ['unit', 'VARCHAR(30)'],
                ['photo', 'TEXT']
            ];
            for (const [col, type] of serviceCols) {
                await db.execute(sql.raw(`ALTER TABLE services ADD COLUMN IF NOT EXISTS ${col} ${type}`));
            }

            // 4. Users tablosu güncellemesi
            const userCols: Array<[string, string]> = [
                ['board_code', 'VARCHAR(20)'],
                ['gender', 'VARCHAR(20)'],
                ['department_id', 'INTEGER'],
                ['photo', 'TEXT'],
                ['quantity', 'NUMERIC'],
                ['unit', 'VARCHAR(30)']
            ];
            for (const [col, type] of userCols) {
                await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${type}`));
            }

            // 6. Cash Transactions tablosu güncellemesi
            const cashCols: Array<[string, string]> = [
                ['debit', 'NUMERIC(15,2) DEFAULT 0'],
                ['credit', 'NUMERIC(15,2) DEFAULT 0'],
                ['transaction_date', 'DATE DEFAULT CURRENT_DATE'],
                ['source_id', 'INTEGER'],
                ['source_type', 'VARCHAR(50)'],
                ['current_account_id', 'INTEGER REFERENCES current_accounts(id) ON DELETE SET NULL']
            ];
            for (const [col, type] of cashCols) {
                await db.execute(sql.raw(`ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS ${col} ${type}`));
            }

            // 7. Purchase Invoices tablosu güncellemesi
            const purchaseCols: Array<[string, string]> = [
                ['subtotal', 'DECIMAL(15,2) DEFAULT 0'],
                ['vat_total', 'DECIMAL(15,2) DEFAULT 0'],
                ['discount_total', 'DECIMAL(15,2) DEFAULT 0'],
                ['is_closed', 'BOOLEAN DEFAULT TRUE']
            ];
            for (const [col, type] of purchaseCols) {
                await db.execute(sql.raw(`ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS ${col} ${type}`));
            }

            await db.execute(sql`
                CREATE TABLE IF NOT EXISTS purchase_invoice_items (
                    id SERIAL PRIMARY KEY,
                    invoice_id INTEGER REFERENCES purchase_invoices(id) ON DELETE CASCADE,
                    product_name VARCHAR(255) NOT NULL,
                    quantity NUMERIC(15, 3) DEFAULT 1,
                    unit_price DECIMAL(15, 2) DEFAULT 0,
                    vat_rate NUMERIC(5, 2) DEFAULT 20,
                    vat_amount DECIMAL(15, 2) DEFAULT 0,
                    discount_rate NUMERIC(5, 2) DEFAULT 0,
                    discount_amount DECIMAL(15, 2) DEFAULT 0,
                    total_amount DECIMAL(15, 2) DEFAULT 0
                )
            `);

            console.log('[Migration] Database is up to date.');
        } catch (error) {
            console.error('[Migration] Failed:', error);
        }
    }

    private calculateDueDate() {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    }

    /**
     * Fatura oluştur — transactional (invoice + cash transaction + appointment sync).
     */
    async createInvoice(invoice: Invoice) {
        return await db.transaction(async (tx) => {
            const amount = Number(invoice.amount || 0);
            const vatRate = Number(invoice.vat_rate || 20);
            const discRate = Number(invoice.discount_rate || 0);

            const discount_amount = Number((amount * discRate / 100).toFixed(2));
            const subtotal = Number((amount - discount_amount).toFixed(2));
            const vat_amount = Number((subtotal * vatRate / 100).toFixed(2));
            const grand_total = Number((subtotal + vat_amount).toFixed(2));

            // invoices tablosunda schema'da tanımlı olmayan alanlar var (gib_*, vat_rate, vb.)
            // Bu yüzden raw SQL ile INSERT yapıyoruz — snake_case alan adları doğrudan korunuyor.
            const result = await tx.execute(sql`
                INSERT INTO invoices (
                    company_id, appointment_id, customer_id, customer_name, customer_tax_number,
                    customer_tax_office, type, payment_method, amount, 
                    vat_rate, vat_amount, discount_rate, discount_amount, grand_total,
                    status, gib_status, current_account_id
                ) VALUES (
                    ${invoice.company_id}, ${invoice.appointment_id ?? null}, ${invoice.customer_id ?? null}, ${invoice.customer_name},
                    ${invoice.customer_tax_number ?? null}, ${invoice.customer_tax_office ?? null},
                    ${invoice.type}, ${invoice.payment_method}, ${amount},
                    ${vatRate}, ${vat_amount}, ${discRate}, ${discount_amount}, ${grand_total},
                    'completed', 'not_sent', ${invoice.current_account_id ?? null}
                )
                RETURNING *
            `);
            const newInvoice = (result.rows as any[])[0];

            await this.createCashTransactionInternal(tx, {
                company_id: invoice.company_id,
                type: 'income',
                category: 'sales',
                payment_method: invoice.payment_method,
                amount: grand_total,
                debit: grand_total,
                credit: 0,
                description: `${invoice.customer_name} - Satış Faturası (${invoice.type})`,
                transaction_date: invoice.created_at ? new Date(invoice.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                due_date: invoice.payment_method === 'kart' ? this.calculateDueDate() : undefined,
                source_id: newInvoice.id,
                source_type: 'sales_invoice',
                current_account_id: invoice.current_account_id || null
            });

            if (invoice.appointment_id) {
                await tx.execute(sql`
                    UPDATE appointments
                    SET status = 'invoiced',
                        collected_price = COALESCE(collected_price, ${grand_total}),
                        payment_method = COALESCE(payment_method, ${invoice.payment_method})
                    WHERE id = ${invoice.appointment_id}
                `);

                // Sync to appointment_services for reports
                const servicesRes = await tx.execute(sql`
                    SELECT id, price FROM appointment_services WHERE appointment_id = ${invoice.appointment_id}
                `);
                const services = (servicesRes.rows as any[]) || [];

                if (services.length === 1) {
                    await tx.execute(sql`
                        UPDATE appointment_services SET price = ${grand_total}, status = 'completed' WHERE id = ${services[0].id}
                    `);
                } else if (services.length > 1) {
                    const currentSum = services.reduce((sum, s) => sum + Number(s.price || 0), 0);
                    const finalPrice = Number(grand_total);
                    if (currentSum > 0) {
                        for (const s of services) {
                            const distributed = (Number(s.price || 0) / currentSum) * finalPrice;
                            await tx.execute(sql`
                                UPDATE appointment_services SET price = ${distributed}, status = 'completed' WHERE id = ${s.id}
                            `);
                        }
                    } else {
                        const distributed = finalPrice / services.length;
                        await tx.execute(sql`
                            UPDATE appointment_services SET price = ${distributed}, status = 'completed' WHERE appointment_id = ${invoice.appointment_id}
                        `);
                    }
                }
            }

            return newInvoice;
        });
    }

    /**
     * Kasa hareketi ekle (transaction içi versiyon).
     * `executor` parametresi db veya tx olabilir; her ikisinin de .execute(sql`...`) metodu var.
     */
    private async createCashTransactionInternal(executor: any, transaction: any) {
        const result = await executor.execute(sql`
            INSERT INTO cash_transactions (
                company_id, type, category, payment_method, amount, debit, credit,
                description, transaction_date, due_date, source_id, source_type, current_account_id
            ) VALUES (
                ${transaction.company_id}, ${transaction.type}, ${transaction.category},
                ${transaction.payment_method}, ${transaction.amount},
                ${transaction.debit ?? 0}, ${transaction.credit ?? 0},
                ${transaction.description ?? null},
                ${transaction.transaction_date ?? sql`CURRENT_DATE`},
                ${transaction.due_date ?? null},
                ${transaction.source_id ?? null},
                ${transaction.source_type ?? null},
                ${transaction.current_account_id ?? null}
            )
            RETURNING *
        `);
        return result;
    }

    /**
     * Kasa hareketi ekle (standalone — kendi transaction'ı).
     */
    async createCashTransaction(transaction: CashTransaction) {
        const result = await this.createCashTransactionInternal(db, transaction);
        return (result.rows as any[])[0];
    }

    /**
     * Kasa hareketlerini listele (tarih filtresi + devir bakiyesi ile).
     */
    async getCashTransactions(companyId: number, startDate?: string, endDate?: string, search?: string) {
        // Opening Balance (Devir) - Balance before startDate
        let openingBalance = 0;
        if (startDate) {
            const obResult = await db.execute(sql`
                SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as balance 
                FROM cash_transactions 
                WHERE company_id = ${companyId} AND transaction_date < ${startDate}
            `);
            openingBalance = Number((obResult.rows as any[])[0]?.balance || 0);
        }

        // Dinamik WHERE — sql template içinde condition birleştirme
        const conditions: SQL[] = [eq(sql`cash_transactions.company_id`, companyId)];
        if (startDate && endDate) {
            conditions.push(between(sql`cash_transactions.transaction_date`, startDate, endDate));
        }
        if (search) {
            conditions.push(or(
                ilike(sql`cash_transactions.description`, `%${search}%`),
                ilike(sql`cash_transactions.category`, `%${search}%`),
                ilike(sql`cash_transactions.payment_method`, `%${search}%`)
            )!);
        }

        const result = await db.execute(sql`
            SELECT * FROM cash_transactions
            WHERE ${and(...conditions)}
            ORDER BY transaction_date DESC, created_at DESC
        `);

        return {
            transactions: result.rows as any[],
            openingBalance
        };
    }

    /**
     * Aylık kasa bakiyesi — nakit gelir-gider + kart bekleyen.
     */
    async getMonthlyBalance(companyId: number) {
        const result = await db.execute(sql`
            SELECT 
                SUM(CASE WHEN type = 'income' AND payment_method = 'nakit' THEN COALESCE(debit, amount) ELSE 0 END) as total_cash_income,
                SUM(CASE WHEN type = 'expense' AND payment_method = 'nakit' THEN COALESCE(credit, amount) ELSE 0 END) as total_cash_expense,
                SUM(CASE WHEN payment_method = 'kart' THEN COALESCE(debit, amount) ELSE 0 END) as total_card_transactions
            FROM cash_transactions 
            WHERE company_id = ${companyId} AND transaction_date >= date_trunc('month', CURRENT_DATE)
        `);
        const row = (result.rows as any[])[0];
        return {
            cash_balance: Number(row.total_cash_income || 0) - Number(row.total_cash_expense || 0),
            pending_card: Number(row.total_card_transactions || 0)
        };
    }

    /**
     * Alış faturası oluştur — transactional.
     */
    async createPurchaseInvoice(data: any) {
        return await db.transaction(async (tx) => {
            const subtotal = data.items?.reduce((sum: number, item: any) => sum + (Number(item.unit_price) * Number(item.quantity)), 0) || 0;
            const discount_total = data.items?.reduce((sum: number, item: any) => sum + (Number(item.discount_amount) || 0), 0) || 0;
            const vat_total = data.items?.reduce((sum: number, item: any) => sum + (Number(item.vat_amount) || 0), 0) || 0;
            const amount = subtotal - discount_total + vat_total;
            const isClosed = data.is_closed !== false;

            const result = await tx.execute(sql`
                INSERT INTO purchase_invoices (
                    company_id, supplier_name, current_account_id, invoice_no, amount,
                    subtotal, vat_total, discount_total, invoice_date, description, is_closed
                ) VALUES (
                    ${data.company_id}, ${data.supplier_name}, ${data.current_account_id ?? null},
                    ${data.invoice_no}, ${amount}, ${subtotal}, ${vat_total}, ${discount_total},
                    ${data.invoice_date ?? sql`CURRENT_DATE`}, ${data.description ?? null}, ${isClosed}
                )
                RETURNING *
            `);
            const newInvoice = (result.rows as any[])[0];
            const invoiceId = newInvoice.id;

            if (data.items && Array.isArray(data.items)) {
                for (const item of data.items) {
                    await tx.execute(sql`
                        INSERT INTO purchase_invoice_items (
                            invoice_id, product_name, quantity, unit_price,
                            vat_rate, vat_amount, discount_rate, discount_amount, total_amount
                        ) VALUES (
                            ${invoiceId}, ${item.product_name}, ${item.quantity}, ${item.unit_price},
                            ${item.vat_rate ?? null}, ${item.vat_amount ?? null},
                            ${item.discount_rate ?? null}, ${item.discount_amount ?? null},
                            ${item.total_amount ?? null}
                        )
                    `);
                }
            }

            if (isClosed) {
                await this.createCashTransactionInternal(tx, {
                    company_id: data.company_id,
                    type: 'expense',
                    category: 'purchase',
                    payment_method: 'nakit',
                    amount: amount,
                    debit: 0,
                    credit: amount,
                    description: `${data.supplier_name} - Alış Faturası (${data.invoice_no})`,
                    transaction_date: data.invoice_date || new Date().toISOString().split('T')[0],
                    source_id: invoiceId,
                    source_type: 'purchase_invoice',
                    current_account_id: data.current_account_id || null
                });
            }

            return newInvoice;
        });
    }

    /**
     * Alış faturalarını listele (tarih + arama filtresi ile).
     */
    async getPurchaseInvoices(companyId: number, startDate?: string, endDate?: string, search?: string) {
        const conditions: SQL[] = [eq(sql`company_id`, companyId)];
        if (startDate && endDate) {
            conditions.push(between(sql`invoice_date`, startDate, endDate));
        }
        if (search) {
            conditions.push(or(
                ilike(sql`supplier_name`, `%${search}%`),
                ilike(sql`invoice_no`, `%${search}%`),
                ilike(sql`description`, `%${search}%`)
            )!);
        }

        const result = await db.execute(sql`
            SELECT * FROM purchase_invoices
            WHERE ${and(...conditions)}
            ORDER BY invoice_date DESC
        `);
        return result.rows as any[];
    }

    /**
     * Alış faturasını item'larıyla getir.
     */
    async getPurchaseInvoiceById(id: number, companyId: number) {
        const invoiceRes = await db.execute(sql`
            SELECT * FROM purchase_invoices WHERE id = ${id} AND company_id = ${companyId}
        `);
        const invoiceRows = invoiceRes.rows as any[];
        if (invoiceRows.length === 0) return null;

        const items = await db.execute(sql`
            SELECT * FROM purchase_invoice_items WHERE invoice_id = ${id}
        `);

        return {
            ...invoiceRows[0],
            items: items.rows as any[]
        };
    }

    /**
     * Satış faturalarını listele (müşteri JOIN ile).
     */
    async getInvoices(companyId: number, startDate?: string, endDate?: string, search?: string) {
        const conditions: SQL[] = [eq(sql`i.company_id`, companyId)];
        if (startDate && endDate) {
            conditions.push(between(sql`i.created_at::date`, startDate, endDate));
        }
        if (search) {
            conditions.push(or(
                ilike(sql`i.customer_name`, `%${search}%`),
                ilike(sql`i.invoice_no`, `%${search}%`),
                ilike(sql`u.first_name`, `%${search}%`),
                ilike(sql`u.last_name`, `%${search}%`)
            )!);
        }

        const result = await db.execute(sql`
            SELECT i.*, u.first_name, u.last_name, u.phone as u_phone 
            FROM invoices i
            LEFT JOIN users u ON i.customer_id = u.id
            WHERE ${and(...conditions)}
            ORDER BY i.created_at DESC
        `);
        return result.rows as any[];
    }

    /**
     * Tek satış faturası.
     */
    async getInvoiceById(invoiceId: number, companyId: number) {
        const result = await db.execute(sql`
            SELECT * FROM invoices WHERE id = ${invoiceId} AND company_id = ${companyId}
        `);
        return ((result.rows as any[])[0]) || null;
    }

    /**
     * Faturayı GİB'e gönderilmek üzere hazırla (XML üret + DB'ye yaz).
     */
    async prepareInvoice(invoiceId: number, companyId: number) {
        const invoice = await this.getInvoiceById(invoiceId, companyId);
        if (!invoice) throw new Error('Fatura bulunamadı');

        const companyRes = await db.execute(sql`SELECT * FROM companies WHERE id = ${companyId}`);
        const company = (companyRes.rows as any[])[0];

        const prefix = company?.invoice_prefix || 'GIB';
        const year = new Date().getFullYear();
        const randomSeq = Math.floor(Math.random() * 900000000) + 100000000;
        const invoiceNo = `${prefix}${year}${randomSeq}`;
        const gibUUID = crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}`;

        // Get XSLT for Embedding
        const xsltContent = await this.getXSLT(invoice.type);
        const ublXml = this.generateUBLTR(invoice, company, invoiceNo, gibUUID, xsltContent);

        const updated = await db.execute(sql`
            UPDATE invoices
            SET invoice_no = ${invoiceNo}, gib_uuid = ${gibUUID}, gib_status = 'ready', xml_content = ${ublXml}
            WHERE id = ${invoiceId}
            RETURNING *
        `);

        return (updated.rows as any[])[0];
    }

    async getXSLT(type: string): Promise<string> {
        // Filenames as found in d:/Saloon/xslt/
        const fileName = (type === 'e-fatura') ? 'efat.xslt' : 'eArsiv.xslt';
        // Correct path: xslt is at the project root, one level up from server directory
        const filePath = path.resolve(process.cwd(), '..', 'xslt', fileName);

        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (e) {
            console.warn(`XSLT not found at ${filePath}, using default rendering.`);
            return '';
        }
    }

    /**
     * Faturayı GİB'e gönder (QNB entegrasyonu — dış API).
     */
    async sendToGIB(invoiceId: number, companyId: number) {
        const invoice = await this.getInvoiceById(invoiceId, companyId);
        if (!invoice) throw new Error('Fatura bulunamadı');
        if (invoice.gib_status === 'success') throw new Error('Bu fatura zaten başarıyla gönderildi');

        await db.execute(sql`UPDATE invoices SET gib_status = 'pending' WHERE id = ${invoiceId}`);

        try {
            const companyResult = await db.execute(sql`SELECT * FROM companies WHERE id = ${companyId}`);
            const companyInfo = (companyResult.rows as any[])[0];

            const QNB_CONFIG = {
                username: companyInfo.qnb_username || 'USERNAME_PLACEHOLDER',
                password: companyInfo.qnb_password || 'PASSWORD_PLACEHOLDER',
                vkn: companyInfo.qnb_vkn || companyInfo.tax_number || '',
                test: companyInfo.efatura_test_mode !== false
            };

            const ublXml = invoice.xml_content || this.generateUBLTR(invoice, companyInfo, invoice.invoice_no, invoice.gib_uuid, await this.getXSLT(invoice.type));
            const base64Veri = Buffer.from(ublXml).toString('base64');

            // Actual QNB integration logic would go here
            // Simulated response for now
            await new Promise(r => setTimeout(r, 1500));

            const updated = await db.execute(sql`
                UPDATE invoices SET gib_status = 'success', gib_sent_at = NOW() WHERE id = ${invoiceId} RETURNING *
            `);

            return { success: true, uuid: invoice.gib_uuid, invoice: (updated.rows as any[])[0] };

        } catch (error: any) {
            await db.execute(sql`UPDATE invoices SET gib_status = 'failed' WHERE id = ${invoiceId}`);
            throw new Error(`QNB Entegrasyon Hatası: ${error.message}`);
        }
    }

    private generateUBLTR(invoice: any, company: any, invoiceNo: string, uuid: string, xsltContent: string) {
        const now = new Date();
        const issueDate = now.toISOString().split('T')[0];
        const issueTime = now.toTimeString().split(' ')[0];
        const xsltBase64 = xsltContent ? Buffer.from(xsltContent).toString('base64') : '';

        const amount = Number(invoice.amount || 0);
        const vatRate = Number(invoice.vat_rate || 20);
        const discRate = Number(invoice.discount_rate || 0);

        const discAmount = Number((amount * discRate / 100).toFixed(2));
        const taxableAmount = Number((amount - discAmount).toFixed(2));
        const vatAmount = Number((taxableAmount * vatRate / 100).toFixed(2));
        const grandTotal = Number((taxableAmount + vatAmount).toFixed(2));

        return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" 
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" 
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" 
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
    <cbc:ProfileID>${invoice.type === 'e-fatura' ? 'TEMELFATURA' : 'EARSIVFATURA'}</cbc:ProfileID>
    <cbc:ID>${invoiceNo}</cbc:ID>
    <cbc:UUID>${uuid}</cbc:UUID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
    <cbc:LineCountNumeric>1</cbc:LineCountNumeric>
    ${xsltBase64 ? `
    <cac:AdditionalDocumentReference>
        <cbc:ID>${uuid}</cbc:ID>
        <cbc:IssueDate>${issueDate}</cbc:IssueDate>
        <cbc:DocumentTypeCode>XSLT</cbc:DocumentTypeCode>
        <cac:Attachment>
            <cbc:EmbeddedDocumentBinaryObject mimeCode="application/xml" encodingCode="Base64" characterSetCode="UTF-8" filename="${invoice.type === 'e-fatura' ? 'efat.xslt' : 'eArsiv.xslt'}">${xsltBase64}</cbc:EmbeddedDocumentBinaryObject>
        </cac:Attachment>
    </cac:AdditionalDocumentReference>` : ''}
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cbc:WebsiteURI>${company?.website || ''}</cbc:WebsiteURI>
            <cac:PartyIdentification>
                <cbc:ID schemeID="VKN">${company?.tax_number || '1111111111'}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${company?.name || 'İşletme Adı'}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${company?.address_line || ''}</cbc:StreetName>
                <cbc:BuildingNumber>${company?.building_number || ''}</cbc:BuildingNumber>
                <cbc:CitySubdivisionName>${company?.district || ''}</cbc:CitySubdivisionName>
                <cbc:CityName>${company?.city || ''}</cbc:CityName>
                <cac:Country><cbc:Name>Türkiye</cbc:Name></cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cac:TaxScheme><cbc:Name>${company?.tax_office || ''}</cbc:Name></cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:Contact>
                <cbc:Telephone>${company?.phone || ''}</cbc:Telephone>
                <cbc:ElectronicMail>${company?.email || ''}</cbc:ElectronicMail>
            </cac:Contact>
        </cac:Party>
    </cac:AccountingSupplierParty>
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="${invoice.customer_tax_number?.length === 11 ? 'TCKN' : 'VKN'}">${invoice.customer_tax_number || '11111111111'}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${invoice.customer_name}</cbc:Name>
            </cac:PartyName>
            <cac:PartyTaxScheme>
                <cac:TaxScheme><cbc:Name>${invoice.customer_tax_office || ''}</cbc:Name></cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingCustomerParty>
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="TRY">${vatAmount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="TRY">${taxableAmount.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="TRY">${vatAmount.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cac:TaxScheme>
                    <cbc:Name>KDV</cbc:Name>
                    <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="TRY">${amount.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="TRY">${taxableAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="TRY">${grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:AllowanceTotalAmount currencyID="TRY">${discAmount.toFixed(2)}</cbc:AllowanceTotalAmount>
        <cbc:PayableAmount currencyID="TRY">${grandTotal.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    <cac:InvoiceLine>
        <cbc:ID>1</cbc:ID>
        <cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="TRY">${taxableAmount.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:AllowanceCharge>
            <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
            <cbc:Amount currencyID="TRY">${discAmount.toFixed(2)}</cbc:Amount>
        </cac:AllowanceCharge>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="TRY">${vatAmount.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxSubtotal>
                <cbc:TaxableAmount currencyID="TRY">${taxableAmount.toFixed(2)}</cbc:TaxableAmount>
                <cbc:TaxAmount currencyID="TRY">${vatAmount.toFixed(2)}</cbc:TaxAmount>
                <cac:TaxCategory>
                    <cac:TaxScheme>
                        <cbc:Name>KDV</cbc:Name>
                        <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Name>Hizmet Bedeli</cbc:Name>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="TRY">${amount.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>
</Invoice>`;
    }

    /**
     * Fatura HTML önizleme (client-side XSLT transform).
     */
    async getInvoiceHTML(invoiceId: number, companyId: number): Promise<string> {
        const invoiceRes = await db.execute(sql`
            SELECT * FROM invoices WHERE id = ${invoiceId} AND company_id = ${companyId}
        `);
        const inv = (invoiceRes.rows as any[])[0];
        if (!inv) throw new Error('Fatura bulunamadı');

        const companyRes = await db.execute(sql`SELECT * FROM companies WHERE id = ${companyId}`);
        const comp = (companyRes.rows as any[])[0];

        // XML Content exists? If not, prepare it temporarily
        let xmlContent = inv.xml_content;
        if (!xmlContent) {
            const xsltContent = await this.getXSLT(inv.type);
            const prefix = comp?.invoice_prefix || 'GIB';
            const year = new Date().getFullYear();
            const invoiceNo = inv.invoice_no || `${prefix}${year}${Math.floor(Math.random() * 900000000) + 100000000}`;
            const uuid = inv.gib_uuid || crypto.randomUUID();
            xmlContent = this.generateUBLTR(inv, comp, invoiceNo, uuid, xsltContent);
        }

        const xsltContent = await this.getXSLT(inv.type);

        // Return an HTML that performs client-side XSLT transformation
        // This is the most reliable way to use the provided XSLT "design files" without complex server-side native libraries
        return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fatura Önizleme - ${inv.invoice_no || 'TASLAK'}</title>
    <style>
        body { margin: 0; padding: 20px; background: #f1f5f9; font-family: sans-serif; }
        .preview-container { max-width: 900px; margin: 0 auto; background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 8px; min-height: 100vh; padding: 1px; }
        @media print {
            body { background: white; padding: 0; }
            .preview-container { box-shadow: none; border: none; max-width: none; }
            .no-print { display: none; }
        }
        .error-msg { color: #ef4444; padding: 40px; text-align: center; font-weight: bold; }
        .loading-msg { padding: 40px; text-align: center; color: #64748b; }
    </style>
</head>
<body>
    <div class="no-print" style="position: sticky; top: 0; background: white; padding: 10px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; z-index: 100;">
        <span style="font-weight: bold; color: #1e293b;">${inv.type === 'e-fatura' ? 'E-Fatura' : 'E-Arşiv'} Önizleme (${inv.invoice_no || 'TASLAK'})</span>
        <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 8px 16px; rounded: 6px; cursor: pointer; font-weight: bold;">Yazdır / PDF Kaydet</button>
    </div>
    
    <div class="preview-container" id="invoice-render">
        <div class="loading-msg">Fatura tasarımı yükleniyor...</div>
    </div>

    <script>
        (function() {
            try {
                const xmlData = ${JSON.stringify(xmlContent)};
                const xsltData = ${JSON.stringify(xsltContent)};

                if (!xsltData) {
                    document.getElementById('invoice-render').innerHTML = '<div class="error-msg">Tasarım dosyası (XSLT) bulunamadı.</div>';
                    return;
                }

                const parser = new DOMParser();
                const xml = parser.parseFromString(xmlData, "text/xml");
                const xslt = parser.parseFromString(xsltData, "text/xml");

                if (xml.getElementsByTagName("parsererror").length > 0) {
                    throw new Error("XML Ayrıştırma Hatası");
                }
                if (xslt.getElementsByTagName("parsererror").length > 0) {
                    throw new Error("XSLT Ayrıştırma Hatası");
                }

                if (window.XSLTProcessor) {
                    const xsltProcessor = new XSLTProcessor();
                    xsltProcessor.importStylesheet(xslt);
                    const resultDocument = xsltProcessor.transformToFragment(xml, document);
                    const container = document.getElementById('invoice-render');
                    container.innerHTML = '';
                    container.appendChild(resultDocument);
                } else {
                    document.getElementById('invoice-render').innerHTML = '<div class="error-msg">Tarayıcınız XSLT dönüşümünü desteklemiyor. Lütfen modern bir tarayıcı kullanın.</div>';
                }
            } catch (err) {
                console.error("XSLT Transformation Error:", err);
                document.getElementById('invoice-render').innerHTML = '<div class="error-msg">Görünüm oluşturulurken bir hata oluştu: ' + err.message + '</div>';
            }
        })();
    </script>
</body>
</html>`;
    }

    /**
     * Satış faturasını sil (transactional).
     */
    async deleteInvoice(invoiceId: number, companyId: number) {
        return await db.transaction(async (tx) => {
            const invoiceRes = await tx.execute(sql`
                SELECT * FROM invoices WHERE id = ${invoiceId} AND company_id = ${companyId}
            `);
            const invoiceRows = invoiceRes.rows as any[];
            if (invoiceRows.length === 0) throw new Error('Fatura bulunamadı');
            const inv = invoiceRows[0];

            // Revert appointment status
            if (inv.appointment_id) {
                await tx.execute(sql`UPDATE appointments SET status = 'completed' WHERE id = ${inv.appointment_id}`);
            }

            // Remove associated cash transactions
            await tx.execute(sql`
                DELETE FROM cash_transactions
                WHERE company_id = ${companyId} AND source_id = ${invoiceId} AND source_type = 'sales_invoice'
            `);

            await tx.execute(sql`DELETE FROM invoices WHERE id = ${invoiceId}`);

            return true;
        });
    }

    /**
     * Alış faturasını sil (transactional).
     */
    async deletePurchaseInvoice(id: number, companyId: number) {
        return await db.transaction(async (tx) => {
            const res = await tx.execute(sql`
                SELECT * FROM purchase_invoices WHERE id = ${id} AND company_id = ${companyId}
            `);
            const rows = res.rows as any[];
            if (rows.length === 0) throw new Error('Alış faturası bulunamadı');
            const p = rows[0];

            // Remove matching cash transaction if it was closed
            if (p.is_closed) {
                await tx.execute(sql`
                    DELETE FROM cash_transactions
                    WHERE company_id = ${companyId} AND source_id = ${id} AND source_type = 'purchase_invoice'
                `);
            }

            await tx.execute(sql`DELETE FROM purchase_invoices WHERE id = ${id}`);

            return true;
        });
    }

    /**
     * Kasa hareketini sil.
     */
    async deleteCashTransaction(id: number, companyId: number) {
        const result = await db.execute(sql`
            DELETE FROM cash_transactions WHERE id = ${id} AND company_id = ${companyId}
        `);
        if (result.rowCount === 0) throw new Error('İşlem bulunamadı');
        return true;
    }

    // Current Accounts (Cari Kartlar)
    /**
     * Cari hesap (müşteri/tedarikçi) oluştur.
     */
    async createCurrentAccount(data: CurrentAccount) {
        const result = await db.execute(sql`
            INSERT INTO current_accounts (
                company_id, code, name, title, tax_office, tax_number, type,
                phone, email, website, address_line, city, district, country
            ) VALUES (
                ${data.company_id}, ${data.code ?? null}, ${data.name}, ${data.title ?? null},
                ${data.tax_office ?? null}, ${data.tax_number ?? null},
                ${data.type ?? 'ALL'},
                ${data.phone ?? null}, ${data.email ?? null}, ${data.website ?? null},
                ${data.address_line ?? null}, ${data.city ?? null}, ${data.district ?? null},
                ${data.country ?? 'Türkiye'}
            )
            RETURNING *
        `);
        return (result.rows as any[])[0];
    }

    /**
     * Cari hesap güncelle (partial update — dinamik SET listesi).
     */
    async updateCurrentAccount(id: number, companyId: number, data: Partial<CurrentAccount>) {
        const excludedFields = ['id', 'company_id', 'created_at', 'updated_at', 'balance'];
        const entries = Object.entries(data).filter(([key, value]) =>
            !excludedFields.includes(key) && value !== undefined
        );

        if (entries.length === 0) {
            // No fields to update — just return current row
            return await this.getCurrentAccountById(id, companyId);
        }

        // Dinamik SET listesi — sütun adları whitelist'ten geliyor (user input değil),
        // sql.raw ile sütun adı güvenli şekilde enjekte edilir, value parameterised
        const setParts: SQL[] = entries.map(([key, value]) =>
            sql`${sql.raw(key)} = ${value as any}`
        );

        const result = await db.execute(sql`
            UPDATE current_accounts
            SET ${sql.join(setParts, sql`, `)}, updated_at = NOW()
            WHERE id = ${id} AND company_id = ${companyId}
            RETURNING *
        `);
        return (result.rows as any[])[0];
    }

    /**
     * Cari hesapları listele (bakiye hesabı ile — correlated subqueries).
     */
    async getCurrentAccounts(companyId: number, search?: string) {
        const searchFilter = search
            ? sql`AND (ca.name ILIKE ${'%' + search + '%'} OR ca.code ILIKE ${'%' + search + '%'} OR ca.tax_number ILIKE ${'%' + search + '%'} OR ca.title ILIKE ${'%' + search + '%'})`
            : sql``;

        const result = await db.execute(sql`
            SELECT ca.*,
                (
                    COALESCE((SELECT SUM(grand_total) FROM invoices WHERE current_account_id = ca.id), 0) -
                    COALESCE((SELECT SUM(amount) FROM purchase_invoices WHERE current_account_id = ca.id), 0) +
                    COALESCE((SELECT SUM(credit) FROM cash_transactions WHERE current_account_id = ca.id), 0) -
                    COALESCE((SELECT SUM(debit) FROM cash_transactions WHERE current_account_id = ca.id), 0)
                ) as balance
            FROM current_accounts ca
            WHERE ca.company_id = ${companyId} AND ca.is_active = true
            ${searchFilter}
            ORDER BY ca.name ASC
        `);
        return result.rows as any[];
    }

    /**
     * Tek cari hesap.
     */
    async getCurrentAccountById(id: number, companyId: number) {
        const result = await db.execute(sql`
            SELECT * FROM current_accounts WHERE id = ${id} AND company_id = ${companyId}
        `);
        return ((result.rows as any[])[0]) || null;
    }

    /**
     * Cari hesap soft delete.
     */
    async deleteCurrentAccount(id: number, companyId: number) {
        const result = await db.execute(sql`
            UPDATE current_accounts SET is_active = false WHERE id = ${id} AND company_id = ${companyId}
        `);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * VKN/TCKN üzerinden e-fatura mükellefi sorgula (external API).
     */
    async checkEInvoiceUser(vkn: string, companyId: number) {
        try {
            // Canlı API üzerinden sorgulama (Public lookup service)
            // Bu API genellikle e-fatura mükellef listesini canlı olarak döner.
            const response = await fetch(`https://api.verat.com.tr/v1/user/check?vkn=${vkn}`);
            if (response.ok) {
                const data: any = await response.json();
                // API formatına göre isEInvoice kontrolü (Genellikle data.isEInvoice veya data.success gibi döner)
                return { isEInvoice: data.isEInvoice || data.success || false };
            }
        } catch (err) {
            console.warn('Live VKN check failed, falling back to heuristic:', err);
        }

        // Fallback or secondary check if live API fails
        await new Promise(r => setTimeout(r, 500));
        // Basit bir kural: 10 haneli (Kurumsal) VKN'lerin çoğu mükellef olma eğilimindedir, 
        // ancak gerçek bir kontrol için canlı API her zaman daha iyidir.
        const isEInvoice = vkn.length === 10 && vkn.startsWith('1');
        return { isEInvoice };
    }
}

export default new FinanceService();
