const { Pool } = require('pg');
const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';

const pool = new Pool({
    connectionString: NEW_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const c = await pool.query('SELECT count(*) FROM companies');
        const s = await pool.query('SELECT count(*) FROM services');
        const u = await pool.query('SELECT count(*) FROM users');
        console.log('--- NEW DB COUNTS ---');
        console.log('Companies:', c.rows[0].count);
        console.log('Services:', s.rows[0].count);
        console.log('Users:', u.rows[0].count);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
check();
