
import pool from './src/config/database';

async function checkSmsLogs() {
    try {
        const result = await pool.query('SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 10');
        console.log('Recent SMS Logs:');
        result.rows.forEach(log => {
            console.log(`[${log.created_at}] To: ${log.phone_number}, Status: ${log.status}, Error: ${log.error_message || 'N/A'}`);
        });
        
        const failedResult = await pool.query('SELECT COUNT(id) FROM sms_logs WHERE status = \'failed\'');
        console.log(`Total Failed SMS: ${failedResult.rows[0].count}`);
        
        const checkApp = await pool.query('SELECT id, customer_phone, customer_id, status FROM appointments ORDER BY created_at DESC LIMIT 5');
        console.log('\nRecent Appointments:');
        checkApp.rows.forEach(app => {
           console.log(`ID: ${app.id}, Phone: ${app.customer_phone}, CustomerId: ${app.customer_id}, Status: ${app.status}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSmsLogs();
