const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkUsers() {
  try {
    const res = await pool.query('SELECT role, count(*) FROM users GROUP BY role');
    console.log('User roles count:', res.rows);
    
    const staff = await pool.query('SELECT id, first_name, last_name, company_id, is_active FROM users WHERE role = \'staff\' LIMIT 5');
    console.log('Example staff:', staff.rows);
    
    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
