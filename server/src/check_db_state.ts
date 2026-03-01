import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    host: '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'saloon_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: false
});

async function check() {
    try {
        console.log('Checking database connection to 127.0.0.1...');
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'companies'
        `);
        const cols = res.rows.map((r: any) => r.column_name);
        console.log('Columns in companies table:', cols.join(', '));

        const addressCols = cols.filter(c => ['city', 'district', 'neighborhood'].includes(c));
        const legacyCols = cols.filter(c => ['province_name', 'district_name', 'neighborhood_name'].includes(c));

        console.log('Standardized address columns found:', addressCols);
        console.log('Legacy address columns still present:', legacyCols);

        const countRes = await pool.query('SELECT COUNT(*) FROM companies');
        console.log('Total companies in database:', countRes.rows[0].count);

        if (addressCols.includes('city')) {
            const migratedRes = await pool.query('SELECT COUNT(*) FROM companies WHERE city IS NOT NULL AND city != \'\'');
            console.log('Companies with city data populated:', migratedRes.rows[0].count);
        }

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
}

check();
