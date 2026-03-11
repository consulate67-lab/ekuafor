
const { Pool } = require('pg');
require('dotenv').config({ path: 'server/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function run() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'companies'");
        console.log('Columns in companies:');
        console.log(res.rows.map(r => r.column_name).sort().join(', '));
        
        const res2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        console.log('\nColumns in users:');
        console.log(res2.rows.map(r => r.column_name).sort().join(', '));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
