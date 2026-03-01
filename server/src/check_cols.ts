import pool from './config/database';

async function run() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'companies'
        `);
        console.log('COLUMNS:', res.rows.map(r => r.column_name).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
