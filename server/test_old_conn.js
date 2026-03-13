const { Pool } = require('pg');

const OLD_DB_URL = 'postgresql://postgres:vujkqIumXHksrFCbwsBvdQNoWPwvylnc@crossover.proxy.rlwy.net:50175/railway';

const pool = new Pool({
  connectionString: OLD_DB_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000
});

async function findOldCompany() {
  try {
    console.log('Attempting to connect to OLD DB...');
    const res = await pool.query("SELECT * FROM companies WHERE name ILIKE '%Nurtepe%'");
    console.log('Results:', res.rows);
    await pool.end();
  } catch (err) {
    console.error('CONNECTION ERROR:', err.message);
    process.exit(1);
  }
}

findOldCompany();
