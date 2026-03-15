
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:your_password_here@localhost:5432/saloon_db"
});

async function run() {
    try {
        const res = await pool.query("SELECT id, name, sms_enabled, phone FROM companies WHERE name ILIKE '%Hasan%'");
        console.log('HASAN_RESULT:', JSON.stringify(res.rows));
        
        const settings = await pool.query("SELECT * FROM sms_settings WHERE company_id IN (SELECT id FROM companies WHERE name ILIKE '%Hasan%')");
        console.log('HASAN_SETTINGS:', JSON.stringify(settings.rows));
    } catch (err) {
        console.error('DB_ERROR:', err.message);
    } finally {
        process.exit(0);
    }
}

run();
