
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgres://u2r8p0f5f7f8at:p65b822184e8579ad1b55979bb88294bd8a61e06c747189f7831f13b65287514a@ccgh0stf94i61g.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dajks6scj1q6d1",
    ssl: { rejectUnauthorized: false }
});

async function sync() {
    try {
        console.log('Syncing company_users from users table...');
        const sql = `
            INSERT INTO company_users (company_id, user_id, role)
            SELECT u.company_id, u.id, 
                CASE 
                    WHEN u.role = 'company_admin' THEN 'owner'
                    ELSE 'staff'
                END
            FROM users u
            WHERE u.company_id IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM company_users cu WHERE cu.user_id = u.id AND cu.company_id = u.company_id
            );
        `;
        const result = await pool.query(sql);
        console.log(`Sync complete. Added ${result.rowCount} missing relations.`);
        process.exit(0);
    } catch (err) {
        console.error('Error during sync:', err);
        process.exit(1);
    }
}

sync();
