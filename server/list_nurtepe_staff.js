const { Pool } = require('pg');

const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';

const pool = new Pool({
  connectionString: NEW_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function findOrphanUsers() {
  try {
    const res = await pool.query(`
      SELECT * FROM users WHERE company_id = 5193
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

findOrphanUsers();
