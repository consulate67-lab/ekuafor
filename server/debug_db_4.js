const { Pool } = require('pg');
const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

async function check() {
    try {
        console.log('--- TARGET DB CHECK ---');
        const companies = await pool.query('SELECT id, name FROM companies ORDER BY id ASC LIMIT 20');
        console.log('Target Companies:', companies.rows);

        const users = await pool.query('SELECT id, email, role, company_id FROM users');
        console.log('Target Users:', users.rows);

        const smsSettings = await pool.query('SELECT * FROM sms_settings');
        console.log('Target SMS Settings:', smsSettings.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
