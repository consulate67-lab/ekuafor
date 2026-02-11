import pool from '../src/config/database';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
    try {
        const email = 'admin@saloon.com';
        const password = 'admin123';

        // Check if user exists
        const res = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

        if (res.rows.length === 0) {
            console.log('Admin user not found, creating...');
            const hash = await bcrypt.hash(password, 10);
            await pool.query(
                'INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES ($1, $2, $3, $4, $5)',
                [email, hash, 'super_admin', 'Sistem', 'Yöneticisi']
            );
            console.log('✅ Admin user created successfully!');
        } else {
            console.log('Admin user already exists, updating password...');
            const hash = await bcrypt.hash(password, 10);
            await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);
            console.log('✅ Admin password updated to: ' + password);
        }
    } catch (err) {
        console.error('❌ Error seeding admin:', err);
    } finally {
        await pool.end();
    }
}

seedAdmin();
