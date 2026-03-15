
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:your_password_here@localhost:5432/saloon_db"
});

async function run() {
    try {
        const res = await pool.query("SELECT * FROM sms_settings");
        console.log('ALL_SMS_SETTINGS:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('DB_ERROR:', err.message);
    } finally {
        process.exit(0);
    }
}

run();
