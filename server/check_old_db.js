const { Pool } = require('pg');
const OLD_DB_URL = 'postgresql://postgres:vujkqIumXHksrFCbwsBvdQNoWPwvylnc@crossover.proxy.rlwy.net:50175/railway';
const pool = new Pool({ connectionString: OLD_DB_URL, ssl: { rejectUnauthorized: false } });

async function check() {
    try {
        const res = await pool.query('SELECT * FROM companies WHERE id = 1');
        console.log('Old Company 1:', res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
