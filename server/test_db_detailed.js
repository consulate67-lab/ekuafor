const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'saloon_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password_here',
});

async function test() {
    try {
        console.log('Testing connection to:', process.env.DB_HOST);
        const res = await pool.query('SELECT 1 as result');
        console.log('SUCCESS:', res.rows[0].result);
    } catch (err) {
        console.log('FAILED!');
        console.log('Name:', err.name);
        console.log('Message:', err.message);
        console.log('Code:', err.code);
        console.log('Detail:', err.detail);
        console.log(err);
    } finally {
        await pool.end();
    }
}

test();
