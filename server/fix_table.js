
const { Pool } = require('pg');
const DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function fixTable() {
    try {
        console.log('Adding missing columns to companies table...');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_rules TEXT');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS photo TEXT');
        // Also ensuring bank_iban exists just in case (though previous check said it exists)
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_iban TEXT');

        console.log('Success!');
    } catch (err) {
        console.error('Error fixing table:', err);
    } finally {
        await pool.end();
    }
}

fixTable();
