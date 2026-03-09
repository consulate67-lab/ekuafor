
const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'saloon_db',
    user: 'postgres',
    password: 'your_password_here'
});

async function check() {
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log('Checking for date:', today);

        const apps = await pool.query('SELECT id, staff_id, customer_name, appointment_date, status, price, service_id FROM appointments WHERE appointment_date = $1', [today]);
        console.log(`Found ${apps.rows.length} appointments for today.`);
        apps.rows.forEach(a => {
            console.log(`App ID: ${a.id}, Staff: ${a.staff_id}, Customer: ${a.customer_name}, Status: ${a.status}, Price: ${a.price}`);
        });

        const services = await pool.query('SELECT * FROM appointment_services WHERE appointment_id IN (SELECT id FROM appointments WHERE appointment_date = $1)', [today]);
        console.log(`Found ${services.rows.length} records in appointment_services for today.`);
        services.rows.forEach(s => {
            console.log(`  App ID: ${s.appointment_id}, Staff: ${s.staff_id}, Price: ${s.price}`);
        });

        const users = await pool.query('SELECT id, first_name, last_name, role FROM users WHERE role != \'customer\'');
        console.log('Active Staff/Admins:');
        users.rows.forEach(u => {
            console.log(`  ID: ${u.id}, Name: ${u.first_name} ${u.last_name}, Role: ${u.role}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
