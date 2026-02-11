# 💇‍♂️ Saloon (E-Kuaför) Randevu Sistemi

Saloon, güzellik merkezleri ve kuaförler için geliştirilmiş, kapsamlı bir randevu ve yönetim sistemidir.

[![Status](https://img.shields.io/badge/Status-Phase_1_Complete-green.svg)](https://github.com/consulate67-lab/ekuafor)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-orange.svg)](https://github.com/consulate67-lab/ekuafor)

## 🌟 Proje Özeti (Faz 1)

Bu aşamada projenin temel altyapısı, firma yönetim sistemi ve adres/harita entegrasyonu tamamlanmıştır.

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
- ✅ **Çalışan Yönetimi**: Firmaya benzersiz ID'si ile çalışan ekleme sistemi altyapısı hazırlandı.

## 🚀 Deployment

### Frontend (GitHub Pages)
Frontend otomatik olarak GitHub Pages üzerinden yayınlanmaktadır. 
[https://consulate67-lab.github.io/ekuafor/](https://consulate67-lab.github.io/ekuafor/)

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

- [ ] Çalışan paneli ve profil yönetimi
- [ ] Hizmet (Service) bazlı çalışma saatleri
- [ ] Randevu (Appointment) oluşturma ve takvim
- [ ] Müşteri bildirimleri (E-posta/SMS)
- [ ] Ödeme sistemleri (iyzico Entegrasyonu)

---
**Geliştirici**: Antigravity AI
**Tarih**: Şubat 2026
