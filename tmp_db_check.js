
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway',
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        console.log('--- DB CHECK ---');
        
        const companiesCount = await pool.query('SELECT COUNT(*) FROM companies');
        console.log(`Total rows in companies: ${companiesCount.rows[0].count}`);
        
        const mainCompaniesCount = await pool.query('SELECT COUNT(*) FROM main_companies');
        console.log(`Total rows in main_companies: ${mainCompaniesCount.rows[0].count}`);
        
        const types = await pool.query('SELECT company_type, COUNT(*) FROM companies GROUP BY company_type');
        console.log('Company types distribution in companies table:');
        console.table(types.rows);
        
        const activeCount = await pool.query('SELECT is_active, COUNT(*) FROM companies GROUP BY is_active');
        console.log('Is Active distribution:');
        console.table(activeCount.rows);

        const citiesCount = await pool.query('SELECT COUNT(*) FROM companies WHERE city IS NOT NULL AND city != \'\'');
        console.log(`Companies with city defined: ${citiesCount.rows[0].count}`);

        const coordsCount = await pool.query('SELECT COUNT(*) FROM companies WHERE latitude IS NOT NULL AND longitude IS NOT NULL');
        console.log(`Companies with coords defined: ${coordsCount.rows[0].count}`);

        await pool.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

check();
