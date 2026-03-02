const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'saloon_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function runFixes() {
    try {
        console.log('Fixing Enum and Table...');

        // 1. Add 'staff' to user_role
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'staff') THEN
                    ALTER TYPE user_role ADD VALUE 'staff';
                END IF;
            END $$;
        `);
        console.log('Role enum updated.');

        // 2. Add title column to users
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(100) DEFAULT 'Personel';
        `);
        console.log('Title column added.');

        await pool.end();
        console.log('Migration finished successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runFixes();
