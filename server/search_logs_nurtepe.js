const { Pool } = require('pg');
const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const pool = new Pool({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

async function searchLogs() {
  try {
    console.log('Searching SMS Logs for 5193...');
    const sms = await pool.query("SELECT * FROM sms_logs WHERE company_id = 5193 OR message ILIKE '%Nurtepe%'");
    console.log('SMS Logs:', sms.rows);

    console.log('Searching Callback Logs...');
    const logs = await pool.query("SELECT * FROM callback_logs WHERE all_data ILIKE '%Nurtepe%' OR detected_msg ILIKE '%Nurtepe%'");
    console.log('Callback Logs:', logs.rows);

    await pool.end();
  } catch (err) {
    console.error(err.message);
  }
}
searchLogs();
