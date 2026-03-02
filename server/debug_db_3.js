const { Pool } = require('pg');
const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

async function check() {
    try {
        const companies = await pool.query('SELECT id FROM companies ORDER BY id ASC LIMIT 10');
        console.log('Company IDs:', companies.rows.map(r => r.id));

        const users = await pool.query('SELECT id, email, company_id FROM users');
        console.log('Users:', users.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
