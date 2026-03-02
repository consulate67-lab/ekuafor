import pool from './src/config/database';

async function setup() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                amount DECIMAL(10,2) NOT NULL,
                description TEXT NOT NULL,
                expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
            );
        `);
        console.log('Expenses table created or already exists.');
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}
setup();
