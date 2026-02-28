import pool from './src/config/database';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        const res = await pool.query("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'companies'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
