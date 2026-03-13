const { Pool } = require('pg');
const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

async function findNurtepeSms() {
  try {
    const res = await pool.query("SELECT * FROM sms_logs WHERE message ILIKE '%Nurtepe%' ORDER BY created_at DESC");
    console.log(JSON.stringify(res.rows, null, 2));
    await pool.end();
  } catch (err) {
    console.error(err.message);
  }
}
findNurtepeSms();
