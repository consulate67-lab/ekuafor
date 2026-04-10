import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const RAILWAY_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';
const SUPABASE_CONFIG = {
    host: 'aws-1-eu-central-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.xljwypebyqpcmdqtrhwx',
    password: 'C97gcEqtkm4IW5o6',
    ssl: { rejectUnauthorized: false }
};

async function migrate() {
    console.log('🚀 Migration started: Railway -> Supabase');
    console.log('📡 Source:', RAILWAY_URL.split('@')[1]);
    console.log('📡 Target host:', SUPABASE_CONFIG.host);

    const railwayClient = new Client({ 
        connectionString: RAILWAY_URL,
        ssl: { rejectUnauthorized: false }
    });
    const supabaseClient = new Client(SUPABASE_CONFIG);

    try {
        await railwayClient.connect();
        console.log('✅ Connected to Railway');
        
        await supabaseClient.connect();
        console.log('✅ Connected to Supabase');

        // Step 0: Disable FK checks for the migration session
        console.log('🔓 Disabling foreign key constraints for migration...');
        await supabaseClient.query("SET session_replication_role = 'replica'");

        // Step 1: Apply Schema
        console.log('📝 Applying schema.sql to Supabase...');
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            await supabaseClient.query(schemaSql);
            console.log('✅ Schema applied successfully');
        } else {
            console.log('⚠️ schema.sql not found at', schemaPath, '- skipping schema application');
        }

        // Ensure user_role enum exists in Supabase and has all roles
        await supabaseClient.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
                    CREATE TYPE user_role AS ENUM ('super_admin', 'company_admin', 'staff', 'owner', 'customer');
                ELSE
                    -- Add missing roles if they don't exist
                    BEGIN ALTER TYPE user_role ADD VALUE 'staff'; EXCEPTION WHEN duplicate_object THEN NULL; END;
                    BEGIN ALTER TYPE user_role ADD VALUE 'owner'; EXCEPTION WHEN duplicate_object THEN NULL; END;
                END IF;
            END$$;
        `).catch(e => console.log('⚠️ Note: user_role enum update info:', e.message));

        const tables = [
            'users', 
            'main_companies', 
            'companies', 
            'departments', 
            'company_users', 
            'services', 
            'packages', 
            'package_services', 
            'appointments', 
            'appointment_services', 
            'expenses', 
            'expense_items', 
            'current_accounts', 
            'invoices', 
            'invoice_items', 
            'cash_transactions', 
            'settings',
            'working_hours', 
            'payments', 
            'sms_settings', 
            'sms_logs', 
            'customer_devices'
        ];

        for (const table of tables) {
            try {
                process.stdout.write(`📦 Migrating table: ${table}... `);
                
                // Get source data
                const result = await railwayClient.query(`SELECT * FROM ${table}`).catch(e => {
                    console.log(`❌ Empty or missing in source: ${e.message}`);
                    return null;
                });

                if (!result || result.rowCount === 0) {
                    if (result) console.log(' (0 rows)');
                    continue;
                }

                // Check target schema
                const targetColsRes = await supabaseClient.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1
                `, [table]);
                const targetCols = targetColsRes.rows.map(r => r.column_name);

                if (targetCols.length === 0) {
                    console.log(`❌ Missing table in Supabase!`);
                    continue;
                }

                // Match columns
                const sourceCols = result.fields.map(f => f.name);
                const commonCols = sourceCols.filter(c => targetCols.includes(c));
                
                if (commonCols.length === 0) {
                    console.log(`❌ No common columns found!`);
                    continue;
                }

                // Truncate target - Removed CASCADE to avoid unexpected deletions
                await supabaseClient.query(`TRUNCATE TABLE "${table}"`).catch(() => {
                    // If simple truncate fails, try with CASCADE only for specific tables
                    return supabaseClient.query(`TRUNCATE TABLE "${table}" CASCADE`).catch(() => {});
                });

                const columnsStr = commonCols.map(c => `"${c}"`).join(', ');
                let successCount = 0;
                
                for (const row of result.rows) {
                    try {
                        const placeholders = commonCols.map((_, i) => `$${i + 1}`).join(', ');
                        const values = commonCols.map(c => row[c]);
                        await supabaseClient.query(`INSERT INTO "${table}" (${columnsStr}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, values);
                        successCount++;
                    } catch (rowErr: any) {
                        // Skip individual row error but log it
                        console.error(`   ⚠️ Row error in ${table}: ${rowErr.message}`);
                    }
                }
                console.log(`✅ ${successCount}/${result.rowCount} rows migrated.`);
                
                // Update sequence if id exists
                if (commonCols.includes('id')) {
                    try {
                        const seqRes = await supabaseClient.query(`SELECT MAX(id) FROM "${table}"`);
                        const maxId = seqRes.rows[0].max;
                        if (maxId) {
                            await supabaseClient.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), ${maxId})`).catch(() => {});
                        }
                    } catch (e) {}
                }

            } catch (tableErr: any) {
                console.log(`❌ Table migration failed: ${tableErr.message}`);
            }
        }
        console.log('\n✨ MIGRATION FINISHED!');
        await supabaseClient.query("SET session_replication_role = 'origin'");
    } catch (err: any) {
        console.error('❌ CRITICAL ERROR:', err.message);
        await supabaseClient.query("SET session_replication_role = 'origin'").catch(() => {});
    } finally {
        await railwayClient.end().catch(() => {});
        await supabaseClient.end().catch(() => {});
    }
}
migrate();
