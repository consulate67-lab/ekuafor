/**
 * Client dist/ klasörünü server/public/'e kopyalar (Railway Nixpacks build sırasında).
 *
 * Cross-platform (Windows + Linux). fs.cpSync Node 16.7+ ile recursive copy destekler.
 *
 * Kaynak:  ../client/dist/ (Vite build çıktısı)
 * Hedef: ./public/ (Express static middleware serve eder)
 *
 * Kullanım:
 *   node scripts/copy-client-dist.js
 */
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', '..', 'client', 'dist');
const dst = path.resolve(__dirname, '..', 'public');

console.log(`[copy-client] START: src=${src}, dst=${dst}`);
console.log(`[copy-client] timestamp: ${new Date().toISOString()}`);

if (!fs.existsSync(src)) {
    console.error(`[copy-client] HATA: Kaynak klasör bulunamadı: ${src}`);
    console.error('[copy-client] Önce client build çalıştırın: cd ../client && npm run build');
    process.exit(1);
}

// Hedef klasörü temizle (eski hash'li asset'ler kalmasın)
fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(dst, { recursive: true });

// Recursive copy
fs.cpSync(src, dst, { recursive: true });

const fileCount = fs.readdirSync(dst, { recursive: true }).length;
console.log(`[copy-client] OK: ${fileCount} dosya kopyalandı → ${dst}`);
