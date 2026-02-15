const { Client } = require('pg');
require('dotenv').config();

async function checkTables() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    try {
        await client.connect();
        console.log('Connected to database:', process.env.DB_NAME);

        // Check if services table exists
        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tables in database:', res.rows.map(r => r.table_name).join(', '));

        if (res.rows.some(r => r.table_name === 'services')) {
            const colRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'services'
      `);
            console.log('Columns in services table:');
            console.table(colRes.rows);
        } else {
            console.log('SERVICES TABLE NOT FOUND!');
        }

    } catch (err) {
        console.error('Connection Error:', err.message);
    } finally {
        await client.end();
    }
}

checkTables();
