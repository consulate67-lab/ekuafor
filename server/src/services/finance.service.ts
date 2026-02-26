import pool from '../config/database';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface Invoice {
    id?: number;
    company_id: number;
    appointment_id?: number;
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
}

export interface CashTransaction {
    id?: number;
    company_id: number;
    type: 'income' | 'expense';
    category: string;
    payment_method: 'nakit' | 'kart';
    amount: number;
    description?: string;
    transaction_date?: string;
    due_date?: string;
}

class FinanceService {
    constructor() {
        this.runMigrations().catch(err => console.error('Migration Error:', err));
    }

    private async runMigrations() {
        const client = await pool.connect();
        try {
            console.log('[Migration] Checking for new columns...');

            // 1. Companies tablosu güncellemesi
            const companyCols = [
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
                await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS ${col} ${type}`);
            }

            // 2. Invoices tablosu güncellemesi
            const invoiceCols = [
                ['customer_tax_number', 'VARCHAR(20)'],
                ['customer_tax_office', 'VARCHAR(100)'],
                ['vat_rate', 'NUMERIC(5,2) DEFAULT 20'],
                ['vat_amount', 'NUMERIC(15,2) DEFAULT 0'],
                ['discount_rate', 'NUMERIC(5,2) DEFAULT 0'],
                ['discount_amount', 'NUMERIC(15,2) DEFAULT 0'],
                ['grand_total', 'NUMERIC(15,2) DEFAULT 0'],
                ['gib_uuid', 'VARCHAR(50)'],
                ['gib_status', "VARCHAR(20) DEFAULT 'prepared'"],
                ['gib_sent_at', 'TIMESTAMP'],
                ['appointment_id', 'INTEGER'],
                ['invoice_no', 'VARCHAR(20)']
            ];
            for (const [col, type] of invoiceCols) {
                await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ${col} ${type}`);
            }

            // 3. Services tablosu güncellemesi
            const serviceCols = [
                ['department_id', 'INTEGER'],
                ['quantity', 'NUMERIC'],
                ['unit', 'VARCHAR(30)'],
                ['photo', 'TEXT']
            ];
            for (const [col, type] of serviceCols) {
                await client.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS ${col} ${type}`);
            }

            // 4. Users tablosu güncellemesi
            const userCols = [
                ['board_code', 'VARCHAR(20)'],
                ['gender', 'VARCHAR(20)'],
                ['department_id', 'INTEGER'],
                ['photo', 'TEXT'],
                ['quantity', 'NUMERIC'],
                ['unit', 'VARCHAR(30)']
            ];
            for (const [col, type] of userCols) {
                await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${type}`);
            }

            // 5. Appointments tablosu güncellemesi
            const appointmentCols = [
                ['rating', 'INTEGER'],
                ['comment', 'TEXT']
            ];
            for (const [col, type] of appointmentCols) {
                await client.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ${col} ${type}`);
            }

            console.log('[Migration] Database is up to date.');
        } catch (error) {
            console.error('[Migration] Failed:', error);
        } finally {
            client.release();
        }
    }

    private calculateDueDate() {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    }


    async createInvoice(invoice: Invoice) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const amount = Number(invoice.amount || 0);
            const vatRate = Number(invoice.vat_rate || 20);
            const discRate = Number(invoice.discount_rate || 0);

            const discount_amount = Number((amount * discRate / 100).toFixed(2));
            const subtotal = Number((amount - discount_amount).toFixed(2));
            const vat_amount = Number((subtotal * vatRate / 100).toFixed(2));
            const grand_total = Number((subtotal + vat_amount).toFixed(2));

            const query = `
                INSERT INTO invoices (
                    company_id, appointment_id, customer_name, customer_tax_number,
                    customer_tax_office, type, payment_method, amount, 
                    vat_rate, vat_amount, discount_rate, discount_amount, grand_total,
                    status, gib_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING *
            `;
            const values = [
                invoice.company_id, invoice.appointment_id, invoice.customer_name,
                invoice.customer_tax_number, invoice.customer_tax_office,
                invoice.type, invoice.payment_method, amount,
                vatRate, vat_amount, discRate, discount_amount, grand_total,
                'completed', 'not_sent'
            ];
            const result = await client.query(query, values);
            const newInvoice = result.rows[0];

            await this.createCashTransactionInternal(client, {
                company_id: invoice.company_id,
                type: 'income',
                category: 'sales',
                payment_method: invoice.payment_method,
                amount: grand_total,
                description: `${invoice.customer_name} - Satış Faturası (${invoice.type})`,
                transaction_date: new Date().toISOString().split('T')[0],
                due_date: invoice.payment_method === 'kart' ? this.calculateDueDate() : undefined
            });

            if (invoice.appointment_id) {
                await client.query(
                    "UPDATE appointments SET status = 'invoiced' WHERE id = $1",
                    [invoice.appointment_id]
                );
            }

            await client.query('COMMIT');
            return newInvoice;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async createCashTransactionInternal(client: any, transaction: CashTransaction) {
        const query = `
            INSERT INTO cash_transactions (
                company_id, type, category, payment_method, amount, description, transaction_date, due_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const values = [
            transaction.company_id, transaction.type, transaction.category,
            transaction.payment_method, transaction.amount, transaction.description,
            transaction.transaction_date, transaction.due_date
        ];
        return await client.query(query, values);
    }

    async createCashTransaction(transaction: CashTransaction) {
        const client = await pool.connect();
        try {
            const result = await this.createCashTransactionInternal(client, transaction);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getCashTransactions(companyId: number, startDate?: string, endDate?: string) {
        let query = 'SELECT * FROM cash_transactions WHERE company_id = $1';
        const values: any[] = [companyId];
        let i = 2;

        if (startDate && endDate) {
            query += ` AND transaction_date BETWEEN $${i} AND $${i + 1}`;
            values.push(startDate, endDate);
            i += 2;
        }

        query += ' ORDER BY transaction_date DESC, created_at DESC';
        const result = await pool.query(query, values);
        return result.rows;
    }

    async getMonthlyBalance(companyId: number) {
        const query = `
            SELECT 
                SUM(CASE WHEN type = 'income' AND payment_method = 'nakit' THEN amount ELSE 0 END) as total_cash_income,
                SUM(CASE WHEN type = 'expense' AND payment_method = 'nakit' THEN amount ELSE 0 END) as total_cash_expense,
                SUM(CASE WHEN payment_method = 'kart' THEN amount ELSE 0 END) as total_card_transactions
            FROM cash_transactions 
            WHERE company_id = $1 AND transaction_date >= date_trunc('month', CURRENT_DATE)
        `;
        const result = await pool.query(query, [companyId]);
        const row = result.rows[0];
        return {
            cash_balance: Number(row.total_cash_income || 0) - Number(row.total_cash_expense || 0),
            pending_card: Number(row.total_card_transactions || 0)
        };
    }

    async createPurchaseInvoice(data: any) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const query = `
                INSERT INTO purchase_invoices (company_id, supplier_name, invoice_no, amount, invoice_date, description)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const values = [data.company_id, data.supplier_name, data.invoice_no, data.amount, data.invoice_date, data.description];
            const result = await client.query(query, values);

            await this.createCashTransactionInternal(client, {
                company_id: data.company_id,
                type: 'expense',
                category: 'purchase',
                payment_method: 'nakit',
                amount: data.amount,
                description: `${data.supplier_name} - Alış Faturası (${data.invoice_no})`,
                transaction_date: data.invoice_date
            });

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getPurchaseInvoices(companyId: number) {
        const result = await pool.query('SELECT * FROM purchase_invoices WHERE company_id = $1 ORDER BY invoice_date DESC', [companyId]);
        return result.rows;
    }

    async getInvoices(companyId: number, startDate?: string, endDate?: string) {
        let query = 'SELECT * FROM invoices WHERE company_id = $1';
        const values: any[] = [companyId];
        let i = 2;

        if (startDate && endDate) {
            query += ` AND created_at::date BETWEEN $${i} AND $${i + 1}`;
            values.push(startDate, endDate);
            i += 2;
        }

        query += ' ORDER BY created_at DESC';
        const result = await pool.query(query, values);
        return result.rows;
    }

    async getInvoiceById(invoiceId: number, companyId: number) {
        const result = await pool.query(
            'SELECT * FROM invoices WHERE id = $1 AND company_id = $2',
            [invoiceId, companyId]
        );
        return result.rows[0] || null;
    }

    async prepareInvoice(invoiceId: number, companyId: number) {
        const invoice = await this.getInvoiceById(invoiceId, companyId);
        if (!invoice) throw new Error('Fatura bulunamadı');

        const companyRes = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
        const company = companyRes.rows[0];

        const prefix = company?.invoice_prefix || 'GIB';
        const year = new Date().getFullYear();
        const randomSeq = Math.floor(Math.random() * 900000000) + 100000000;
        const invoiceNo = `${prefix}${year}${randomSeq}`;
        const gibUUID = crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}`;

        // Get XSLT for Embedding
        const xsltContent = await this.getXSLT(invoice.type);
        const ublXml = this.generateUBLTR(invoice, company, invoiceNo, gibUUID, xsltContent);

        const updated = await pool.query(
            `UPDATE invoices SET invoice_no = $1, gib_uuid = $2, gib_status = 'ready', xml_content = $3 WHERE id = $4 RETURNING *`,
            [invoiceNo, gibUUID, ublXml, invoiceId]
        );

        return updated.rows[0];
    }

    async getXSLT(type: string): Promise<string> {
        // Filenames as found in d:/Saloon/xslt/
        const fileName = (type === 'e-fatura') ? 'efat.xslt' : 'eArsiv.xslt';
        const filePath = path.join(process.cwd(), 'xslt', fileName);

        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (e) {
            console.warn(`XSLT not found at ${filePath}, using default rendering.`);
            return '';
        }
    }

    async sendToGIB(invoiceId: number, companyId: number) {
        const invoice = await this.getInvoiceById(invoiceId, companyId);
        if (!invoice) throw new Error('Fatura bulunamadı');
        if (invoice.gib_status === 'success') throw new Error('Bu fatura zaten başarıyla gönderildi');

        await pool.query("UPDATE invoices SET gib_status = 'pending' WHERE id = $1", [invoiceId]);

        try {
            const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
            const companyInfo = companyResult.rows[0];

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

            const updated = await pool.query(
                `UPDATE invoices SET gib_status = 'success', gib_sent_at = NOW() WHERE id = $1 RETURNING *`,
                [invoiceId]
            );

            return { success: true, uuid: invoice.gib_uuid, invoice: updated.rows[0] };

        } catch (error: any) {
            await pool.query("UPDATE invoices SET gib_status = 'failed' WHERE id = $1", [invoiceId]);
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

    async getInvoiceHTML(invoiceId: number, companyId: number): Promise<string> {
        const invoiceRes = await pool.query('SELECT * FROM invoices WHERE id = $1 AND company_id = $2', [invoiceId, companyId]);
        const inv = invoiceRes.rows[0];
        if (!inv) throw new Error('Fatura bulunamadı');

        const companyRes = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
        const comp = companyRes.rows[0];

        const total = Number(inv.grand_total || inv.amount || 0);
        const vat = Number(inv.vat_amount || 0);
        const disc = Number(inv.discount_amount || 0);
        const base = Number(inv.amount || 0);
        const taxable = base - disc;

        return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Fatura Önizleme - ${inv.invoice_no || 'TASLAK'}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; background: #f8fafc; padding: 40px; color: #0f172a; margin: 0; }
        .invoice-box { max-width: 800px; margin: auto; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; position: relative; overflow: hidden; }
        .invoice-box::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 8px; background: linear-gradient(to right, #6366f1, #a855f7); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .company-info h1 { margin: 0; font-size: 24px; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: -0.025em; }
        .company-info p { margin: 4px 0; font-size: 13px; color: #64748b; font-weight: 500; }
        .invoice-details { text-align: right; }
        .invoice-details h2 { margin: 0; font-size: 32px; font-weight: 900; color: #6366f1; letter-spacing: -0.05em; }
        .invoice-details p { margin: 4px 0; font-size: 13px; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
        
        .section-title { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; }
        .client-info { margin-bottom: 40px; }
        .client-info p { margin: 2px 0; font-size: 14px; font-weight: 600; }

        table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        th { background: #f8fafc; color: #475569; font-size: 11px; font-weight: 900; text-transform: uppercase; padding: 15px; text-align: left; border-bottom: 2px solid #e2e8f0; }
        td { padding: 15px; font-size: 14px; border-bottom: 1px solid #f1f5f9; color: #334155; font-weight: 500; }
        
        .totals-container { display: flex; justify-content: flex-end; margin-top: 20px; }
        .totals-table { width: 300px; }
        .totals-table td { padding: 8px 15px; border: none; font-size: 13px; font-weight: 600; color: #64748b; }
        .totals-table .grand-total { border-top: 2px solid #e2e8f0; padding-top: 15px; margin-top: 10px; }
        .totals-table .grand-total td { font-size: 20px; font-weight: 900; color: #1e293b; }
        
        .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 10px; }
        .badge-blue { background: #eff6ff; color: #2563eb; }
        
        @media print { body { background: white; padding: 0; } .invoice-box { box-shadow: none; border: none; width: 100%; max-width: none; } }
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div class="company-info">
                <h1>${comp.name}</h1>
                <p>${comp.address_line || ''}</p>
                <p>${comp.district || ''} / ${comp.city || ''}</p>
                <p>VKN: ${comp.tax_number || ''} - Vergi Dairesi: ${comp.tax_office || ''}</p>
                <p>Tel: ${comp.phone || ''}</p>
            </div>
            <div class="invoice-details">
                <span class="badge badge-blue">${inv.type === 'e-fatura' ? 'E-Fatura' : 'E-Arşiv Fatura'}</span>
                <h2>FATURA</h2>
                <p>No: ${inv.invoice_no || 'TASLAK'}</p>
                <p>Tarih: ${new Date(inv.created_at).toLocaleDateString('tr-TR')}</p>
                <p>UUID: ${inv.gib_uuid || '-'}</p>
            </div>
        </div>

        <div class="client-info">
            <div class="section-title">SAYIN ALICI</div>
            <p style="font-size: 18px; color: #1e293b;">${inv.customer_name}</p>
            <p>VKN/TCKN: ${inv.customer_tax_number || '11111111111'}</p>
            ${inv.customer_tax_office ? `<p>Vergi Dairesi: ${inv.customer_tax_office}</p>` : ''}
        </div>

        <table>
            <thead>
                <tr>
                    <th>Açıklama</th>
                    <th style="text-align: right;">Birim Fiyat</th>
                    <th style="text-align: right;">İskonto</th>
                    <th style="text-align: right;">KDV</th>
                    <th style="text-align: right;">Toplam</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Hizmet Bedeli</td>
                    <td style="text-align: right;">${base.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                    <td style="text-align: right;">${disc > 0 ? `%${inv.discount_rate} (${disc.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺)` : '-'}</td>
                    <td style="text-align: right;">%${inv.vat_rate}</td>
                    <td style="text-align: right;">${taxable.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                </tr>
            </tbody>
        </table>

        <div class="totals-container">
            <table class="totals-table">
                <tr>
                    <td>Ara Toplam</td>
                    <td style="text-align: right;">${base.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                </tr>
                <tr>
                    <td>Toplam İskonto</td>
                    <td style="text-align: right;">-${disc.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                </tr>
                <tr>
                    <td>KDV Matrahı</td>
                    <td style="text-align: right;">${taxable.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                </tr>
                <tr>
                    <td>Hesaplanan KDV (%${inv.vat_rate})</td>
                    <td style="text-align: right;">${vat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                </tr>
                <tr class="grand-total">
                    <td>GENEL TOPLAM</td>
                    <td style="text-align: right;">${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                </tr>
            </table>
        </div>
        
        <div style="margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 11px; color: #94a3b8; text-align: center;">
            Bu belge 213 sayılı VUK hükümlerine göre elektronik ortamda düzenlenmiştir.
        </div>
    </div>
</body>
</html>`;
    }

    async checkEInvoiceUser(vkn: string, companyId: number) {
        const companyResult = await pool.query('SELECT qnb_username, qnb_password, efatura_test_mode FROM companies WHERE id = $1', [companyId]);
        const company = companyResult.rows[0];

        const QNB_CONFIG = {
            username: company?.qnb_username || 'USERNAME_PLACEHOLDER',
            password: company?.qnb_password || 'PASSWORD_PLACEHOLDER',
            test: company?.efatura_test_mode !== false
        };

        // Simulated check
        await new Promise(r => setTimeout(r, 800));
        const isEInvoice = vkn.startsWith('1');
        return { isEInvoice };
    }
}

export default new FinanceService();
