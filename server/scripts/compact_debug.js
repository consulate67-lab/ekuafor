const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway', ssl: { rejectUnauthorized: false } });

async function debug() {
    try {
        const compInfo = await pool.query("SELECT id, name, sms_enabled FROM companies WHERE id IN (SELECT DISTINCT company_id FROM appointments ORDER BY company_id DESC LIMIT 10)");
        console.log('--- Companies Config ---');
        compInfo.rows.forEach(r => console.log(`ID: ${r.id}, Name: ${r.name}, SMS: ${r.sms_enabled}`));

        const pushLogs = await pool.query("SELECT created_at, phone_number, status, error_message FROM push_logs ORDER BY created_at DESC LIMIT 5");
        console.log('\n--- Recent Push Logs ---');
        pushLogs.rows.forEach(r => console.log(`${r.created_at} - ${r.phone_number} - ${r.status}: ${r.error_message}`));

        if ((await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'sms_logs'")).rowCount > 0) {
            const smsLogs = await pool.query("SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 5");
            console.log('\n--- Recent SMS Logs ---');
            smsLogs.rows.forEach(r => console.log(`${r.created_at} - ${r.phone_number} - ${r.status || r.error_message}`));
        }

        const appts = await pool.query("SELECT id, status, customer_phone, device_id, updated_at FROM appointments ORDER BY updated_at DESC LIMIT 5");
        console.log('\n--- Recent Appointment Status Changes ---');
        appts.rows.forEach(r => console.log(`ID: ${r.id}, Phone: ${r.customer_phone}, Status: ${r.status}, Updated: ${r.updated_at}`));

        await pool.end();
    } catch (e) { console.error(e); await pool.end(); }
}
debug();
