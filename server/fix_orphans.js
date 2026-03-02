const { Pool } = require('pg');
const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

async function fix() {
    try {
        console.log('--- CLEANING UP ORPHANED COMPANY IDs ---');

        // Find users with company_id that doesn't exist in companies table
        const orphaned = await pool.query(`
            SELECT u.id, u.email, u.company_id 
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.company_id IS NOT NULL AND c.id IS NULL
        `);

        console.log('Found orphaned IDs:', orphaned.rows);

        if (orphaned.rows.length > 0) {
            const idsToFix = orphaned.rows.map(r => r.id);
            await pool.query('UPDATE users SET company_id = NULL WHERE id = ANY($1)', [idsToFix]);
            console.log(`✅ Updated ${orphaned.rows.length} users to have company_id = NULL`);
        } else {
            console.log('No orphaned company_ids found.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
fix();
