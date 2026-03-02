const { Pool } = require('pg');

// ==========================================
// 🚨 LÜTFEN URL BİLGİLERİNİ KONTROL EDİN 🚨
// ==========================================

// 1. ESKİ (GitHub/Consulate67 tarafı) Railway Veritabanı URL'si
const OLD_DB_URL = 'postgresql://postgres:vujkqIumXHksrFCbwsBvdQNoWPwvylnc@crossover.proxy.rlwy.net:50175/railway';

// 2. YENİ (Saloontr.com tarafı) Railway Veritabanı URL'si
const NEW_DB_URL = 'postgresql://postgres:RBgfUPStGBwkrgyohDNXfTjLUYxYDmHH@centerbeam.proxy.rlwy.net:41778/railway';

const oldPool = new Pool({
    connectionString: OLD_DB_URL,
    ssl: { rejectUnauthorized: false }
});

const newPool = new Pool({
    connectionString: NEW_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('--- Veri Taşıma İşlemi Başladı ---');

        // 🎯 YENİ VERİTABANINI TEMİZLE (Sıfırdan kopyalama için)
        console.log('Hedef veritabanı temizleniyor (Sıfırlanıyor)...');
        await newPool.query('TRUNCATE TABLE companies, services, users CASCADE');
        console.log('✅ Hedef veritabanı temizlendi.');

        async function getTableColumns(pool, tableName) {
            const res = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [tableName]);
            return res.rows.map(r => r.column_name);
        }

        async function migrateTable(tableName, conflictClause) {
            console.log(`\n📦 ${tableName} tablosu aktarılıyor...`);

            const sourceCols = await getTableColumns(oldPool, tableName);
            const targetCols = await getTableColumns(newPool, tableName);
            const commonCols = sourceCols.filter(c => targetCols.includes(c));

            if (commonCols.length === 0) {
                console.log(`⚠️ ${tableName} için ortak sütun bulunamadı.`);
                return;
            }

            const sourceRes = await oldPool.query(`SELECT ${commonCols.join(', ')} FROM ${tableName}`);
            console.log(`${sourceRes.rows.length} kayıt bulundu. Toplu aktarım başlıyor...`);

            const BATCH_SIZE = 100;
            for (let i = 0; i < sourceRes.rows.length; i += BATCH_SIZE) {
                const batch = sourceRes.rows.slice(i, i + BATCH_SIZE);
                const cols = commonCols.join(', ');

                let values = [];
                let placeholders = [];
                batch.forEach((row, rowIndex) => {
                    const rowPlaceholders = commonCols.map((_, colIndex) => `$${rowIndex * commonCols.length + colIndex + 1}`).join(', ');
                    placeholders.push(`(${rowPlaceholders})`);
                    values.push(...commonCols.map(c => row[c]));
                });

                const sql = `INSERT INTO ${tableName} (${cols}) VALUES ${placeholders.join(', ')} ${conflictClause}`;
                try {
                    await newPool.query(sql, values);
                    console.log(`| Aktarılan: ${Math.min(i + BATCH_SIZE, sourceRes.rows.length)} / ${sourceRes.rows.length}`);
                } catch (e) {
                    console.error(`❌ Batch failed at row ${i}:`, e.message);
                    // Single row insert attempt for the batch to find the specific error
                    console.log('--- Individual inserts for this batch starting ---');
                    for (const row of batch) {
                        try {
                            const singleCols = Object.keys(row).join(', ');
                            const singlePlaceholders = Object.keys(row).map((_, i) => `$${i + 1}`).join(', ');
                            const singleValues = Object.values(row);
                            await newPool.query(`INSERT INTO ${tableName} (${singleCols}) VALUES (${singlePlaceholders}) ${conflictClause}`, singleValues);
                        } catch (se) {
                            console.error(`  - Row insert failed:`, se.message);
                        }
                    }
                }
            }
            console.log(`✅ ${tableName} işlemi bitti.`);
        }

        // TAŞIMA İŞLEMLERİ
        try {
            await migrateTable('users', 'ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email');
        } catch (e) { console.error('❌ Users aktarımı başarısız:', e.message); }

        try {
            await migrateTable('companies', 'ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name');
        } catch (e) { console.error('❌ Companies aktarımı başarısız:', e.message); }

        try {
            await migrateTable('services', 'ON CONFLICT (id) DO NOTHING');
        } catch (e) { console.error('❌ Services aktarımı başarısız:', e.message); }

        // 4. OTOMATİK ID SAYACINI DÜZELT (Sequence update)
        console.log('\nID sayaçları güncelleniyor...');
        async function updateSeq(tableName, seqName) {
            try {
                const maxRes = await newPool.query(`SELECT MAX(id) as max FROM ${tableName}`);
                const max = maxRes.rows[0].max;
                if (max) {
                    await newPool.query(`SELECT setval('${seqName}', ${max})`);
                    console.log(`✅ ${seqName} güncellendi: ${max}`);
                }
            } catch (e) {
                console.log(`⚠️ ${seqName} güncellenemedi: ${e.message}`);
            }
        }

        await updateSeq('companies', 'companies_id_seq');
        await updateSeq('services', 'services_id_seq');
        await updateSeq('users', 'users_id_seq');

        console.log('\n🌟 İŞLEM TAMAMLANDI! 🌟');

    } catch (err) {
        console.error('❌ KRİTİK HATA OLUŞTU!');
        console.error('Mesaj:', err.message);
    } finally {
        await oldPool.end();
        await newPool.end();
        process.exit();
    }
}

migrate();
