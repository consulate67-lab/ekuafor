const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkLogs() {
    try {
        console.log('--- DB Log Review (Production) ---');

        console.log('--- Last 5 SMS LOGS ---');
        const smsRes = await pool.query('SELECT created_at, phone_number, status, error_message FROM sms_logs ORDER BY created_at DESC LIMIT 5');
        console.table(smsRes.rows);

        console.log('--- Last 5 PUSH LOGS ---');
        const pushRes = await pool.query('SELECT created_at, phone_number, title, status, error_message FROM push_logs ORDER BY created_at DESC LIMIT 5');
        console.table(pushRes.rows);

        console.log('--- Last 5 APPOINTMENTS with Status ---');
        const appRes = await pool.query('SELECT created_at, id, customer_phone, status FROM appointments ORDER BY id DESC LIMIT 5');
        console.table(appRes.rows);

        await pool.end();
    } catch (err) {
        console.error('FAILED TO FETCH LOGS:', err);
        process.exit(1);
    }
}

checkLogs();
