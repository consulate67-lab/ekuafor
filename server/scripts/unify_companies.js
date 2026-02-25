const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function unify() {
    let client;
    try {
        client = await pool.connect();
        console.log('🚀 Starting Unification Migration...');

        // 1. Temporary column to map old main_companies IDs
        await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS legacy_main_id INTEGER');

        // 2. Insert main_companies into companies
        console.log('Migrating main_companies to companies table...');
        const migrationQuery = `
            INSERT INTO companies (
                name, description, address_line, province_id, province_name, 
                company_type, is_active, created_at, admin_key
            )
            SELECT 
                name, description, address_line, province_id, province_name, 
                'ÜST FİRMA', is_active, created_at, admin_code
            FROM main_companies m
            WHERE NOT EXISTS (
                SELECT 1 FROM companies c WHERE c.name = m.name AND c.company_type = 'ÜST FİRMA'
            )
            RETURNING id, name;
        `;
        const migrated = await client.query(migrationQuery);
        console.log(`Migrated ${migrated.rowCount} main companies.`);

        // 3. Update main_company_id references
        // This is tricky. We need to know which main_company_id pointed to which main_companies entry.
        // Assuming the current main_company_id values IN THE TABLE refer to main_companies(id).
        console.log('Updating main_company_id references...');

        // We'll use a temporary mapping table or just join
        await client.query(`
            UPDATE companies c
            SET main_company_id = m_new.id
            FROM main_companies m_old
            JOIN companies m_new ON m_new.name = m_old.name AND m_new.company_type = 'ÜST FİRMA'
            WHERE c.main_company_id = m_old.id
            AND c.company_type = 'ŞUBE'
        `);

        // 4. Drop the old incorrect constraint if it somehow still exists
        await client.query('ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_main_company_id_fkey');

        // 5. Cleanup invalid references again to be sure
        await client.query(`
            UPDATE companies 
            SET main_company_id = NULL 
            WHERE main_company_id IS NOT NULL 
            AND main_company_id NOT IN (SELECT id FROM companies)
        `);

        // 6. Apply correct constraint
        await client.query('ALTER TABLE companies ADD CONSTRAINT companies_main_company_id_fkey FOREIGN KEY (main_company_id) REFERENCES companies(id)');

        console.log('✅ Unification successful!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Error:', err.message);
        process.exit(1);
    } finally {
        if (client) client.release();
    }
}

unify();
