/**
 * Tablet dist/ → server/public/tablet/
 * Client kopyasından SONRA çalıştırın (copy-client public/'i temizler).
 */
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', '..', 'tablet', 'dist');
const dst = path.resolve(__dirname, '..', 'public', 'tablet');

console.log(`[copy-tablet] START: src=${src}, dst=${dst}`);

if (!fs.existsSync(src)) {
    console.error(`[copy-tablet] HATA: Kaynak yok: ${src}`);
    console.error('[copy-tablet] Önce: cd ../tablet && npm run build');
    process.exit(1);
}

fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(dst, { recursive: true });
fs.cpSync(src, dst, { recursive: true });

const fileCount = fs.readdirSync(dst, { recursive: true }).length;
console.log(`[copy-tablet] OK: ${fileCount} dosya → ${dst}`);
