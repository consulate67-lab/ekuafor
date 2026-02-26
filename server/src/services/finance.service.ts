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

            // Update appointment status to reflect it's invoiced (optional column could be added but status is 'completed' already)

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

    private calculateDueDate() {
        // Standard 30 days for credit card payments (example logic)
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    }
}

export default new FinanceService();
