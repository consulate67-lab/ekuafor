
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '5432',
    database: process.env.DB_NAME || 'saloon_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password_here',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function migrate() {
    try {
        console.log('Starting migration for rating columns...');

        // 1. Add genders to companies
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS genders TEXT[] DEFAULT \'{}\'');
        console.log('Checked genders column in companies.');

        // 2. Add rating to appointments
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating BETWEEN 1 AND 5)');
        console.log('Checked rating column in appointments.');

        // 3. Add comment to appointments
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS comment TEXT');
        console.log('Checked comment column in appointments.');

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration Error:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
