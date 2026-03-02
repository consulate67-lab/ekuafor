const { Pool } = require('pg');
const OLD_DB_URL = 'postgresql://postgres:vujkqIumXHksrFCbwsBvdQNoWPwvylnc@crossover.proxy.rlwy.net:50175/railway';

const pool = new Pool({
    connectionString: OLD_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const c = await pool.query('SELECT count(*) FROM companies');
        const s = await pool.query('SELECT count(*) FROM services');
        const u = await pool.query('SELECT count(*) FROM users');
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
