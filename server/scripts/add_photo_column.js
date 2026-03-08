const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:RE_YV_RE_YY_87@junction.proxy.rlwy.net:18744/railway'
});

async function migrate() {
    try {
        console.log('Running migration...');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS photo TEXT;');
        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
