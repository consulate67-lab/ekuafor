const { Client } = require('pg');

const RAILWAY_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';

const tables = [
    'main_companies', 'companies', 'departments', 'users', 'company_users', 
    'services', 'packages', 'package_services', 'appointments', 
    'appointment_services', 'expenses', 'expense_items', 'current_accounts', 
    'invoices', 'invoice_items', 'cash_transactions', 'settings',
    'working_hours', 'payments', 'sms_settings', 'sms_logs', 'customer_devices'
];

async function checkRailwayCounts() {
    const client = new Client({
        connectionString: RAILWAY_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('--- RAILWAY (CENTERBEAM) TABLE COUNTS ---');
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

checkRailwayCounts();
