import 'dotenv/config';
import { Pool } from 'pg';
import axios from 'axios';

// Get DB connection directly from .env since pool in config/database.ts might have wrong env vars if run from script root sometimes.
const connectionString = process.env.DATABASE_URL;

const pool = new Pool(connectionString ? { connectionString, ssl: { rejectUnauthorized: false } } : {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'saloon_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password_here'
});

async function run() {
    try {
        console.log("Checking appointments for recent SMS logs...");
        const appRes = await pool.query('SELECT * FROM appointments ORDER BY id DESC LIMIT 5');
        console.log("Recent appointments:");
        for (let row of appRes.rows) {
            console.log(`- ID: ${row.id}, Status: ${row.status}, Phone: ${row.customer_phone}, Company_ID: ${row.company_id}`);
        }

        console.log("\nChecking SMS logs...");
        const logRes = await pool.query('SELECT * FROM sms_logs ORDER BY id DESC LIMIT 5');
        if (logRes.rows.length === 0) {
            console.log("No SMS logs found.");
        } else {
            console.table(logRes.rows);
        }

        console.log("\nChecking SMS settings...");
        const settingsRes = await pool.query('SELECT * FROM sms_settings');
        console.table(settingsRes.rows);

    } catch (e) {
        console.error("DB Error:", e);
    }
    process.exit(0);
}

run();
