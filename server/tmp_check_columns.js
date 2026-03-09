
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
    port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'saloon_db'),
    user: process.env.DATABASE_URL ? undefined : (process.env.DB_USER || 'postgres'),
    password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
});

async function checkColumns() {
    try {
        console.log('--- Appointments Columns ---');
        const appColumns = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'appointments'");
        appColumns.rows.forEach(c => console.log(`${c.column_name}: ${c.data_type}`));

        console.log('\n--- Appointment Services Columns ---');
        const serviceColumns = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'appointment_services'");
        serviceColumns.rows.forEach(c => console.log(`${c.column_name}: ${c.data_type}`));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkColumns();
