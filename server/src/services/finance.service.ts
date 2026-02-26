import pool from '../config/database';
import crypto from 'crypto';

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
                ['invoice_prefix', "VARCHAR(3) DEFAULT 'GIB'"]
            ];
            for (const [col, type] of companyCols) {
                await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS ${col} ${type}`);
            }

            // 2. Invoices tablosu güncellemesi
            const invoiceCols = [
                ['customer_tax_number', 'VARCHAR(20)'],
                ['customer_tax_office', 'VARCHAR(100)'],
                ['gib_uuid', 'VARCHAR(50)'],
                ['gib_status', "VARCHAR(20) DEFAULT 'not_sent'"],
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

            const query = `
                INSERT INTO invoices (
                    company_id, appointment_id, customer_name, customer_tax_number,
                    customer_tax_office, type, payment_method, amount, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;
            const values = [
                invoice.company_id, invoice.appointment_id, invoice.customer_name,
                invoice.customer_tax_number, invoice.customer_tax_office,
                invoice.type, invoice.payment_method, invoice.amount, 'completed'
            ];
            const result = await client.query(query, values);
            const newInvoice = result.rows[0];

            await this.createCashTransactionInternal(client, {
                company_id: invoice.company_id,
                type: 'income',
                category: 'sales',
                payment_method: invoice.payment_method,
                amount: invoice.amount,
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
        if (invoice.gib_status === 'sent') throw new Error('Bu fatura zaten gönderildi');

        const companyRes = await pool.query('SELECT invoice_prefix FROM companies WHERE id = $1', [companyId]);
        const prefix = companyRes.rows[0]?.invoice_prefix || 'GIB';
        const year = new Date().getFullYear();

        const randomSequence = Math.floor(Math.random() * 900000000) + 100000000;
        const invoiceNo = `${prefix}${year}${randomSequence}`;
        const gibUUID = crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}`;

        const updated = await pool.query(
            `UPDATE invoices SET invoice_no = $1, gib_uuid = $2, gib_status = 'prepared' WHERE id = $3 RETURNING *`,
            [invoiceNo, gibUUID, invoiceId]
        );

        return updated.rows[0];
    }

    async sendToGIB(invoiceId: number, companyId: number) {
        const invoice = await this.getInvoiceById(invoiceId, companyId);
        if (!invoice) throw new Error('Fatura bulunamadı');
        if (invoice.gib_status === 'sent') throw new Error('Bu fatura zaten gönderildi');

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

            const soapEndpoint = invoice.type === 'e-fatura'
                ? (QNB_CONFIG.test ? 'https://erpefaturatest.cs.com.tr:8443/efatura/ws/connectorService' : 'https://efatura.cs.com.tr/efatura/ws/connectorService')
                : (QNB_CONFIG.test ? 'https://earsivtest.efinans.com.tr/earsiv/ws/EarsivWebService' : 'https://earsiv.efinans.com.tr/earsiv/ws/EarsivWebService');

            const ublXml = this.generateUBLTR(invoice, companyInfo);
            const base64Veri = Buffer.from(ublXml).toString('base64');

            const soapRequest = `
                <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.connector.uut.cs.com.tr/">
                    <soapenv:Header>
                        <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
                            <wsse:UsernameToken>
                                <wsse:Username>${QNB_CONFIG.username}</wsse:Username>
                                <wsse:Password>${QNB_CONFIG.password}</wsse:Password>
                            </wsse:UsernameToken>
                        </wsse:Security>
                    </soapenv:Header>
                    <soapenv:Body>
                        <ser:belgeGonderExt>
                            <parametreler>
                                <vergiTcKimlikNo>${QNB_CONFIG.vkn}</vergiTcKimlikNo>
                                <belgeTuru>${invoice.type === 'e-fatura' ? 'FATURA_UBL' : 'EARSIV_FATURA'}</belgeTuru>
                                <belgeNo>${invoice.invoice_no || ''}</belgeNo>
                                <veri>${base64Veri}</veri>
                                <belgeHash></belgeHash>
                            </parametreler>
                        </ser:belgeGonderExt>
                    </soapenv:Body>
                </soapenv:Envelope>
            `;

            // Simulating QNB response
            await new Promise(r => setTimeout(r, 1500));

            const updated = await pool.query(
                `UPDATE invoices SET gib_status = 'sent', gib_sent_at = NOW() WHERE id = $1 RETURNING *`,
                [invoiceId]
            );

            return { success: true, uuid: invoice.gib_uuid, invoice: updated.rows[0] };

        } catch (error: any) {
            await pool.query("UPDATE invoices SET gib_status = 'failed' WHERE id = $1", [invoiceId]);
            throw new Error(`QNB Entegrasyon Hatası: ${error.message}`);
        }
    }

    private generateUBLTR(invoice: any, company: any) {
        const now = new Date();
        const issueDate = now.toISOString().split('T')[0];
        const issueTime = now.toTimeString().split(' ')[0];
        const uuid = invoice.gib_uuid || `GIB-${Date.now()}`;

        return `<?xml version="1.0" encoding="UTF-8"?>
        <?xml-stylesheet type="text/xsl" href="invoice_template.xslt"?>
        <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" 
                 xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" 
                 xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" 
                 xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
                 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
            <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
            <cbc:ProfileID>${invoice.type === 'e-fatura' ? 'TEMELFATURA' : 'EARSIVFATURA'}</cbc:ProfileID>
            <cbc:ID>${invoice.invoice_no || ''}</cbc:ID>
            <cbc:UUID>${uuid}</cbc:UUID>
            <cbc:IssueDate>${issueDate}</cbc:IssueDate>
            <cbc:IssueTime>${issueTime}</cbc:IssueTime>
            <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
            <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
            <cbc:LineCountNumeric>1</cbc:LineCountNumeric>
            
            <cac:AdditionalDocumentReference>
                <cbc:ID>${uuid}</cbc:ID>
                <cbc:IssueDate>${issueDate}</cbc:IssueDate>
                <cbc:DocumentTypeCode>XSLT</cbc:DocumentTypeCode>
            </cac:AdditionalDocumentReference>

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
                        <cbc:CitySubdivisionName>${company?.district || ''}</cbc:CitySubdivisionName>
                        <cbc:CityName>${company?.city || ''}</cbc:CityName>
                        <cac:Country>
                            <cbc:Name>Türkiye</cbc:Name>
                        </cac:Country>
                    </cac:PostalAddress>
                    <cac:PartyTaxScheme>
                        <cac:TaxScheme>
                            <cbc:Name>${company?.tax_office || ''}</cbc:Name>
                        </cac:TaxScheme>
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
                </cac:Party>
            </cac:AccountingCustomerParty>

            <cac:TaxTotal>
                <cbc:TaxAmount currencyID="TRY">${((invoice.amount || 0) * 0.20).toFixed(2).replace(',', '.')}</cbc:TaxAmount>
                <cac:TaxSubtotal>
                    <cbc:TaxableAmount currencyID="TRY">${(invoice.amount || 0).toFixed(2).replace(',', '.')}</cbc:TaxableAmount>
                    <cbc:TaxAmount currencyID="TRY">${((invoice.amount || 0) * 0.20).toFixed(2).replace(',', '.')}</cbc:TaxAmount>
                    <cac:TaxCategory>
                        <cac:TaxScheme>
                            <cbc:Name>KDV</cbc:Name>
                            <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
                        </cac:TaxScheme>
                    </cac:TaxCategory>
                </cac:TaxSubtotal>
            </cac:TaxTotal>

            <cac:LegalMonetaryTotal>
                <cbc:LineExtensionAmount currencyID="TRY">${(invoice.amount || 0).toFixed(2).replace(',', '.')}</cbc:LineExtensionAmount>
                <cbc:TaxExclusiveAmount currencyID="TRY">${(invoice.amount || 0).toFixed(2).replace(',', '.')}</cbc:TaxExclusiveAmount>
                <cbc:TaxInclusiveAmount currencyID="TRY">${((invoice.amount || 0) * 1.20).toFixed(2).replace(',', '.')}</cbc:TaxInclusiveAmount>
                <cbc:PayableAmount currencyID="TRY">${((invoice.amount || 0) * 1.20).toFixed(2).replace(',', '.')}</cbc:PayableAmount>
            </cac:LegalMonetaryTotal>

            <cac:InvoiceLine>
                <cbc:ID>1</cbc:ID>
                <cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity>
                <cbc:LineExtensionAmount currencyID="TRY">${(invoice.amount || 0).toFixed(2).replace(',', '.')}</cbc:LineExtensionAmount>
                <cac:Item>
                    <cbc:Name>Hizmet Bedeli</cbc:Name>
                </cac:Item>
                <cac:Price>
                    <cbc:PriceAmount currencyID="TRY">${(invoice.amount || 0).toFixed(2).replace(',', '.')}</cbc:PriceAmount>
                </cac:Price>
            </cac:InvoiceLine>
        </Invoice>`;
    }

    async checkEInvoiceUser(vkn: string, companyId: number) {
        const companyResult = await pool.query('SELECT qnb_username, qnb_password, efatura_test_mode FROM companies WHERE id = $1', [companyId]);
        const company = companyResult.rows[0];

        const QNB_CONFIG = {
            username: company?.qnb_username || 'USERNAME_PLACEHOLDER',
            password: company?.qnb_password || 'PASSWORD_PLACEHOLDER',
            test: company?.efatura_test_mode !== false
        };

        await new Promise(r => setTimeout(r, 800));
        const isEInvoice = vkn.startsWith('1');
        return { isEInvoice };
    }

    async getInvoiceHTML(invoiceId: number, companyId: number) {
        const invoice = await this.getInvoiceById(invoiceId, companyId);
        if (!invoice) throw new Error('Fatura bulunamadı');
        const companyRes = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
        const company = companyRes.rows[0];

        return `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: sans-serif; padding: 40px; color: #333; max-width: 800px; margin: auto; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
                .info-box { width: 45%; }
                table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                th { background: #f8f9fa; text-align: left; padding: 12px; border-bottom: 2px solid #ddd; font-size: 12px; text-transform: uppercase; }
                td { padding: 12px; border-bottom: 1px solid #eee; }
                .total { text-align: right; margin-top: 20px; font-weight: bold; font-size: 1.2em; border-top: 2px solid #eee; padding-top: 10px; }
                .footer { margin-top: 50px; font-size: 0.8em; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="info-box">
                    <h2 style="margin: 0;">${company.name}</h2>
                    <p style="margin: 5px 0; font-size: 13px;">${company.address_line || ''}</p>
                    <p style="margin: 5px 0; font-size: 13px;">${company.city || ''} / ${company.district || ''}</p>
                    <p style="margin: 5px 0; font-size: 13px;"><b>VKN:</b> ${company.tax_number || ''}</p>
                </div>
                <div class="info-box" style="text-align: right;">
                    <h1 style="color: #6366f1; margin: 0;">FATURA</h1>
                    <p style="margin: 5px 0;"><b>Fatura No:</b> ${invoice.invoice_no || 'TASLAK'}</p>
                    <p style="margin: 5px 0;"><b>Tarih:</b> ${new Date().toLocaleDateString('tr-TR')}</p>
                    <p style="margin: 5px 0;"><b>Tür:</b> ${invoice.type === 'e-fatura' ? 'E-Fatura' : 'E-Arşiv'}</p>
                </div>
            </div>
            
            <div style="margin-top: 30px; background: #fafafa; padding: 20px; border-radius: 10px;">
                <label style="font-size: 10px; font-weight: bold; color: #999;">ALICI</label>
                <p style="margin: 5px 0;"><b>${invoice.customer_name}</b></p>
                ${invoice.customer_tax_number ? `<p style="margin: 5px 0; font-size: 13px;">VKN/TCKN: ${invoice.customer_tax_number}</p>` : ''}
                ${invoice.customer_tax_office ? `<p style="margin: 5px 0; font-size: 13px;">Vergi Dairesi: ${invoice.customer_tax_office}</p>` : ''}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Hizmet / Ürün</th>
                        <th style="text-align: center;">Miktar</th>
                        <th style="text-align: right;">Birim Fiyat</th>
                        <th style="text-align: right;">Toplam</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Hizmet Bedeli</td>
                        <td style="text-align: center;">1 Adet</td>
                        <td style="text-align: right;">${Number(invoice.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</td>
                        <td style="text-align: right;">${Number(invoice.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</td>
                    </tr>
                </tbody>
            </table>

            <div class="total">
                <span style="font-size: 14px; font-weight: normal; color: #666; margin-right: 20px;">GENEL TOPLAM</span>
                ${Number(invoice.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
            </div>

            <div class="footer">
                <p><b>ETTN (UUID):</b> ${invoice.gib_uuid || '-'}</p>
                <p>Bu belge elektronik ortamda oluşturulmuş bir önizlemedir. Mali değeri yoktur.</p>
            </div>
        </body>
        </html>
        `;
    }
}

export default new FinanceService();
