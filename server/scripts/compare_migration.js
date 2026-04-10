const { Client } = require('pg');
const fs = require('fs');

const RAILWAY_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
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

async function compare() {
    let report = "MIGRATION COMPARISON REPORT\n";
    report += "===========================\n\n";

    const railway = new Client({ connectionString: RAILWAY_URL, ssl: { rejectUnauthorized: false } });
    const supabase = new Client(SUPABASE_CONFIG);

    try {
        await railway.connect();
        await supabase.connect();

        for (const table of tables) {
            let rCount = "N/A";
            let sCount = "N/A";

            try {
                const rRes = await railway.query(`SELECT count(*) FROM "${table}"`);
                rCount = rRes.rows[0].count;
            } catch (e) { rCount = "ERROR"; }

            try {
                const sRes = await supabase.query(`SELECT count(*) FROM "${table}"`);
                sCount = sRes.rows[0].count;
            } catch (e) { sCount = "ERROR"; }

            report += `${table.padEnd(25)} | Railway: ${rCount.toString().padStart(5)} | Supabase: ${sCount.toString().padStart(5)}\n`;
        }

    } catch (err) {
        report += `\nFATAL ERROR: ${err.message}\n`;
    } finally {
        await railway.end().catch(() => {});
        await supabase.end().catch(() => {});
        fs.writeFileSync('d:/Saloon/server/migration_report_utf8.txt', report, 'utf8');
        console.log('Report generated at d:/Saloon/server/migration_report_utf8.txt');
    }
}

compare();
