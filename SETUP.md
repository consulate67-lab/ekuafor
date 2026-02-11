# Saloon - Kurulum Kılavuzu

## Gereksinimler
- Node.js (v18 veya üzeri)
- PostgreSQL (v14 veya üzeri)
- npm veya yarn

## Kurulum Adımları

### 1. PostgreSQL Veritabanı Kurulumu

PostgreSQL'i yükleyin ve çalıştırın. Ardından yeni bir veritabanı oluşturun:

```sql
CREATE DATABASE saloon_db;
```

### 2. Veritabanı Şemasını Oluşturun

```bash
# PostgreSQL'e bağlanın
psql -U postgres -d saloon_db

# Şema dosyasını çalıştırın
\i server/database/schema.sql
```

**ÖNEMLİ:** Schema.sql dosyasındaki admin kullanıcısının şifresini hash'lemeniz gerekiyor:

```javascript
// Node.js ile şifre hash'leme
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('admin123', 10);
console.log(hash);
```

Bu hash'i schema.sql dosyasındaki `$2a$10$YourHashedPasswordHere` yerine yazın.

### 3. Backend Kurulumu

```bash
cd server
npm install

# .env dosyası oluşturun
cp .env.example .env

# .env dosyasını düzenleyin ve veritabanı bilgilerinizi girin
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=saloon_db
# DB_USER=postgres
# DB_PASSWORD=your_password

# Sunucuyu başlatın
npm run dev
```

Backend http://localhost:3000 adresinde çalışacaktır.

### 4. Frontend Kurulumu

```bash
cd client
npm install

# Development sunucusunu başlatın
npm run dev
```

Frontend http://localhost:5173 adresinde çalışacaktır.

## Giriş Bilgileri

Varsayılan admin hesabı:
- **Email:** admin@saloon.com
- **Şifre:** admin123

## API Endpoints

### Authentication
- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/auth/me` - Mevcut kullanıcı bilgisi

### Companies
- `GET /api/companies` - Tüm firmaları listele
- `GET /api/companies/:id` - Firma detayı
- `POST /api/companies` - Yeni firma oluştur
- `PUT /api/companies/:id` - Firma güncelle
- `DELETE /api/companies/:id` - Firma sil (soft delete)
- `POST /api/companies/:id/verify` - Firma onayla

### Address (Türkiye API)
- `GET /api/address/provinces` - Tüm illeri getir
- `GET /api/address/provinces/:id` - İl detayı
- `GET /api/address/provinces/:provinceId/districts` - İlçeleri getir
- `GET /api/address/provinces/:provinceId/districts/:districtId/neighborhoods` - Mahalleleri getir

## Özellikler

### ✅ Tamamlanan
- Admin paneli
- Kullanıcı authentication (JWT)
- Firma CRUD operasyonları
- Türkiye il/ilçe/mahalle entegrasyonu (turkiyeapi.dev)
- Harita üzerinden konum seçimi (Leaflet)
- Banka bilgileri yönetimi
- Firma onaylama sistemi
- Responsive tasarım

### 🔄 Sonraki Aşamalar
- Firma çalışanları yönetimi (company_users tablosu hazır)
- Hizmet tanımlamaları
- Çalışma saatleri
- Randevu sistemi
- Ödeme entegrasyonu
- Müşteri paneli
- Bildirim sistemi

## Teknoloji Stack

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL
- JWT Authentication
- Zod (Validation)
- Axios (HTTP Client)

### Frontend
- React 18
- TypeScript
- Vite
- React Router v6
- Zustand (State Management)
- TailwindCSS
- Leaflet (Maps)
- Axios

## Proje Yapısı

```
saloon/
├── server/                 # Backend
│   ├── src/
│   │   ├── config/        # Konfigürasyon
│   │   ├── routes/        # API routes
│   │   ├── services/      # İş mantığı
│   │   └── index.ts       # Ana dosya
│   ├── database/          # Veritabanı şemaları
│   └── package.json
│
├── client/                # Frontend
│   ├── src/
│   │   ├── pages/        # Sayfa komponentleri
│   │   ├── store/        # State management
│   │   ├── lib/          # Utilities
│   │   ├── types/        # TypeScript types
│   │   └── App.tsx       # Ana uygulama
│   └── package.json
│
└── README.md
```

## Sorun Giderme

### PostgreSQL Bağlantı Hatası
- PostgreSQL servisinin çalıştığından emin olun
- .env dosyasındaki bağlantı bilgilerini kontrol edin
- Firewall ayarlarını kontrol edin

### Türkiye API Hatası
- İnternet bağlantınızı kontrol edin
- API rate limit'e takılmış olabilirsiniz, birkaç dakika bekleyin

### Harita Görünmüyor
- Leaflet CSS'inin yüklendiğinden emin olun
- Browser console'da hata var mı kontrol edin

## Destek

Sorularınız için: [GitHub Issues](https://github.com/yourusername/saloon/issues)
