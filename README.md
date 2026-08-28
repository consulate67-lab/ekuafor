# 💇‍♂️ Saloon (E-Kuaför) Randevu Sistemi

Saloon, güzellik merkezleri ve kuaförler için geliştirilmiş, kapsamlı bir randevu ve yönetim sistemidir.

[![Status](https://img.shields.io/badge/Status-Phase_2_Complete-blue.svg)](https://github.com/consulate67-lab/ekuafor)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.1.0-green.svg)](https://github.com/consulate67-lab/ekuafor)

## 🌟 Proje Özeti (Faz 2 Geişletildi!)

Bu aşamada projenin mobil dönüşümü (Capacitor), personel profil fotoğrafları, kamera entegrasyonu, **Paket Özelleştirme** ve Salon Paneli (Board) geliştirmeleri tamamlanmıştır.

### 🚩 Tamamlanan Özellikler

#### 🏢 Firma Yönetimi
- ✅ Firma kaydı oluşturma, düzenleme ve silme
- ✅ Firma doğrulama (verification) sistemi
- ✅ Detaylı firma profili (Telefon, E-posta, Website)
- ✅ **Banka Bilgileri**: IBAN ve hesap sahibi yönetimi
- ✅ **Finansman**: Komisyon oranı belirleme ve ödeme durumu

#### 📍 Adres ve Konum Sistemi
- ✅ **Türkiye API Entegrasyonu**: 81 il, tüm ilçe ve mahallelerin dinamik seçimi
- ✅ **Harita Entegrasyonu**: Leaflet ile harita üzerinden konum seçme (Latitude/Longitude)
- ✅ Marker ile konum gösterimi

#### 👥 Kullanıcı ve Rol Yönetimi
- ✅ **Authentication**: JWT tabanlı güvenli giriş sistemi
- ✅ **Roller**: Super Admin, Firma Sahibi (Company Admin), Müşteri
- ✅ **Çalışan Yönetimi**: Personel ekleme, departman yönetimi ve profil fotoğrafları.

#### 📱 Mobil ve Kamera Entegrasyonu
- ✅ **Capacitor**: Proje Android ve iOS uyumlu hale getirildi.
- ✅ **Native Camera**: Mobil araçlarda doğrudan kamera veya galeriden fotoğraf seçimi.
- ✅ **Görsel Optimizasyon**: Yüklenen görseller otomatik olarak 400x400 JPEG formatında küçültülür.

#### 📟 Salon Paneli (Board)
- ✅ **Gelişmiş Görsel Deneyim**: Personel fotoğrafları ve büyük kart yapısı.
- ✅ **Real-time Takip**: Randevuların canlı senkronizasyonu.
- ✅ **Paket Özelleştirme**: Randevu anında pakete dahil hizmetlerin fiyat ve sürelerini manuel olarak değiştirme.
- ✅ **Bekleyen Talepler**: Onay bekleyen randevuları liste halinde görme ve tek tıkla onaylama/düzenleme.

## 🚀 Deployment

### Backend (Render)
- `render.yaml` declarative konfigürasyon
- Otomatik deploy: main branch push (autoDeploy: true)
- Build: `npm install && npm run build` → `server/dist/`
- Start: `npm start` (server background'da `runMigrations()` çağırır, idempotent SQL)
- Health check: `/api/ping` (Render restart loop koruması)
- Region: `oregon` (free plan)

#### Gerekli Environment Variables (Render Dashboard → Environment)
- `DATABASE_URL` — Supabase pooler connection string (sync: false)
- `ALLOWED_ORIGINS` — virgülle ayrılmış: `https://consulate67-lab.github.io,capacitor://localhost,app://.` (sync: false)
- `BASE_URL` — `https://ekuafor-backend.onrender.com` (sync: false, iyzico callback'leri için)
- `JWT_SECRET` — **otomatik** (Render ilk deploy'da 64-char hex üretir)
- Opsiyonel: `SMTP_*`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `OPENAI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `SENTRY_DSN`, `REDIS_URL`

#### Güvenlik (Aşama 3)
- `origin: '*'` CORS kaldırıldı → `ALLOWED_ORIGINS` whitelist
- Rate limit: 200 req / 15 dk global, 10 req / 15 dk auth endpoint'leri
- Pino structured logging (dev: pretty, prod: JSON)
- zod fail-fast env validation (`JWT_SECRET` < 32 char → server başlamaz)

### Frontend (GitHub Pages)
- `.github/workflows/deploy-frontend.yml` → main branch push'ta
- GitHub Actions env: `VITE_API_URL=https://ekuafor-backend.onrender.com/api`
- `VITE_BASE=/ekuafor/` (GitHub Pages alt dizini)
- URL: [https://consulate67-lab.github.io/ekuafor/](https://consulate67-lab.github.io/ekuafor/)
- Bundle: 1.18 MB → 64.78 KB initial (Aşama 1.3 — code split + lazy routes)
- 36 chunk, her sayfa `React.lazy()` ile yüklenir

### Mobile (Capacitor → Android APK)
- `.github/workflows/build-apk.yml` → main branch push'ta + manual trigger
- Capacitor sync → `gradlew assembleDebug`
- Artifacts: `saloon-app-debug` (APK indirilebilir)
- GitHub Release otomatik: tag `latest`
- iOS: skeleton var (`client/ios/`), build yapılandırılmadı

### Database (Supabase PostgreSQL)
- Pooler connection: `postgresql://postgres.[ref]:[password]@aws-[region].pooler.supabase.com:5432/postgres`
- SSL zorunlu (pg driver'da `rejectUnauthorized: false` — pooler için)
- **Schema uygulama** (ilk kurulum veya sıfırdan):
  ```bash
  # Lokal'den
  psql $DATABASE_URL < server/drizzle/0000_init.sql
  # Veya Supabase Dashboard → SQL Editor → aynı SQL'i yapıştır
  ```
- **Migration stratejisi**: Şu an `db/migrate.ts` idempotent SQL ile çalışıyor. Aşama 2.3 sonrası Drizzle migrate (`drizzle/0000_*.sql`) tek kaynak olacak
- Backup: Supabase Dashboard → Database → Backups (Pro plan: daily, Free: manual)

### CI/CD
| Workflow | Tetikleyici | İş |
|----------|-------------|-----|
| `.github/workflows/server-ci.yml` | PR/push main (`server/**`) | Postgres service + Drizzle push + lint + test + build |
| `.github/workflows/deploy-frontend.yml` | push main (`client/**`) | Vite build + GitHub Pages deploy |
| `.github/workflows/build-apk.yml` | push main + manual | Capacitor sync + Android APK + GitHub Release |

## 🚀 Teknoloji Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Password**: bcryptjs
- **HTTP Client**: Axios

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **Styling**: TailwindCSS
- **Maps**: Leaflet + React-Leaflet
- **Forms**: React Hook Form
- **HTTP Client**: Axios

### External APIs
- **Adres Verileri**: [turkiyeapi.dev](https://turkiyeapi.dev) (Ücretsiz)
- **Harita**: OpenStreetMap (Ücretsiz)

## 📦 Kurulum

1. **Repo'yu Klonlayın**
```bash
git clone https://github.com/consulate67-lab/ekuafor.git
cd ekuafor
```

2. **Backend Hazırlığı**
```bash
cd server
npm install
# psql -d saloon_db -f database/schema.sql
npm run dev
```

3. **Frontend Hazırlığı**
```bash
cd client
npm install
npm run dev
```

## 📁 Proje Yapısı

```
d:\Saloon/
├── 📂 server/         # Node.js + Express API
├── 📂 client/         # React + Vite Uygulaması
├── 📄 SETUP.md        # Detaylı Kurulum Kılavuzu
├── 📄 DEVELOPMENT.md  # Teknik Geliştirme Notları
└── 📄 README.md       # Proje Özeti
```

## 🗺️ Yol Haritası (Faz 2)

- [x] Çalışan paneli ve profil yönetimi
- [x] Hizmet (Service) bazlı çalışma saatleri
- [x] Randevu (Appointment) oluşturma ve takvim (Board)
- [ ] Müşteri bildirimleri (E-posta/SMS)
- [ ] Ödeme sistemleri (iyzico Entegrasyonu)

---
**Geliştirici**: Antigravity AI
**Tarih**: Şubat 2026
