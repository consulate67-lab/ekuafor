
const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Saloon/server/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'saloon_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function checkSchema() {
    try {
        const res = await pool.query("SELECT table_name, column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name IN ('users', 'companies')");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
