const { Pool } = require('pg');
const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

async function check() {
    try {
        const res = await pool.query(`
            SELECT 
                column_name, 
                is_nullable, 
                data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sms_settings'
        `);
        console.log('Columns:', res.rows);

        const fk = await pool.query(`
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='sms_settings';
        `);
        console.log('FKs:', fk.rows);

        const companies = await pool.query('SELECT id FROM companies LIMIT 10');
        console.log('Company IDs:', companies.rows.map(r => r.id));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
