const { Client } = require('pg');

async function scan() {
    const ports = [5432, 5433, 5434, 5435];
    for (const port of ports) {
        const client = new Client({
            host: 'localhost',
            port: port,
            user: 'postgres',
            password: 'your_password_here', // We don't know the real one, but ECONNREFUSED happens regardless of password
        });
        try {
            console.log(`Port ${port}: Trying...`);
            await client.connect();
            console.log(`Port ${port}: SUCCESS (Connected)`);
            await client.end();
            return;
        } catch (err) {
            if (err.message.includes('ECONNREFUSED')) {
                console.log(`Port ${port}: Refused`);
            } else {
                console.log(`Port ${port}: Other error - ${err.message}`);
            }
        }
    }
}

scan();
