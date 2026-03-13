const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function findNurtepe() {
  try {
    console.log('Searching for "Nurtepe" in important tables...');

    // 1. Companies (Even if deleted, maybe there's a typo in my understanding of 'delete')
    const companies = await pool.query("SELECT * FROM companies WHERE name ILIKE '%Nurtepe%'");
    console.log('Companies found:', companies.rows);

    // 2. Users (Check if there are users linked to a deleted company or with 'Nurtepe' in first_name/last_name/email)
    const users = await pool.query("SELECT id, first_name, last_name, company_id, email FROM users WHERE first_name ILIKE '%Nurtepe%' OR last_name ILIKE '%Nurtepe%' OR email ILIKE '%Nurtepe%'");
    console.log('Users found:', users.rows);

    // 3. Callback logs (If it was a registration code or similar)
    const logs = await pool.query("SELECT * FROM callback_logs WHERE all_data ILIKE '%Nurtepe%' OR detected_msg ILIKE '%Nurtepe%'");
    console.log('Callback logs found:', logs.rows);

    // 4. Appointments (Maybe there were appointments for this company)
    const apps = await pool.query("SELECT * FROM appointments WHERE customer_name ILIKE '%Nurtepe%' OR notes ILIKE '%Nurtepe%'");
    console.log('Appointments found:', apps.rows);

    // 5. SMS logs
    const sms = await pool.query("SELECT * FROM sms_logs WHERE message ILIKE '%Nurtepe%'");
    console.log('SMS logs found:', sms.rows);

    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findNurtepe();
