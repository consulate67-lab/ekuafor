const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
    port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'saloon_db'),
    user: process.env.DATABASE_URL ? undefined : (process.env.DB_USER || 'postgres'),
    password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
});

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        console.log('--- Columns in users table ---');
        res.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));

        const countRes = await pool.query('SELECT COUNT(*) FROM companies');
        console.log('\nTotal companies:', countRes.rows[0].count);

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
}

checkSchema();
