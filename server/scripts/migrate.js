const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('=========================================');
console.log('STARTING MIGRATION - DEBUG INFO');
console.log('TIME:', new Date().toISOString());
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
    console.error('❌ CRITICAL ERROR: DATABASE_URL is NOT defined in environment variables!');
    console.error('Dumping all keys for debug:', Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('PASSWORD')));
    process.exit(1);
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
            process.exit(1);
        }
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await pool.query(schema);
        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
