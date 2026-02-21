const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
        ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        console.log('Adding customer_phone and customer_name to appointments table...');
        await client.query(`
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
            ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
        `);
        console.log('Columns added successfully.');

    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
