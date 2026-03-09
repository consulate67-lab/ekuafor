
const { Pool } = require('pg');
const DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function check() {
    try {
        const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies'
    `);
        const cols = res.rows.map(r => r.column_name);
        const checkList = [
            'qnb_username', 'qnb_password', 'qnb_vkn', 'efatura_test_mode', 'invoice_prefix',
            'tax_number', 'tax_office'
        ];

        checkList.forEach(c => {
            console.log(`${c}: ${cols.includes(c) ? 'EXISTS' : 'MISSING'}`);
        });
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
