import pool from '../config/database';

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

            // Create Cash Transaction automatically
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

            // Mark appointment as invoiced so it won't appear in pending list
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
        const result = await pool.query(query, values);
        return result.rows[0];
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

            // Log as expense
            await this.createCashTransactionInternal(client, {
                company_id: data.company_id,
                type: 'expense',
                category: 'purchase',
                payment_method: 'nakit', // Assuming purchase paid cash for now
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

    async sendToGIB(invoiceId: number, companyId: number) {
        const invoice = await this.getInvoiceById(invoiceId, companyId);
        if (!invoice) throw new Error('Fatura bulunamadı');
        if (invoice.gib_status === 'sent') throw new Error('Bu fatura zaten gönderildi');

        // GİB Durumunu 'pending' yap (Optimistik)
        await pool.query("UPDATE invoices SET gib_status = 'pending' WHERE id = $1", [invoiceId]);

        try {
            // QNB / e-Finans Kullanıcı Bilgileri (Normalde firma ayarlarından gelmeli)
            const QNB_CONFIG = {
                username: 'USERNAME_PLACEHOLDER', // e-Finans kullanıcı adı
                password: 'PASSWORD_PLACEHOLDER', // e-Finans şifre
                vkn: '3250566851', // Firmanın kendi VKN/TCKN'si
                test: true // Test ortamı mı?
            };

            const soapEndpoint = invoice.type === 'e-fatura'
                ? 'https://erpefaturatest.cs.com.tr:8443/efatura/ws/connectorService'
                : 'https://earsivtest.efinans.com.tr/earsiv/ws/EarsivWebService';

            // 0. Firma Bilgilerini Getir (Vergi No, Adres vb için)
            const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
            const companyInfo = companyResult.rows[0];

            // 1. UBL-TR XML Hazırla (Base64)
            const ublXml = this.generateUBLTR(invoice, companyInfo);
            const base64Veri = Buffer.from(ublXml).toString('base64');

            // 2. SOAP Request Gövdesi
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

            // Not: axios ile gönderim yapılacak. Şimdilik simüle ediyoruz ama yapı hazır.
            // const response = await axios.post(soapEndpoint, soapRequest, { headers: { 'Content-Type': 'text/xml' } });

            const simulatedUUID = `QNB-${Date.now()}-${invoiceId}`;
            await new Promise(r => setTimeout(r, 1500));

            const updated = await pool.query(
                `UPDATE invoices 
                 SET gib_status = 'sent', gib_uuid = $1, gib_sent_at = NOW() 
                 WHERE id = $2 RETURNING *`,
                [simulatedUUID, invoiceId]
            );

            return { success: true, uuid: simulatedUUID, invoice: updated.rows[0] };

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

    async checkEInvoiceUser(vkn: string) {
        // QNB SOAP Check
        const QNB_CONFIG = {
            username: 'USERNAME_PLACEHOLDER',
            password: 'PASSWORD_PLACEHOLDER',
            test: true
        };

        const soapRequest = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.connector.uut.cs.com.tr/">
                <soapenv:Header/>
                <soapenv:Body>
                    <ser:efaturaKullaniciBilgisi>
                        <vergiTcKimlikNo>${vkn}</vergiTcKimlikNo>
                    </ser:efaturaKullaniciBilgisi>
                </soapenv:Body>
            </soapenv:Envelope>
        `;

        // axios.post(...) call would go here.
        // For now, let's pretend we checked and if VKN starts with '1', it's e-invoice for testing.
        await new Promise(r => setTimeout(r, 800));
        const isEInvoice = vkn.startsWith('1');

        return { isEInvoice };
    }

    private calculateDueDate() {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    }
}

export default new FinanceService();
