const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });
const pool = require('./server/dist/config/database').default;

async function check() {
    try {
        const res = await pool.query(`
            SELECT a.id, a.status, a.price, a.collected_price, a.staff_id, a.appointment_date, a.start_time,
                   (SELECT COUNT(*) FROM appointment_services WHERE appointment_id = a.id) as service_count,
                   (SELECT SUM(price) FROM appointment_services WHERE appointment_id = a.id) as service_price_sum
            FROM appointments a
            WHERE a.status = 'completed'
            ORDER BY a.updated_at DESC
            LIMIT 5
        `);
        console.log('Recent Completed Appointments:', JSON.stringify(res.rows, null, 2));
        
        const stats = await pool.query(`
            SELECT 
                a.status,
                COUNT(*) as count,
                SUM(price) as total_price,
                SUM(collected_price) as total_collected
            FROM appointments a
            WHERE a.appointment_date = CURRENT_DATE
            GROUP BY a.status
        `);
        console.log('Today Stats by Status:', JSON.stringify(stats.rows, null, 2));

        const serverTime = await pool.query('SELECT NOW(), CURRENT_DATE');
        console.log('Server Time Info:', JSON.stringify(serverTime.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
