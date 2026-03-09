
const { Pool } = require('pg');
const DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function listAll() {
    try {
        const res = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'companies'
      ORDER BY column_name
    `);
        console.log(res.rows.map(r => r.column_name).join(', '));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

listAll();
