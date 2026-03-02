const { Pool } = require('pg');
const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

async function check() {
    try {
        const res = await pool.query(`
            SELECT column_name, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'sms_settings' AND column_name = 'company_id'
        `);
        console.log('SmsSettings company_id:', res.rows);

        const companiesCount = await pool.query('SELECT count(*) FROM companies');
        console.log('Total companies:', companiesCount.rows[0].count);

        const usersCount = await pool.query('SELECT count(*) FROM users');
        console.log('Total users:', usersCount.rows[0].count);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
