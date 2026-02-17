const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkAppointments() {
    try {
        console.log('--- Appointments Table ---');
        const apps = await pool.query('SELECT * FROM appointments ORDER BY created_at DESC LIMIT 10');
        console.table(apps.rows);

        console.log('\n--- Users Table (Selim) ---');
        const users = await pool.query("SELECT id, email, role, company_id FROM users WHERE email = 'selim@saloon.com'");
        console.table(users.rows);

        console.log('\n--- Company Users Table ---');
        const cu = await pool.query('SELECT * FROM company_users LIMIT 5');
        console.table(cu.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

checkAppointments();
