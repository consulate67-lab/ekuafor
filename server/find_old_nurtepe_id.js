const { Pool } = require('pg');

const OLD_DB_URL = 'postgresql://postgres:vujkqIumXHksrFCbwsBvdQNoWPwvylnc@crossover.proxy.rlwy.net:50175/railway';

const pool = new Pool({
  connectionString: OLD_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function findOldCompany() {
  try {
    console.log('Searching for Company ID: 5193 in OLD database...');
    const res = await pool.query("SELECT * FROM companies WHERE id = 5193 OR name ILIKE '%Nurtepe%'");
    console.log('Results:', res.rows);
    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findOldCompany();
