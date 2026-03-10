const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('--- DB Config Debug ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL connection string');
} else {
    console.log('DATABASE_URL NOT FOUND, falling back to individual env vars');
    console.log('Host:', process.env.DB_HOST || 'localhost');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('railway.app'))
        ? { rejectUnauthorized: false }
        : false,
});

async function migrate() {
    try {
        console.log('🚀 Starting database migration...');
        const schemaPath = path.join(__dirname, '../database/schema.sql');
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
