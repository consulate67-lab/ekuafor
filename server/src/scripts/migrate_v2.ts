import pool from '../config/database';

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration...');

        // Create main_companies table
        await client.query(`
            CREATE TABLE IF NOT EXISTS main_companies (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                address_line TEXT,
                province_id INTEGER,
                province_name VARCHAR(100),
                admin_code VARCHAR(50) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ table main_companies created or already exists');

        // Update companies table
        await client.query(`
            ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_type VARCHAR(20) DEFAULT 'ASIL'
        `);
        await client.query(`
            ALTER TABLE companies ADD COLUMN IF NOT EXISTS main_company_id INTEGER REFERENCES main_companies(id)
        `);
        console.log('✅ columns added to companies table');

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
