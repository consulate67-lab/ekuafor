const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'saloon_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password_here',
});

client.connect()
    .then(() => {
        console.log('SUCCESS: Connected to database');
        return client.query('SELECT version()');
    })
    .then(res => {
        console.log('Version:', res.rows[0].version);
        process.exit(0);
    })
    .catch(err => {
        console.error('ERROR:', err.message);
        if (err.code) console.error('Code:', err.code);
        process.exit(1);
    });
