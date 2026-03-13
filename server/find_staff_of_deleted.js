const { Pool } = require('pg');

const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';

const pool = new Pool({
  connectionString: NEW_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function findOrphanUsers() {
  try {
    console.log('Searching for orphaned users in the NEW database...');
    const res = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.company_id, u.role
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.company_id IS NOT NULL AND c.id IS NULL
    `);
    
    console.log('Orphaned Users found totals:', res.rows.length);
    console.log('Users:', res.rows);
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

findOrphanUsers();
