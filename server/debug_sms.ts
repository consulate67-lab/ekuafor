
import pool from './src/config/database';

async function debugSmsIssue() {
    try {
        console.log('--- SMS Debug Report ---');
        
        // 1. Check Hasan Kuaför's settings
        const companyRes = await pool.query("SELECT id, name, sms_enabled, phone FROM companies WHERE name ILIKE '%Hasan%' LIMIT 1");
        const hasan = companyRes.rows[0];
        
        if (!hasan) {
            console.log('Company "Hasan Kuaför" not found.');
        } else {
            console.log(`Company Found: ${hasan.name} (ID: ${hasan.id}), sms_enabled: ${hasan.sms_enabled}, phone: ${hasan.phone}`);
            
            // 2. Check SMS Settings for this company
            const settingsRes = await pool.query("SELECT * FROM sms_settings WHERE company_id = $1 OR company_id IS NULL ORDER BY company_id DESC", [hasan.id]);
            console.log('\nSMS Settings found:', settingsRes.rows.length);
            settingsRes.rows.forEach(s => {
               console.log(`- Provider: ${s.provider}, Active: ${s.is_active}, CompanyID: ${s.company_id}, SenderID: ${s.sender_id}`);
            });
        }

        // 3. Check latest 5 SMS logs
        const logsRes = await pool.query('SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 5');
        console.log('\nLatest 5 SMS Logs:');
        logsRes.rows.forEach(log => {
            console.log(`[${log.created_at}] To: ${log.phone_number}, Status: ${log.status}, Message: ${log.message.substring(0, 30)}..., Error: ${log.error_message || 'None'}`);
        });

        // 4. Check latest appointment for Hasan Kuaför
        if (hasan) {
            const appRes = await pool.query('SELECT id, status, customer_phone, customer_id, customer_name FROM appointments WHERE company_id = $1 ORDER BY updated_at DESC LIMIT 1', [hasan.id]);
            const app = appRes.rows[0];
            if (app) {
                console.log(`\nLatest Appointment for Hasan: ID: ${app.id}, Status: ${app.status}, Phone: ${app.customer_phone}, CustID: ${app.customer_id}, Name: ${app.customer_name}`);
                
                if (app.customer_id) {
                    const custRes = await pool.query('SELECT phone FROM users WHERE id = $1', [app.customer_id]);
                    console.log(`- Registered Customer Phone in Users table: ${custRes.rows[0]?.phone}`);
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugSmsIssue();
