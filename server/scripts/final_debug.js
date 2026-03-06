const { Pool } = require('pg');
const DATABASE_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function debug() {
    try {
        console.log('--- DB Check ---');
        const res = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'');
        console.log('Tables:', res.rows.map(r => r.table_name).join(', '));

        console.log('\n--- Checking 公司 (Companies) Table Structure ---');
        const compCols = await pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'companies\'');
        console.table(compCols.rows);

        console.log('\n--- Recent Appointments (Last 5) ---');
        const apps = await pool.query('SELECT id, company_id, status, customer_phone, device_id, created_at FROM appointments ORDER BY created_at DESC LIMIT 5');
        console.table(apps.rows);

        if (res.rows.some(r => r.table_name === 'sms_logs')) {
            const logCols = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'sms_logs\'');
            console.log('sms_logs columns:', logCols.rows.map(r => r.column_name).join(', '));
            const logs = await pool.query('SELECT * FROM sms_logs ORDER BY id DESC LIMIT 5');
            console.table(logs.rows);
        }

        await pool.end();
    } catch (e) {
        console.error('ERROR:', e.message);
        await pool.end();
    }
}
debug();
