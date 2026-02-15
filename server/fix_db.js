const { Client } = require('pg');
require('dotenv').config();

async function fix() {
    const client = new Client({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'saloon_db',
        password: process.env.DB_PASSWORD || 'your_password_here',
        port: process.env.DB_PORT || 5432,
    });

    try {
        await client.connect();
        console.log('Connected.');

        await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('Services table checked/created.');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

fix();
