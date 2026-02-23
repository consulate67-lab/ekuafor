
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '5432',
    database: process.env.DB_NAME || 'saloon_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password_here',
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        console.log('Checking database...');
        const res = await pool.query('SELECT COUNT(*) FROM companies');
        console.log('Total companies:', res.rows[0].count);

        const activeRes = await pool.query('SELECT COUNT(*) FROM companies WHERE is_active = true');
        console.log('Active companies:', activeRes.rows[0].count);

        const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'companies'");
        console.log('Columns in companies table:', columns.rows.map(r => r.column_name).join(', '));

        const sample = await pool.query('SELECT id, name, is_active, latitude, longitude FROM companies LIMIT 5');
        console.log('Sample companies:', sample.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
