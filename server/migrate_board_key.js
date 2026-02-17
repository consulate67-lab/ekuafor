const pool = require('./dist/config/database').default;

async function migrate() {
    try {
        console.log('Migrating database...');
        await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS board_key VARCHAR(100)');
        console.log('Column board_key added successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
