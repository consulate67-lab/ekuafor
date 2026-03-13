const { Pool } = require('pg');
const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

async function findNurtepeSms() {
  try {
    const res = await pool.query("SELECT message FROM sms_logs WHERE message ILIKE '%Nurtepe%'");
    res.rows.forEach(r => console.log(r.message));
    await pool.end();
  } catch (err) {
    console.error(err.message);
  }
}
findNurtepeSms();
