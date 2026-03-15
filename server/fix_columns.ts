import pool from './src/config/database';

async function run() {
    try {
        await pool.query('ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS message_template TEXT');
        console.log('✅ Column message_template added to automation_rules');
    } catch (err) {
        console.error('❌ Failed to add column:', err);
    } finally {
        process.exit(0);
    }
}

run();
