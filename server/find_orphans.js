const { Pool } = require('pg');
const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

async function findOrphans() {
    try {
        console.log('Searching for users related to deleted companies...');
        const orphaned = await pool.query(`
            SELECT u.* 
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.company_id IS NOT NULL AND c.id IS NULL
        `);

        console.log('Orphaned Users:', orphaned.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
findOrphans();
