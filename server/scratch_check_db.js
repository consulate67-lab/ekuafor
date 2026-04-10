const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.xljwypebyqpcmdqtrhwx:C97gcEqtkm4IW5o6@aws-1-eu-central-2.pooler.supabase.com:5432/postgres'
});

async function check() {
    try {
        const companies = await pool.query('SELECT count(*) FROM companies');
        const main = await pool.query('SELECT count(*) FROM main_companies');
        const users = await pool.query('SELECT count(*) FROM users');
        
        console.log('--- DB STATS ---');
        console.log('Companies:', companies.rows[0].count);
        console.log('Main Companies:', main.rows[0].count);
        console.log('Users:', users.rows[0].count);
        
        if (parseInt(companies.rows[0].count) === 0 && parseInt(main.rows[0].count) > 0) {
            console.log('Detected empty companies but data in main_companies. Migration needed!');
        }
        
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

check();
