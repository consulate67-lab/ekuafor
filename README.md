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

### Frontend (GitHub Pages)
Frontend otomatik olarak GitHub Pages üzerinden yayınlanmaktadır. 
[https://consulate67-lab.github.io/ekuafor/](https://consulate67-lab.github.io/ekuafor/)

### 🤖 Android Uygulaması (APK)
Her push işleminde GitHub Actions üzerinden otomatik APK oluşturulur:
1. Depodaki **Actions** sekmesine gidin.
2. **Build Android APK** akışına tıklayın.
3. En son başarılı build'in altındaki **Artifacts** kısmından `saloon-app-debug` dosyasını indirebilirsiniz.

### Backend (Railway / Render)
Backend'i canlıya almak için:
1. GitHub deponuzu [Railway](https://railway.app/) veya [Render](https://render.com/)'a bağlayın.
2. **Root Directory** olarak `server` klasörünü seçin.
3. Gerekli **Environment Variables** (DB_HOST, JWT_SECRET vb.) değerlerini girin.
4. Veritabanı için **Supabase** veya **Railway PostgreSQL** kullanmanızı öneririz.

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
