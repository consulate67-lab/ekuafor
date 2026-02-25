const { Pool } = require('pg');
require('dotenv').config();

const config = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'saloon_db',
        port: process.env.DB_PORT || 5432
    };

const pool = new Pool(config);

async function forceFix() {
    let client;
    try {
        client = await pool.connect();
        console.log('🚀 DB Fixer started...');

        // 1. Drop existing problematic constraints
        console.log('Dropping existing constraints...');
        await client.query('ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_main_company_id_fkey');

        // Find any other FKs on this column
        const otherFks = await client.query(`
            SELECT constraint_name 
            FROM information_schema.key_column_usage 
            WHERE table_name = 'companies' AND column_name = 'main_company_id'
        `);
        for (const row of otherFks.rows) {
            console.log(`Dropping constraint: ${row.constraint_name}`);
            await client.query(`ALTER TABLE companies DROP CONSTRAINT IF EXISTS "${row.constraint_name}" CASCADE`);
        }

        // 2. Clean up invalid data that wouldn't satisfy the new self-reference
        console.log('Cleaning up invalid main_company_id data...');
        const cleanup = await client.query(`
            UPDATE companies 
            SET main_company_id = NULL 
            WHERE main_company_id IS NOT NULL 
            AND main_company_id NOT IN (SELECT id FROM companies)
        `);
        console.log(`✅ Cleaned up ${cleanup.rowCount} invalid references.`);

        // 3. Apply the correct self-referencing constraint
        console.log('Applying correct self-referencing constraint...');
        await client.query(`
            ALTER TABLE companies 
            ADD CONSTRAINT companies_main_company_id_fkey 
            FOREIGN KEY (main_company_id) 
            REFERENCES companies(id)
        `);

        console.log('✅ SUCCESS: main_company_id now correctly references companies(id).');
        process.exit(0);
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        process.exit(1);
    } finally {
        if (client) client.release();
    }
}

forceFix();
