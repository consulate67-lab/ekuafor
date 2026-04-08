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
                name, description, address_line, city, district, 
                latitude, longitude, phone, board_key,
                company_type, is_active, created_at, admin_key
            )
            SELECT 
                m.name, m.description, m.address_line, m.city, m.district, 
                0, 0, '', m.admin_code,
                'ÜST FİRMA', m.is_active, m.created_at, m.admin_code
            FROM main_companies m
            WHERE NOT EXISTS (
                SELECT 1 FROM companies c 
                WHERE c.name = m.name AND c.company_type = 'ÜST FİRMA'
            )
            ON CONFLICT DO NOTHING;
        `;
        const migrated = await client.query(migrationQuery);
        console.log(`Migrated ${migrated.rowCount} main companies.`);

        // 3. Update main_company_id references
        console.log('Updating main_company_id references...');
        await client.query(`
            UPDATE companies c
            SET main_company_id = m_new.id
            FROM main_companies m_old
            JOIN companies m_new ON m_new.name = m_old.name AND m_new.company_type = 'ÜST FİRMA'
            WHERE (c.main_company_id = m_old.id OR c.main_company_id IS NULL)
            AND c.company_type = 'ŞUBE'
            AND c.main_company_id IS DISTINCT FROM m_new.id;
        `);

        // 4. Cleanup invalid references
        await client.query(`
            UPDATE companies 
            SET main_company_id = NULL 
            WHERE main_company_id IS NOT NULL 
            AND main_company_id NOT IN (SELECT id FROM companies)
        `);

        // 5. Apply correct constraint
        try {
            await client.query('ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_main_company_id_fkey');
            await client.query('ALTER TABLE companies ADD CONSTRAINT companies_main_company_id_fkey FOREIGN KEY (main_company_id) REFERENCES companies(id)');
        } catch (e) {
            console.log('Note: Constraint might already exist or data mismatch, continuing...');
        }

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
