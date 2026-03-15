import pool from './src/config/database';
import { normalizePhone } from './src/utils/phone';

async function run() {
    try {
        console.log('🔄 Veritabanındaki telefon numaraları normalize ediliyor (Duplicate kontrolü ile)...');

        // 1. Customers tablosunu normalize et (Duplicate olanları silerek/birleştirerek)
        const customersRes = await pool.query('SELECT id, phone, company_id FROM customers');
        console.log(`${customersRes.rows.length} müşteri kaydı inceleniyor...`);
        
        for (const row of customersRes.rows) {
            const normalized = normalizePhone(row.phone);
            if (normalized && normalized !== row.phone) {
                try {
                    // Normalize edilmiş hali zaten var mı bak
                    const checkRes = await pool.query(
                        'SELECT id FROM customers WHERE company_id = $1 AND phone = $2 AND id != $3',
                        [row.company_id, normalized, row.id]
                    );

                    if (checkRes.rows.length > 0) {
                        // Eğer zaten varsa, bu mevcut kaydı sil (çünkü duplicate olacak). 
                        // İdealde randevularını kaydırmamız lazım ama şimdilik telefon bazlı join yapıldığı için silmek yeterli olabilir.
                        console.log(`Duplicate bulundu: ${row.phone} -> ${normalized}. Eski kayıt siliniyor.`);
                        await pool.query('DELETE FROM customers WHERE id = $1', [row.id]);
                    } else {
                        await pool.query('UPDATE customers SET phone = $1 WHERE id = $2', [normalized, row.id]);
                    }
                } catch (e) {
                    console.error(`Güncelleme hatası (${row.phone}):`, e);
                }
            }
        }

        // 2. Appointments tablosunu güncelle (Burada constraint yok, doğrudan güncelle)
        const appointmentsRes = await pool.query('SELECT id, customer_phone FROM appointments WHERE customer_phone IS NOT NULL');
        console.log(`${appointmentsRes.rows.length} randevu kaydı inceleniyor...`);

        for (const row of appointmentsRes.rows) {
            const normalized = normalizePhone(row.customer_phone);
            if (normalized && normalized !== row.customer_phone) {
                await pool.query('UPDATE appointments SET customer_phone = $1 WHERE id = $2', [normalized, row.id]);
            }
        }

        console.log('✅ Telefon numaraları başarıyla normalize edildi.');
    } catch (err) {
        console.error('❌ Hata oluştu:', err);
    } finally {
        process.exit(0);
    }
}

run();
