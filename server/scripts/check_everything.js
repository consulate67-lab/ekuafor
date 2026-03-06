const { Pool } = require('pg');
const DATABASE_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
    try {
        console.log('--- SHOW TABLES ---');
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.table(tables.rows);

        console.log('--- SHOW SMS_LOGS ---');
        if (tables.rows.some(r => r.table_name === 'sms_logs')) {
            const smsRes = await pool.query('SELECT created_at, phone_number, provider, status, error_message FROM sms_logs ORDER BY created_at DESC LIMIT 10');
            console.table(smsRes.rows);
        } else {
            console.log('sms_logs table DOES NOT EXIST');
        }

        console.log('--- SHOW PUSH_LOGS ---');
        if (tables.rows.some(r => r.table_name === 'push_logs')) {
            const pushRes = await pool.query('SELECT * FROM push_logs ORDER BY created_at DESC LIMIT 10');
            console.table(pushRes.rows);
        } else {
            console.log('push_logs table DOES NOT EXIST');
        }

        await pool.end();
    } catch (e) { console.error(e); }
}
check();
