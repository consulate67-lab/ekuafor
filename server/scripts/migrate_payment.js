const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'saloon_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function migrate() {
    console.log('--- Payment & Guest Migration ---');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Adding payment columns to appointments...');
        await client.query(`
            ALTER TABLE appointments 
            ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid',
            ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),
            ADD COLUMN IF NOT EXISTS iyzico_token VARCHAR(255),
            ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);
        `);

        console.log('Adding verified_phone column to users (if not exists)...');
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT false;
        `);

        await client.query('COMMIT');
        console.log('✅ Migration successful');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
