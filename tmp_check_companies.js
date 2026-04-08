
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

async function checkCompanies() {
    try {
        const res = await pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active, COUNT(*) FILTER (WHERE is_verified = true) as verified FROM companies");
        console.log('--- Company Stats ---');
        console.log(res.rows[0]);
        
        const cities = await pool.query("SELECT city, COUNT(*) FROM companies GROUP BY city");
        console.log('--- Cities ---');
        console.log(cities.rows);

        const samples = await pool.query("SELECT id, name, city, latitude, longitude FROM companies LIMIT 5");
        console.log('--- Sample Companies ---');
        console.log(samples.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkCompanies();
