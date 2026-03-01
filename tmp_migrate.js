
const pool = require('./server/src/config/database').default;

async function migrate() {
    try {
        console.log('Running migrations...');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS sub_merchant_key VARCHAR(255);');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS iyzico_commission_rate DECIMAL(5, 2) DEFAULT 0.00;');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2);');
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS collected_price DECIMAL(10, 2);');
        console.log('Migrations completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
