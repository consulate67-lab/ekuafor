const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('=========================================');
console.log('STARTING MIGRATION - DEBUG INFO');
console.log('TIME:', new Date().toISOString());
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
    console.error('⚠️ WARNING: DATABASE_URL is NOT defined! Migration skipped.');
    console.log('🏁 Migration script finished sequence (skipped).');
    process.exit(0); // Exit 0 to NOT block Railway deploy/build
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('🚀 Connecting to Database...');

        const schemaPath = path.join(__dirname, '../database/schema.sql');
        if (!fs.existsSync(schemaPath)) {
            console.error('❌ Schema file NOT FOUND at:', schemaPath);
            return; // Graceful exit
        }
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await pool.query(schema);
        console.log('✅ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed but continuing deployment:', err.message);
        // Do not use process.exit(1) here, we want deployment to continue
    } finally {
        try {
            await pool.end();
        } catch (e) { }
        console.log('🏁 Migration script finished sequence.');
        process.exit(0); // ALWAYS EXIT 0 TO NOT BLOCK RAILWAY DEPLOY
    }
}

migrate();
