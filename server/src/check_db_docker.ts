import { Pool } from 'pg';

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    database: 'saloon_db',
    user: 'saloon_user',
    password: 'saloon_password',
    ssl: false
});

async function check() {
    try {
        console.log('Checking database connection with saloon_user...');
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'companies'
        `);
        const cols = res.rows.map((r: any) => r.column_name);
        console.log('Columns found:', cols.join(', '));
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
}

check();
