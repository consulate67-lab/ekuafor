const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
    port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'saloon_db'),
    user: process.env.DATABASE_URL ? undefined : (process.env.DB_USER || 'postgres'),
    password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
    ssl: process.env.DATABASE_URL || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting incremental migration...');

        // 1. Add company_type to companies if missing
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='company_type') THEN
                    ALTER TABLE companies ADD COLUMN company_type VARCHAR(20) DEFAULT 'ASIL';
                END IF;
            END $$;
        `);

        // 2. Add main_company_id to companies if missing (+ Fix FK)
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='main_company_id') THEN
                    ALTER TABLE companies ADD COLUMN main_company_id INTEGER;
                END IF;
                -- Ensure we drop the incorrect FK if it exists
                ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_main_company_id_fkey;
                -- Re-add it referencing companies(id) as intended in schema.sql
                ALTER TABLE companies ADD CONSTRAINT companies_main_company_id_fkey FOREIGN KEY (main_company_id) REFERENCES companies(id);
            END $$;
        `);

        // 3. Create main_companies table if missing
        await client.query(`
            CREATE TABLE IF NOT EXISTS main_companies (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                address_line TEXT,
                province_id INTEGER,
                province_name VARCHAR(100),
                admin_code VARCHAR(20) UNIQUE,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Incremental migration completed!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
