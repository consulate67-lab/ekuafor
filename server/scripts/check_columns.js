const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:RE_YV_RE_YY_87@junction.proxy.rlwy.net:18744/railway'
});

async function checkColumns() {
    try {
        const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      AND column_name = 'photo';
    `);
        console.log('Companies photo column:', res.rows.length > 0 ? 'exists' : 'missing');

        const res2 = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND (column_name = 'photo' OR column_name = 'profile_photo');
    `);
        console.log('Users (Staff) photo column info:', res2.rows.map(r => r.column_name));

        const res3 = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' 
      AND column_name = 'photo';
    `);
        console.log('Services photo column:', res3.rows.length > 0 ? 'exists' : 'missing');

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkColumns();
