const { Pool } = require('pg');

const OLD_DB_URL = 'postgresql://postgres:vujkqIumXHksrFCbwsBvdQNoWPwvylnc@crossover.proxy.rlwy.net:50175/railway';

const pool = new Pool({
  connectionString: OLD_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function findNurtepe() {
  try {
    console.log('Searching for "Nurtepe" in OLD database...');
    const res = await pool.query("SELECT * FROM companies WHERE name ILIKE '%Nurtepe%'");
    console.log('Results:', res.rows);
    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findNurtepe();
