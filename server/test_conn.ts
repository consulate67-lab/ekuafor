import { Client } from 'pg';

const RAILWAY_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const SUPABASE_CONFIG = {
    host: 'db.xljwypebyqpcmdqtrhwx.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'C97gcEqtkm4IW5o6',
    ssl: { rejectUnauthorized: false }
};

async function test() {
    console.log('Testing Railway connection...');
    const railwayClient = new Client({ connectionString: RAILWAY_URL, ssl: { rejectUnauthorized: false } });
    try {
        await railwayClient.connect();
        console.log('✅ Railway Connected!');
        const res = await railwayClient.query('SELECT current_database(), current_user');
        console.log('Railway Info:', res.rows[0]);
    } catch (err: any) {
        console.error('❌ Railway Connection Failed:', err.message);
    } finally {
        await railwayClient.end();
    }

    console.log('\nTesting Supabase connection...');
    const supabaseClient = new Client(SUPABASE_CONFIG);
    try {
        await supabaseClient.connect();
        console.log('✅ Supabase Connected!');
        const res = await supabaseClient.query('SELECT current_database(), current_user');
        console.log('Supabase Info:', res.rows[0]);
        
        const tablesRes = await supabaseClient.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Supabase Tables:', tablesRes.rows.map(r => r.table_name).join(', '));
    } catch (err: any) {
        console.error('❌ Supabase Connection Failed:', err.message);
    } finally {
        await supabaseClient.end();
    }
}

test();
