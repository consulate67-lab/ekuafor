const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function addColumns() {
    try {
        await client.connect();

        await client.query(`
            ALTER TABLE companies 
            ADD COLUMN IF NOT EXISTS work_start_time VARCHAR(10) DEFAULT '09:00',
            ADD COLUMN IF NOT EXISTS work_end_time VARCHAR(10) DEFAULT '20:00';
        `);

        console.log('Columns added successfully');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

addColumns();
