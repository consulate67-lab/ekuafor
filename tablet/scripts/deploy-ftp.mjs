/**
 * Saloon Tablet APK + indirme sayfasını FTP ile yükler.
 *
 * Kullanım:
 *   set FTP_HOST=...
 *   set FTP_USER=...
 *   set FTP_PASSWORD=...
 *   set FTP_REMOTE_DIR=public_html   (opsiyonel)
 *   node tablet/scripts/deploy-ftp.mjs
 *
 * veya: d:\Saloon\.env.ftp dosyası (FTP_HOST=...)
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const apkSrc = resolve(root, 'tablet/android/app/build/outputs/apk/debug/app-debug.apk');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(resolve(root, '.env.ftp'));
loadEnvFile(resolve(root, '.env.local'));

const host = process.env.FTP_HOST;
const user = process.env.FTP_USER;
const password = process.env.FTP_PASSWORD;
const remoteDir = (process.env.FTP_REMOTE_DIR || 'public_html').replace(/\/$/, '');
const secure = String(process.env.FTP_SECURE || 'false') === 'true';

if (!host || !user || !password) {
  console.error('FTP bilgisi eksik. d:\\Saloon\\.env.ftp içine yazın:');
  console.error('  FTP_HOST=ftp.ornek.com');
  console.error('  FTP_USER=...');
  console.error('  FTP_PASSWORD=...');
  console.error('  FTP_REMOTE_DIR=public_html');
  process.exit(1);
}

if (!existsSync(apkSrc)) {
  console.error('APK yok. Önce: cd tablet && npm run apk:debug');
  process.exit(1);
}

const outDir = resolve(root, 'tablet/dist-download');
mkdirSync(outDir, { recursive: true });
const htmlPath = resolve(outDir, 'tablet.html');
writeFileSync(
  htmlPath,
  `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Saloon Tablet APK</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 3rem auto; padding: 1rem; }
    a.btn { display: block; text-align: center; background: #4f46e5; color: #fff; text-decoration: none;
      font-weight: 800; padding: 1rem 1.25rem; border-radius: 1rem; }
    p { color: #475569; }
  </style>
</head>
<body>
  <h1>Saloon Tablet</h1>
  <p>Offline panel — kurulum, personel, randevu tablette kalır.</p>
  <a class="btn" href="./SaloonTablet.apk" download>APK indir</a>
</body>
</html>
`,
);

const require = createRequire(import.meta.url);
let ftp;
try {
  ftp = require('basic-ftp');
} catch {
  console.error('basic-ftp yok. Kökte: npm install basic-ftp');
  process.exit(1);
}

const client = new ftp.Client(60_000);
client.ftp.verbose = true;

try {
  await client.access({ host, user, password, secure });
  await client.ensureDir(remoteDir);
  await client.uploadFrom(apkSrc, `${remoteDir}/SaloonTablet.apk`);
  await client.uploadFrom(htmlPath, `${remoteDir}/tablet.html`);
  console.log('OK');
  console.log(`APK:  ftp://${host}/${remoteDir}/SaloonTablet.apk`);
  console.log(`Sayfa: https://www.saloncebinde.com/tablet.html (DNS/hosting doğruysa)`);
} finally {
  client.close();
}
