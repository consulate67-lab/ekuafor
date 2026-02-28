import pool from './src/config/database';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        const res = await pool.query(`
      SELECT count(*) 
      FROM companies 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL 
      AND (
          city IS NULL OR city = '' OR 
          district IS NULL OR district = '' OR 
          province_name IS NULL OR province_name = '' OR
          district_name IS NULL OR district_name = '' OR
          neighborhood_name IS NULL OR neighborhood_name = ''
      )
    `);
        console.log('To update:', res.rows[0].count);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
