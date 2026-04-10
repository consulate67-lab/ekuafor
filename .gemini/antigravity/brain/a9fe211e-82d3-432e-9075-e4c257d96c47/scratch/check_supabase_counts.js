const { Client } = require('pg');

const SUPABASE_CONFIG = {
    host: 'aws-1-eu-central-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.xljwypebyqpcmdqtrhwx',
    password: 'C97gcEqtkm4IW5o6',
    ssl: { rejectUnauthorized: false }
};

const tables = [
    'main_companies', 'companies', 'departments', 'users', 'company_users', 
    'services', 'packages', 'package_services', 'appointments', 
    'appointment_services', 'expenses', 'expense_items', 'current_accounts', 
    'invoices', 'invoice_items', 'cash_transactions', 'settings',
    'working_hours', 'payments', 'sms_settings', 'sms_logs', 'customer_devices'
];

async function checkCounts() {
    const client = new Client(SUPABASE_CONFIG);
    try {
        await client.connect();
        console.log('--- SUPABASE TABLE COUNTS ---');
        for (const table of tables) {
            try {
                const res = await client.query(`SELECT count(*) FROM "${table}"`);
                console.log(`${table}: ${res.rows[0].count}`);
            } catch (e) {
                console.log(`${table}: MISSING TABLE or ERROR (${e.message})`);
            }
        }
    } catch (err) {
        console.error('Connection error:', err.message);
    } finally {
        await client.end();
    }
}

checkCounts();
