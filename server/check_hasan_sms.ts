
import pool from './src/config/database';

async function checkCompanySms() {
    try {
        const res = await pool.query("SELECT id, name, sms_enabled, phone FROM companies WHERE name ILIKE '%Hasan%'");
        console.log('Company Info:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkCompanySms();
