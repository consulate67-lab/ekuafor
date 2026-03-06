const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Saloon/server/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function checkSchema() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'companies'");
        console.log(JSON.stringify(res.rows, null, 2));

        const settingsRes = await pool.query("SELECT * FROM sms_settings");
        console.log('Sms Settings:', JSON.stringify(settingsRes.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
