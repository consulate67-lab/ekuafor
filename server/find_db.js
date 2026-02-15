const { Client } = require('pg');

async function check() {
    const configs = [
        { user: 'postgres', host: 'localhost', database: 'saloon_db', password: 'your_password_here', port: 5432 },
        { user: 'postgres', host: '127.0.0.1', database: 'saloon_db', password: 'your_password_here', port: 5432 },
        { user: 'postgres', host: 'localhost', database: 'saloon', password: 'your_password_here', port: 5432 }
    ];

    for (const config of configs) {
        const client = new Client(config);
        try {
            console.log(`Trying ${config.host}:${config.database}...`);
            await client.connect();
            const res = await client.query('SELECT id, name FROM companies ORDER BY id DESC LIMIT 5');
            console.log('FOUND:', JSON.stringify(res.rows, null, 2));
            await client.end();
            return;
        } catch (err) {
            console.log(`Failed: ${err.message}`);
        }
    }
}

check();
