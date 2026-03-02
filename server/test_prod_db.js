const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testConnection() {
    try {
        console.log('Testing connection to new production database...');
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Success! Connection time:', res.rows[0].now);

        console.log('Checking tables...');
        const tableRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);

        if (tableRes.rows.length === 0) {
            console.log('System Info: Database is clean and ready for auto-migration.');
        } else {
            console.log('Existing tables:', tableRes.rows.map(r => r.table_name).join(', '));
        }

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Connection failed:', err);
        process.exit(1);
    }
}

testConnection();
