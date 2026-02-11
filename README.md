# 💇 Saloon - Güzellik Merkezi Randevu Sistemi

Modern, kullanıcı dostu ve kapsamlı bir güzellik merkezi yönetim ve randevu sistemi.

![Status](https://img.shields.io/badge/Status-Faz%201%20Tamamlandı-success)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 📋 Proje Özeti

Saloon, erkek ve kadın kuaförler için geliştirilmiş, modern bir randevu yönetim sistemidir. Firma yönetiminden randevu almaya, ödeme sisteminden çalışan yönetimine kadar tüm ihtiyaçları karşılar.

## 👥 Kullanıcı Tipleri

1. **Super Admin**: Sistem yöneticisi, tüm firmaları yönetir
2. **Firma Yöneticisi**: Kendi firmasını, çalışanlarını ve randevularını yönetir
3. **Müşteri**: Randevu alır ve geçmişini görüntüler

## ✨ Özellikler (Faz 1 - Tamamlandı)

### 🏢 Firma Yönetimi
- ✅ Kapsamlı firma profili oluşturma
- ✅ Firma bilgileri (isim, açıklama, iletişim)
- ✅ **Türkiye Adres Sistemi**: 81 il, tüm ilçe ve mahalleler
- ✅ **İnteraktif Harita**: Leaflet ile konum belirleme
- ✅ Banka bilgileri (IBAN, banka adı, şube)
- ✅ Firma onaylama sistemi
- ✅ Komisyon oranı belirleme

### 🔐 Güvenlik ve Yetkilendirme
- ✅ JWT tabanlı authentication
- ✅ Rol bazlı yetkilendirme
- ✅ Güvenli şifre saklama (bcrypt)
- ✅ Input validation (Zod)

### 🎨 Modern Kullanıcı Arayüzü
- ✅ Responsive tasarım (mobil uyumlu)
- ✅ TailwindCSS ile modern görünüm
- ✅ Kullanıcı dostu formlar
- ✅ Gerçek zamanlı validasyon

### 🗺️ Harita Entegrasyonu
- ✅ OpenStreetMap ile ücretsiz harita
- ✅ Tıklayarak konum seçimi
- ✅ Marker ile konum gösterimi
- ✅ Koordinat bilgisi saklama

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

Detaylı kurulum talimatları için [SETUP.md](SETUP.md) dosyasına bakın.

### Hızlı Başlangıç

1. **Veritabanı Oluştur**
```bash
createdb saloon_db
psql -d saloon_db -f server/database/schema.sql
```

2. **Backend Kurulum**
```bash
cd server
npm install
cp .env.example .env
# .env dosyasını düzenleyin
npm run dev
```

3. **Frontend Kurulum**
```bash
cd client
npm install
npm run dev
```

4. **Tarayıcıda Aç**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### 🔑 Varsayılan Giriş
- **Email**: admin@saloon.com
- **Şifre**: admin123

## 📁 Proje Yapısı

```
saloon/
├── server/                 # Backend
│   ├── src/
│   │   ├── config/        # Database config
│   │   ├── routes/        # API endpoints
│   │   │   ├── auth.routes.ts
│   │   │   ├── company.routes.ts
│   │   │   └── address.routes.ts
│   │   ├── services/      # Business logic
│   │   │   ├── company.service.ts
│   │   │   └── address.service.ts
│   │   └── index.ts       # Main server file
│   ├── database/          # SQL schemas
│   └── package.json
│
├── client/                # Frontend
│   ├── src/
│   │   ├── pages/        # Page components
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CompanyList.tsx
│   │   │   └── CompanyForm.tsx
│   │   ├── store/        # Zustand stores
│   │   ├── lib/          # Utilities
│   │   ├── types/        # TypeScript types
│   │   └── App.tsx
│   └── package.json
│
├── README.md             # Bu dosya
├── SETUP.md              # Kurulum kılavuzu
└── DEVELOPMENT.md        # Geliştirme notları
```

## 🔄 Sonraki Aşamalar (Faz 2)

- [ ] **Firma Çalışanları**: Çalışan ekleme, düzenleme, rol yönetimi
- [ ] **Hizmet Yönetimi**: Kesim, boyama, manikür vb. hizmet tanımları
- [ ] **Çalışma Saatleri**: Firma ve çalışan bazlı çalışma saatleri
- [ ] **Randevu Sistemi**: Müşteri randevu alma, takvim görünümü
- [ ] **Ödeme Entegrasyonu**: Online ödeme, otomatik transfer
- [ ] **Bildirimler**: SMS/Email bildirimleri
- [ ] **Müşteri Paneli**: Müşteri kayıt, randevu alma
- [ ] **Raporlama**: Gelir, randevu istatistikleri

## 📚 Dokümantasyon

- [Kurulum Kılavuzu](SETUP.md) - Detaylı kurulum adımları
- [Geliştirme Notları](DEVELOPMENT.md) - Teknik detaylar ve yol haritası

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

Sorularınız için GitHub Issues kullanabilirsiniz.

---

**Geliştirme Durumu**: Aktif Geliştirme  
**Son Güncelleme**: 11 Şubat 2026  
**Versiyon**: 1.0.0 (Faz 1)
