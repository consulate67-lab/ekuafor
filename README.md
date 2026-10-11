# Saloon — Randevu Sistemi

Randevuyla çalışan her işletme için randevu ve yönetim sistemi: kuaför, berber, güzellik salonu, masaj, pilates, havuz, halı saha, ayak sağlığı, klinikler.

Yol haritası ve kararlar: [`docs/PLAN-YENIDEN-YAPILANDIRMA.md`](docs/PLAN-YENIDEN-YAPILANDIRMA.md)

## Ekranlar

| Ekran | Kim kullanır | Rota |
|---|---|---|
| Müşteri (telefon) | Randevu alan kişi | `/`, `/book/:id`, `/my-appointments` |
| Firma kullanıcısı (telefon) | Firma sahibi / çalışan | `/dashboard`, `/appointments`, `/company-panel` |
| Firma dashboard (tablet / TV) | Firma | `/board` |
| Admin | Süper admin | `/companies`, `/main-management` |

## Yapı

```
client/   React 18 + Vite + Tailwind + Capacitor (Android/iOS)
server/   Express + TypeScript + PostgreSQL (Drizzle + ham SQL)
docs/     Planlar
```

## Yerel geliştirme

```bash
npm install                 # kökten, workspaces ile client + server kurulur
cp server/.env.example server/.env   # DATABASE_URL ve JWT_SECRET doldurun
npm run server:dev          # http://localhost:3000
npm run client:dev          # http://localhost:5173
```

Yerel PostgreSQL için `docker-compose up db` kullanılabilir. Sunucu açılışta `server/src/db/migrate.ts` ile şemayı günceller.

Testler:

```bash
npm test --workspace=server
npm test --workspace=client
```

## Deploy (Railway)

- `main` dalına push → Railway repo kökünden derler (`npm run build`), `npm start` ile sunucuyu başlatır. Sunucu istemcinin derlenmiş halini de servis eder.
- Ayarlar: `server/railway.toml`. Sağlık kontrolü: `/api/ping`.
- Gerekli ortam değişkenleri: `DATABASE_URL`, `JWT_SECRET` (en az 32 karakter), `ALLOWED_ORIGINS`.
- Opsiyonel: `REDIS_URL`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `SMTP_*`, `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` (sadece boş kurulumda ilk admini oluşturur).

### Admin şifresi sıfırlama

Web üzerinden şifre sıfırlama yoktur. Railway sunucusu içinde çalıştırın:

```bash
railway ssh --service web -- "cd /app/server && npx tsx scripts/reset-admin-password.ts <email>"
```

## Mobil uygulama (Capacitor)

```bash
npm run mobile:sync --workspace=client        # derle + android/ios'a kopyala
npm run mobile:open:android --workspace=client
```

Uygulama `https://web-production-db847.up.railway.app/api` adresine bağlanır (`client/src/lib/api.ts`, `VITE_API_URL` ile değiştirilebilir). APK, GitHub Actions'ta **Build Android APK** iş akışı elle çalıştırılarak da üretilebilir.
