import pool from './src/config/database';

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Customers Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id),
                phone VARCHAR(20) NOT NULL,
                name VARCHAR(255),
                email VARCHAR(255),
                is_iys_approved BOOLEAN DEFAULT FALSE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id, phone)
            )
        `);

        // 2. Automation Rules Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS automation_rules (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id),
                name VARCHAR(255) NOT NULL,
                schedule_type VARCHAR(50) DEFAULT 'daily', -- daily, weekly, custom_cron
                schedule_days INTEGER[], -- Array of day numbers (0-6)
                sql_script TEXT NOT NULL,
                action_type VARCHAR(50) NOT NULL, -- sms, push, email
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Initial sync: Populate customers from appointments
        await client.query(`
            INSERT INTO customers (company_id, phone, name)
            SELECT DISTINCT ON (company_id, customer_phone) company_id, customer_phone, customer_name
            FROM appointments
            WHERE customer_phone IS NOT NULL AND customer_phone != ''
            ON CONFLICT (company_id, phone) DO NOTHING
        `);

        await client.query('COMMIT');
        console.log('Migration successful: customers and automation_rules tables created.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
