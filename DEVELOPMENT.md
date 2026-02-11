# Saloon Projesi - Geliştirme Notları

## Proje Durumu: Faz 1 Tamamlandı ✅

### Tamamlanan Özellikler

#### 1. Veritabanı Yapısı
- ✅ PostgreSQL şeması oluşturuldu
- ✅ Kullanıcı rolleri (super_admin, company_admin, customer)
- ✅ Firmalar tablosu (tam adres ve banka bilgileri ile)
- ✅ Firma çalışanları tablosu (company_users) - **ID ile hazır**
- ✅ Hizmetler, çalışma saatleri, randevular ve ödemeler için tablolar

#### 2. Backend API
- ✅ Express + TypeScript
- ✅ JWT Authentication
- ✅ Kullanıcı kayıt/giriş sistemi
- ✅ Firma CRUD operasyonları
- ✅ Türkiye API entegrasyonu (il/ilçe/mahalle)
- ✅ Zod validation
- ✅ Error handling

#### 3. Frontend
- ✅ React + TypeScript + Vite
- ✅ TailwindCSS ile modern tasarım
- ✅ React Router ile sayfa yönlendirme
- ✅ Zustand ile state management
- ✅ Login sayfası
- ✅ Dashboard
- ✅ Firma listesi
- ✅ Firma formu (harita ve adres seçimi ile)

#### 4. Özel Özellikler
- ✅ **Harita Entegrasyonu**: Leaflet ile interaktif harita
- ✅ **Adres Sistemi**: Türkiye'nin tüm il/ilçe/mahalle verileri
- ✅ **Banka Bilgileri**: IBAN, banka adı, şube bilgileri
- ✅ **Konum Seçimi**: Harita üzerinde tıklayarak konum belirleme
- ✅ **Firma Onaylama**: Admin tarafından firma onaylama sistemi

### Sonraki Aşamalar (Faz 2)

#### 1. Firma Çalışanları Yönetimi
**ÖNEMLİ NOT**: `company_users` tablosu hazır ve her çalışan için benzersiz ID mevcut.

Yapılacaklar:
- [ ] Çalışan ekleme/düzenleme/silme API endpoint'leri
- [ ] Çalışan listesi sayfası
- [ ] Çalışan formu
- [ ] Çalışan rolü yönetimi (owner, manager, staff)
- [ ] Çalışan profil fotoğrafı

Örnek API yapısı:
```typescript
POST   /api/companies/:companyId/employees
GET    /api/companies/:companyId/employees
GET    /api/companies/:companyId/employees/:employeeId
PUT    /api/companies/:companyId/employees/:employeeId
DELETE /api/companies/:companyId/employees/:employeeId
```

#### 2. Hizmet Yönetimi
- [ ] Hizmet tanımlama (kesim, boyama, manikür vb.)
- [ ] Hizmet süresi ve fiyat belirleme
- [ ] Hangi çalışanın hangi hizmeti verdiği

#### 3. Çalışma Saatleri
- [ ] Firma çalışma saatleri
- [ ] Çalışan bazlı çalışma saatleri
- [ ] Tatil günleri yönetimi

#### 4. Randevu Sistemi
- [ ] Müşteri randevu oluşturma
- [ ] Randevu takvimi görünümü
- [ ] Randevu onaylama/iptal etme
- [ ] SMS/Email bildirimleri
- [ ] Randevu hatırlatıcıları

#### 5. Ödeme Sistemi
- [ ] Online ödeme entegrasyonu (iyzico, PayTR vb.)
- [ ] Komisyon hesaplama
- [ ] Otomatik IBAN'a ödeme transferi
- [ ] Ödeme geçmişi ve raporlama

#### 6. Müşteri Paneli
- [ ] Müşteri kayıt/giriş
- [ ] Randevu alma
- [ ] Randevu geçmişi
- [ ] Favori firmalar
- [ ] Değerlendirme/yorum sistemi

### Veritabanı Notları

#### Company_Users Tablosu Yapısı
```sql
CREATE TABLE company_users (
    id SERIAL PRIMARY KEY,              -- ✅ Benzersiz çalışan ID
    company_id INTEGER,                 -- Firma ID
    user_id INTEGER,                    -- Kullanıcı ID
    role VARCHAR(50),                   -- 'owner', 'manager', 'staff'
    is_active BOOLEAN,                  -- Aktif/Pasif durum
    created_at TIMESTAMP
);
```

Bu tablo sayesinde:
- Her çalışanın benzersiz bir ID'si var
- Bir kullanıcı birden fazla firmada çalışabilir
- Çalışan rolleri yönetilebilir
- Çalışanlar aktif/pasif yapılabilir

### API Entegrasyonları

#### Türkiye API (turkiyeapi.dev)
- Ücretsiz ve açık kaynak
- 81 il, tüm ilçeler ve mahalleler
- Rate limit: Makul kullanımda sorun yok
- Alternatif: Kendi veritabanınıza import edebilirsiniz

#### Harita (Leaflet + OpenStreetMap)
- Ücretsiz ve açık kaynak
- Google Maps'e alternatif
- Marker ekleme, konum seçimi
- Ticari kullanıma uygun

### Güvenlik Notları

1. **JWT Secret**: Production'da mutlaka güçlü bir secret kullanın
2. **HTTPS**: Production'da HTTPS kullanın
3. **Rate Limiting**: API'ye rate limiting ekleyin
4. **Input Validation**: Zod ile validation yapılıyor
5. **SQL Injection**: Parametreli sorgular kullanılıyor
6. **XSS**: React otomatik escape yapıyor

### Deployment Önerileri

#### Backend
- Railway, Render, Heroku
- PostgreSQL için: Supabase, Railway, Render

#### Frontend
- Vercel, Netlify, GitHub Pages
- Environment variables için .env kullanın

#### Database
- Supabase (ücretsiz PostgreSQL)
- Railway (ücretsiz tier)
- Render (ücretsiz PostgreSQL)

### Test Senaryosu

1. **Admin Girişi**
   - Email: admin@saloon.com
   - Şifre: admin123

2. **Firma Ekleme**
   - Temel bilgileri girin
   - İl/İlçe/Mahalle seçin
   - Haritadan konum seçin
   - Banka bilgilerini girin
   - Kaydedin

3. **Firma Onaylama**
   - Firma listesinde onay butonuna tıklayın

4. **Firma Düzenleme**
   - Düzenle butonuna tıklayın
   - Bilgileri güncelleyin

### Geliştirme İpuçları

1. **Hot Reload**: Backend ve frontend'de hot reload aktif
2. **TypeScript**: Tip güvenliği için kullanın
3. **ESLint**: Kod kalitesi için eklenebilir
4. **Prettier**: Kod formatı için eklenebilir
5. **Git**: Düzenli commit yapın

### Bilinen Sorunlar / TODO

- [ ] Admin şifre hash'i schema.sql'de güncellenmeli
- [ ] Error logging sistemi eklenebilir
- [ ] API rate limiting eklenebilir
- [ ] Unit testler yazılabilir
- [ ] E2E testler eklenebilir
- [ ] Docker support eklenebilir
- [ ] CI/CD pipeline kurulabilir

### İletişim ve Destek

Sorularınız için:
- GitHub Issues
- Email: support@saloon.com (örnek)

---

**Son Güncelleme**: 2026-02-11
**Versiyon**: 1.0.0 (Faz 1)
**Geliştirici**: Saloon Team
