# 🎯 Saloon Projesi - Hızlı Başlangıç Rehberi

## 📌 Proje Durumu

✅ **FAZ 1 TAMAMLANDI!**

Güzellik merkezi randevu sistemi için temel altyapı hazır:
- Backend API (Node.js + Express + PostgreSQL)
- Frontend UI (React + TypeScript + Vite)
- Firma yönetim sistemi
- Türkiye adres entegrasyonu
- Harita ile konum seçimi
- Banka bilgileri yönetimi

## 🚀 Hemen Başlamak İçin

### 1️⃣ Önkoşullar

Sisteminizde bunlar yüklü olmalı:
- ✅ Node.js (v18+)
- ✅ PostgreSQL (v14+)
- ✅ npm veya yarn

### 2️⃣ Veritabanı Kurulumu (5 dakika)

```bash
# PostgreSQL'de yeni veritabanı oluştur
createdb saloon_db

# Şemayı yükle
psql -d saloon_db -f server/database/schema.sql
```

**ÖNEMLİ**: Admin şifresini hash'leyin:
```bash
cd server
npm install bcryptjs
node scripts/generate-admin-hash.js
```

Çıkan hash'i `server/database/schema.sql` dosyasındaki INSERT komutuna yapıştırın.

### 3️⃣ Backend Başlatma (2 dakika)

```bash
cd server
npm install
# .env dosyası zaten kopyalandı, sadece şifrenizi güncelleyin
npm run dev
```

✅ Backend çalışıyor: http://localhost:3000

### 4️⃣ Frontend Başlatma (2 dakika)

```bash
cd client
npm install
npm run dev
```

✅ Frontend çalışıyor: http://localhost:5173

### 5️⃣ Giriş Yapın

Tarayıcınızda http://localhost:5173 adresine gidin:
- **Email**: admin@saloon.com
- **Şifre**: admin123

## 📋 İlk Firma Ekleyin

1. Dashboard'dan "Firmalar" kartına tıklayın
2. "Yeni Firma Ekle" butonuna tıklayın
3. Formu doldurun:
   - Temel bilgileri girin
   - İl/İlçe/Mahalle seçin
   - Haritadan konum seçin
   - Banka bilgilerini girin
4. "Kaydet" butonuna tıklayın

## 🎨 Ekran Görüntüleri

### Login Sayfası
Modern, gradient arka planlı giriş ekranı

### Dashboard
İstatistikler ve hızlı erişim kartları

### Firma Listesi
Tüm firmalar, filtreleme ve arama

### Firma Formu
Kapsamlı form + interaktif harita

## 📊 Veritabanı Tabloları

Şu anda kullanılan tablolar:
- ✅ `users` - Kullanıcılar (admin, firma yöneticisi, müşteri)
- ✅ `companies` - Firmalar (tam bilgiler)
- ✅ `company_users` - Firma çalışanları (ID ile hazır)

Hazır ama henüz kullanılmayan tablolar:
- ⏳ `services` - Hizmetler
- ⏳ `working_hours` - Çalışma saatleri
- ⏳ `appointments` - Randevular
- ⏳ `payments` - Ödemeler

## 🔧 Geliştirme Araçları

### Backend API Test
```bash
# Health check
curl http://localhost:3000/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@saloon.com","password":"admin123"}'

# Firmaları listele
curl http://localhost:3000/api/companies \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Hot Reload
Kod değişiklikleriniz otomatik olarak tarayıcıda güncellenir.

### TypeScript Type Checking
```bash
# Backend
cd server
npm run build

# Frontend
cd client
npm run build
```

## 🐛 Sorun Giderme

### Backend başlamıyor
- PostgreSQL çalışıyor mu? `pg_isready` komutuyla kontrol edin
- .env dosyası doğru mu? Şifre, veritabanı adı kontrol edin
- Port 3000 kullanımda mı? `netstat -ano | findstr :3000`

### Frontend başlamıyor
- node_modules yüklendi mi? `npm install` tekrar çalıştırın
- Port 5173 kullanımda mı? Vite otomatik başka port bulur

### Harita görünmüyor
- İnternet bağlantınızı kontrol edin (OpenStreetMap için)
- Browser console'da hata var mı kontrol edin

### Türkiye API çalışmıyor
- İnternet bağlantınızı kontrol edin
- API rate limit'e takılmış olabilir, birkaç dakika bekleyin

## 📝 Sonraki Adımlar

### Faz 2: Firma Çalışanları
```sql
-- Veritabanı hazır, sadece API ve UI gerekli
SELECT * FROM company_users;
```

Yapılacaklar:
1. Backend: Employee CRUD API'leri
2. Frontend: Çalışan listesi ve formu
3. Rol yönetimi (owner, manager, staff)

### Faz 3: Hizmet Yönetimi
Kesim, boyama, manikür gibi hizmetleri tanımlayın.

### Faz 4: Randevu Sistemi
Müşterilerin randevu alabilmesi için tam sistem.

## 📚 Daha Fazla Bilgi

- [README.md](README.md) - Proje genel bakış
- [SETUP.md](SETUP.md) - Detaylı kurulum
- [DEVELOPMENT.md](DEVELOPMENT.md) - Geliştirme notları

## 💡 İpuçları

1. **Hot Reload**: Kod değişiklikleriniz otomatik yüklenir
2. **TypeScript**: Tip hatalarına dikkat edin
3. **Console**: Browser ve terminal console'ları takip edin
4. **Git**: Düzenli commit yapın
5. **Backup**: Veritabanınızı yedekleyin

## 🎉 Başarılar!

Projeniz hazır! Artık geliştirmeye başlayabilirsiniz.

Sorularınız için: GitHub Issues

---

**Hazırlayan**: Antigravity AI Assistant  
**Tarih**: 11 Şubat 2026  
**Süre**: ~45 dakika  
**Dosya Sayısı**: 25+
