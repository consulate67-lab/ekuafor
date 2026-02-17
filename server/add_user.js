const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '5432',
    database: process.env.DB_NAME || 'saloon_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addUser() {
    try {
        const email = 'selim@saloon.com';
        const password = 'Continue677';
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO users (email, password, role, first_name, last_name, is_active)
            VALUES ($1, $2, 'super_admin', 'Selim', 'Öz', true)
            ON CONFLICT (email) DO UPDATE 
            SET password = $2, role = 'super_admin'
            RETURNING id;
        `;

        const res = await pool.query(query, [email, hashedPassword]);
        console.log('✅ Kullanıcı başarıyla eklendi/güncellendi. ID:', res.rows[0].id);

        // Şirket ataması gerekebilir mi? Super admin için zorunlu değil ama 1 nolu şirkete bağlayalım demo için
        await pool.query('UPDATE users SET company_id = 1 WHERE email = $1', [email]);

        process.exit(0);
    } catch (err) {
        console.error('❌ Hata:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

addUser();
