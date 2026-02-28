import pool from './src/config/database';
import dotenv from 'dotenv';
dotenv.config();

async function updateGenders() {
    const client = await pool.connect();
    try {
        console.log('--- Firma Cinsiyet Kategorizasyonu Başlatıldı ---');

        // 1. Kadın Kategorisi Güncelleme
        const kadinResult = await client.query(`
            UPDATE companies 
            SET genders = ARRAY['Kadın'] 
            WHERE (genders IS NULL OR array_length(genders, 1) IS NULL)
            AND (
                name ILIKE '%bayan%' OR 
                name ILIKE '%kadın%' OR 
                name ILIKE '%kadin%' OR 
                name ILIKE '%güzellik%' OR
                name ILIKE '%guzellik%'
            )
            RETURNING id, name;
        `);
        console.log(`✅ Kadın olarak işaretlenen firma sayısı: ${kadinResult.rowCount}`);

        // 2. Erkek Kategorisi Güncelleme
        const erkekResult = await client.query(`
            UPDATE companies 
            SET genders = ARRAY['Erkek'] 
            WHERE (genders IS NULL OR array_length(genders, 1) IS NULL)
            AND (
                name ILIKE '%berber%' OR 
                name ILIKE '%erkek%' OR 
                name ILIKE '%traş%' OR
                name ILIKE '%tras%'
            )
            RETURNING id, name;
        `);
        console.log(`✅ Erkek olarak işaretlenen firma sayısı: ${erkekResult.rowCount}`);

        console.log('--- Güncelleme Tamamlandı ---');
    } catch (err) {
        console.error('Hata:', err);
    } finally {
        client.release();
        process.exit();
    }
}

updateGenders();
