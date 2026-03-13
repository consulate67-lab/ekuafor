const { Pool } = require('pg');
const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

async function findApprovedSms() {
  try {
    const res = await pool.query("SELECT * FROM sms_logs WHERE message ILIKE '%onaylanmıştır%' ORDER BY created_at DESC LIMIT 20");
    res.rows.forEach(r => {
      console.log('--- APPROVED SMS ---');
      console.log('To:', r.phone_number);
      console.log('Msg:', r.message);
    });
    await pool.end();
  } catch (err) {
    console.error(err.message);
  }
}
findApprovedSms();
