const { Pool } = require('pg');
require('dotenv').config();

const config = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    };

const pool = new Pool(config);

async function check() {
    try {
        console.log('Checking database...');
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'companies'");
        console.log('Columns in companies table:');
        console.table(res.rows);

        const res2 = await pool.query("SELECT id, name, genders FROM companies LIMIT 5");
        console.log('Recent companies and their genders:');
        console.table(res2.rows);

        process.exit(0);
    } catch (err) {
        console.error('Error during check:', err);
        process.exit(1);
    }
}

check();
