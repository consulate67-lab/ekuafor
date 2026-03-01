import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    host: '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'saloon_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function migrate() {
    try {
        console.log('--- Checking Columns in companies table ---');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'companies'
        `);
        const cols = res.rows.map((r: any) => r.column_name);
        console.log('Existing columns:', cols);

        // Migrate data if needed
        // city = province_name
        // district = district_name
        // neighborhood = neighborhood_name

        if (cols.includes('province_name') && cols.includes('city')) {
            console.log('Migrating province_name to city...');
            await pool.query('UPDATE companies SET city = province_name WHERE city IS NULL AND province_name IS NOT NULL');
        }

        if (cols.includes('district_name') && cols.includes('district')) {
            console.log('Migrating district_name to district...');
            await pool.query('UPDATE companies SET district = district_name WHERE district IS NULL AND district_name IS NOT NULL');
        }

        if (cols.includes('neighborhood_name') && cols.includes('neighborhood')) {
            console.log('Migrating neighborhood_name to neighborhood...');
            await pool.query('UPDATE companies SET neighborhood = neighborhood_name WHERE neighborhood IS NULL AND neighborhood_name IS NOT NULL');
        }

        // Drop redundant columns
        const toDrop = [
            'province_id', 'province_name',
            'district_id', 'district_name',
            'neighborhood_id', 'neighborhood_name'
        ];

        for (const col of toDrop) {
            if (cols.includes(col)) {
                console.log(`Dropping column: ${col}...`);
                await pool.query(`ALTER TABLE companies DROP COLUMN IF EXISTS ${col}`);
            }
        }

        console.log('--- Migration Finished ---');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
