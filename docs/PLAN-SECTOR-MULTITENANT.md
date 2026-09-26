# Multi-Tenant Sektör Mimarisi — Plan

**Tarih:** 2026-09-26
**Yazar:** Mavis (Selim YILMAZ vizyonu)
**Durum:** Taslak — Selim onayı bekleniyor
**Öncelik:** Aşama 6 (DB taşıma tamamlandıktan sonra)

---

## 1. Background & Motivasyon

Saloon projesi başlangıçta **güzellik salonu / kuaför / berber** odaklı tasarlandı. 7141 firma Supabase'de bu kategoride birikti. Selim YILMAZ'ın yeni vizyonu:

> *"Bu sistemi sadece güzellik salonu için düşünmüştüm. Ancak plastik cerrah, diş hekimi, doktor, hastane randevu sistemine duyan her nokta için global düşünerek tekrar düzenleyelim."*

### Neden sıfırdan yazma değil, hibrit yaklaşım

| Modül | Sektör-agnostic | Karar |
|---|---|---|
| Appointment engine (slot, çakışma, hatırlatma) | ✅ Evet | Koru |
| SMS / NetGSM | ✅ Evet | Koru, şablonları sector-aware yap |
| Push notification (kaldırıldı Firebase ile birlikte) | ✅ Evet | Koru |
| Payment (iyzico) | ✅ Evet | Koru |
| OSM importer | ✅ Evet | Koru, kategori filtresi sector-aware |
| KVKK tabloları | ✅ Evet | Koru, ek sensitive data alanları |
| Company onboarding | ❌ Sektör seçimi eksik | **Revize** |
| Service/Paket tanımı | ❌ Kategoriler güzellik salonuna özel | **Config-driven** |
| Çalışan uzmanlık alanları | ❌ Kuaför ≠ Diş hekimi | **Config-driven** |
| AI asistan prompt şablonları | ❌ Güzellik salonu prompt'u | **Sector template** |
| KVKK aydınlatma metni | ❌ Sağlık sektörü farklı | **Sector template** |
| SMS şablonları | ❌ Randevu hatırlatma sektöre özel | **Sector template** |
| Statik landing page (`/`) | ❌ Beauty öne çıkıyor | **Sector-aware CTA** |

**Sonuç:** Core engine sektör-agnostic kalır, **6 katman** config-driven hale getirilir. 7141 firma data'sı `sector='beauty'` olarak default migrate edilir → sıfır kayıp.

---

## 2. Hedef Kitle & Sektör Kataloğu

### 2.1 MVP Sektörler (Selim onayı: 2026-09-26)

Selim "all sectors" seçti. Aşağıdaki **9 sektör** MVP'de olacak (Wellness ekledim, çünkü masaj/spa medikal wellness ile sık karıştırılır):

| ID | Slug | İsim (TR) | İsim (EN) | İkon | Renk | Sensitive Data? |
|---|---|---|---|---|---|---|
| 1 | `beauty` | Güzellik Salonu | Beauty Salon | 💅 | #ec4899 | Hayır |
| 2 | `hair` | Kuaför | Hair Salon | 💇 | #8b5cf6 | Hayır |
| 3 | `barber` | Berber | Barber | ✂️ | #6366f1 | Hayır |
| 4 | `dental` | Diş Hekimi | Dental Clinic | 🦷 | #06b6d4 | **Evet** |
| 5 | `plastic_surgery` | Plastik Cerrahi | Plastic Surgery | 💉 | #f43f5e | **Evet** |
| 6 | `medical` | Doktor / Klinik | Medical Clinic | 🩺 | #10b981 | **Evet** |
| 7 | `veterinary` | Veteriner | Veterinary | 🐾 | #f59e0b | Hayır (ama hasta hayvan kaydı var) |
| 8 | `fitness` | Fitness / PT | Fitness / PT | 💪 | #ef4444 | Hayır |
| 9 | `wellness` | Masaj / Spa / Wellness | Wellness | 🌿 | #14b8a6 | Hayır |

### 2.2 Sub-Sector (uzmanlık alanları)

Her ana sektör için alt uzmanlıklar:

- **beauty**: cilt bakımı, makyaj, kaş tasarımı, lazer epilasyon, kalıcı makyaj
- **hair**: saç kesimi, boyama, fön, keratin, saç ekimi (medikal sınır)
- **barber**: saç kesimi, sakal, çocuk kesimi, klasik tıraş
- **dental**: implant, ortodonti, kanal tedavisi, diş çekimi, estetik diş, pedodonti, periodontoloji
- **plastic_surgery**: botoks, dolgu, rinoplasti, liposuction, meme estetiği, yüz gençleştirme
- **medical**: kardiyoloji, dermatoloji, göz, KBB, ortopedi, kadın doğum, check-up
- **veterinary**: genel muayene, aşı, cerrahi, diş, acil
- **fitness**: kişisel antrenör, yoga, pilates, kickboks, yüzme
- **wellness**: masaj (İsveç, derin doku, Thai), spa, hamam, sauna, aromaterapi

### 2.3 Custom Field Tanımları (örnek)

`appointment_metadata` JSONB kolonunda her sektör için özel alanlar:

```json
// dental
{ "tooth_number": "11", "treatment_type": "implant", "anesthesia": "local" }

// plastic_surgery
{ "procedure_code": "BOT-01", "consent_signed": true, "before_photos_url": "..." }

// medical
{ "diagnosis_code": "ICD-10:I10", "prescription": "...", "follow_up_days": 30 }

// veterinary
{ "pet_species": "dog", "pet_breed": "Golden Retriever", "pet_age": 4, "vaccine_type": "rabies" }
```

---

## 3. Mimari Kararlar

### 3.1 Karar 1: Sector = Konfig, Kod = Generic

Tüm sector-specific davranış **runtime config**'ten okunur. Kod değişikliği yeni sektör eklendiğinde **sıfır**, yeni sub-sector eklendiğinde **sıfır**.

**Yapı:**
- `sectors` tablosu: sektör metadata (id, slug, name_tr, name_en, icon, color, has_medical_consent, default_duration_minutes, custom_fields_schema)
- `sector_service_templates` tablosu: sektör için seed service kategorileri (Dental: implant, kanal, ortodonti)
- `sector_employee_specialties` tablosu: sektör için çalışan uzmanlık alanları
- `sector_kvkk_disclosures` tablosu: sektör için KVKK aydınlatma metni (HTML)
- `sector_ai_prompts` tablosu: AI asistan için sector-specific system prompt
- `sector_sms_templates` tablosu: SMS şablonları (placeholder: `{customer_name}`, `{appointment_date}`, `{sector_specific_field}`)

### 3.2 Karar 2: Multi-Select Sector

Bir firma hem kuaför hem güzellik salonu olabilir. Schema:

```sql
CREATE TABLE company_sectors (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sector_id INTEGER NOT NULL REFERENCES sectors(id),
  sub_specialty TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (company_id, sector_id)
);
```

UI: Company onboarding'de multi-select checkbox + "birincil sektör" seçimi. Birincil sektör landing page'de gösterilir, varsayılan kategori filtre olarak kullanılır.

### 3.3 Karar 3: Custom Fields = JSONB

`appointments.metadata JSONB` — esnek, indexlenebilir (`GIN`), migration'sız şema değişikliği.

**Avantaj:** Yeni sektör eklenince kod değişmez, sadece `sectors.custom_fields_schema` güncellenir.
**Dezavantaj:** Type-safe değil, Zod ile runtime validation yapılmalı.

**Mitigation:** `sectors.custom_fields_schema` JSON Schema olarak tutulur, server-side Zod schema runtime'da derive edilir, client-side form dynamic render yapılır.

### 3.4 Karar 4: KVKK Sensitive Data = Ayrı Tablo

Sağlık sektörü için hassas veri (tıbbi geçmiş, alerji, reçete) `customer_medical_history` ayrı tablosunda:

```sql
CREATE TABLE customer_medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  sector_id INTEGER NOT NULL REFERENCES sectors(id),
  data JSONB NOT NULL,  -- { allergies: [], medications: [], conditions: [], consent_signed_at: ... }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Bu tablo **ek KVKK onayı** gerektirir (consent_signed_at). Onaysız firma bu tabloya yazamaz.

### 3.5 Karar 5: Pricing Model = Sektör-Bazlı Komisyon

Mevcut `plan` paket modeli korunur, ama:
- Beauty/Hair/Barber → standart komisyon (%5)
- Dental/Plastic/Medical → premium komisyon (%8) + "verified medical provider" badge
- Veterinary/Fitness/Wellness → standart komisyon (%5)

İyzico ödeme altyapısı değişmez, sadece komisyon oranı sector'e göre değişir.

---

## 4. DB Şema (Migration Stratejisi)

### 4.1 Yeni Tablolar

```sql
-- 1. Sectors (master data, runtime seed'lenir)
CREATE TABLE sectors (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name_tr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  icon VARCHAR(10) NOT NULL,
  color VARCHAR(7) NOT NULL,
  has_medical_consent BOOLEAN DEFAULT false,
  default_duration_minutes INTEGER DEFAULT 30,
  commission_rate DECIMAL(4,2) DEFAULT 5.00,
  custom_fields_schema JSONB,  -- JSON Schema
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Company <-> Sector (many-to-many)
CREATE TABLE company_sectors (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sector_id INTEGER NOT NULL REFERENCES sectors(id),
  sub_specialty VARCHAR(100),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (company_id, sector_id)
);
CREATE INDEX idx_company_sectors_sector ON company_sectors(sector_id);

-- 3. Sector service templates (seed data, runtime'da eklenebilir)
CREATE TABLE sector_service_templates (
  id SERIAL PRIMARY KEY,
  sector_id INTEGER NOT NULL REFERENCES sectors(id),
  name_tr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  default_duration_minutes INTEGER DEFAULT 30,
  default_price DECIMAL(10,2),
  requires_specialist BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 4. Sector employee specialties
CREATE TABLE sector_employee_specialties (
  id SERIAL PRIMARY KEY,
  sector_id INTEGER NOT NULL REFERENCES sectors(id),
  name_tr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  requires_certification BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0
);

-- 5. Sector KVKK disclosures (HTML)
CREATE TABLE sector_kvkk_disclosures (
  id SERIAL PRIMARY KEY,
  sector_id INTEGER NOT NULL REFERENCES sectors(id),
  language VARCHAR(5) DEFAULT 'tr',
  disclosure_html TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  effective_from DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true
);

-- 6. Sector AI prompts
CREATE TABLE sector_ai_prompts (
  id SERIAL PRIMARY KEY,
  sector_id INTEGER NOT NULL REFERENCES sectors(id),
  system_prompt TEXT NOT NULL,
  few_shot_examples JSONB,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 500,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true
);

-- 7. Sector SMS templates
CREATE TABLE sector_sms_templates (
  id SERIAL PRIMARY KEY,
  sector_id INTEGER NOT NULL REFERENCES sectors(id),
  template_key VARCHAR(50) NOT NULL,  -- 'appointment_reminder', 'appointment_confirm', 'follow_up'
  template_body TEXT NOT NULL,
  variables JSONB,  -- ['customer_name', 'appointment_date', 'specialty']
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true
);

-- 8. Customer medical history (KVKK sensitive)
CREATE TABLE customer_medical_history (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  company_id INTEGER NOT NULL REFERENCES companies(id),
  sector_id INTEGER NOT NULL REFERENCES sectors(id),
  data JSONB NOT NULL,
  consent_signed_at TIMESTAMPTZ,
  consent_ip INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Appointments tablosuna metadata JSONB ekle
ALTER TABLE appointments ADD COLUMN metadata JSONB;
CREATE INDEX idx_appointments_metadata ON appointments USING GIN (metadata);
```

### 4.2 Migration Stratejisi

```sql
-- Faz 1: Mevcut 7141 firmayı beauty'ye migrate et
INSERT INTO company_sectors (company_id, sector_id, is_primary)
SELECT id, 1, true FROM companies
WHERE id NOT IN (SELECT company_id FROM company_sectors);

-- Faz 2: sectors tablosunu seed et (9 sektör)
INSERT INTO sectors (slug, name_tr, name_en, icon, color, has_medical_consent, default_duration_minutes, commission_rate, display_order) VALUES
('beauty', 'Güzellik Salonu', 'Beauty Salon', '💅', '#ec4899', false, 45, 5.00, 1),
('hair', 'Kuaför', 'Hair Salon', '💇', '#8b5cf6', false, 30, 5.00, 2),
('barber', 'Berber', 'Barber', '✂️', '#6366f1', false, 30, 5.00, 3),
('dental', 'Diş Hekimi', 'Dental Clinic', '🦷', '#06b6d4', true, 60, 8.00, 4),
('plastic_surgery', 'Plastik Cerrahi', 'Plastic Surgery', '💉', '#f43f5e', true, 90, 8.00, 5),
('medical', 'Doktor / Klinik', 'Medical Clinic', '🩺', '#10b981', true, 30, 8.00, 6),
('veterinary', 'Veteriner', 'Veterinary', '🐾', '#f59e0b', false, 45, 5.00, 7),
('fitness', 'Fitness / PT', 'Fitness / PT', '💪', '#ef4444', false, 60, 5.00, 8),
('wellness', 'Masaj / Spa / Wellness', 'Wellness', '🌿', '#14b8a6', false, 60, 5.00, 9);

-- Faz 3: Beauty için seed service templates (mevcut güzellik salonu kategorileri)
INSERT INTO sector_service_templates (sector_id, name_tr, default_duration_minutes, default_price, requires_specialist) VALUES
(1, 'Saç Boyama', 90, 350.00, false),
(1, 'Manikür', 45, 200.00, false),
(1, 'Pedikür', 60, 250.00, false),
(1, 'Cilt Bakımı', 60, 500.00, true),
(1, 'Lazer Epilasyon', 30, 400.00, true),
-- ... (toplam ~20 template/sector)
(2, 'Saç Kesimi', 30, 150.00, false),
(2, 'Fön', 30, 150.00, false),
-- ...
(3, 'Sakal Traşı', 20, 100.00, false),
-- ...
(4, 'Implant', 120, 15000.00, true),
(4, 'Kanal Tedavisi', 60, 2500.00, true),
-- ...
```

### 4.3 Drizzle ORM

Yeni tablolar Drizzle schema'sına eklenir (`src/db/schema/sectors.ts`, `company_sectors.ts`, `sector_templates.ts`, `medical_history.ts`). 30 mevcut tablo + 9 yeni = 39 tablo.

---

## 5. UI/UX Yol Haritası

### 5.1 Company Onboarding (yeni akış)

1. **Adım 1:** Firma bilgileri (mevcut)
2. **Adım 2:** Sektör seçimi (yeni) — multi-select icon grid, birincil sektör seçici
3. **Adım 3:** Uzmanlık alanları (yeni) — seçilen sektörlere göre dynamic checkbox list
4. **Adım 4:** KVKK onayı (sektöre özel metin, sağlık sektörlerinde ek sensitive data onayı)
5. **Adım 5:** Hizmet ekleme (yeni) — sector template'lerden hızlı seçim + özelleştirme
6. **Adım 6:** Çalışan ekleme (mevcut, sector-aware specialties)

### 5.2 CompanyPanel.tsx Revizyonu

Mevcut `CompanyPanel.tsx` zaten parçalanmış (önceki aşama). Yeni eklenecek:
- `<SectorSelector />` — primary + secondary sectors
- `<SpecialtyPicker />` — sector-aware
- `<ServiceTemplateGallery />` — sector template'lerden hızlı ekleme

### 5.3 Müşteri Tarafı (Landing + App)

- **Landing page** (`/`): Sektör kartları grid (Beauty / Dental / Plastic / Medical / Fitness / Wellness) → her biri için feature list + "Hemen Başla" CTA
- **Hizmet arama** (müşteri): Sector filtre dropdown (Beauty/Hair/Dental/...) + sub_specialty filtre
- **Randevu formu** (müşteri): Sector'e göre dynamic metadata field'lar (dental: diş_no, plastic: operasyon tipi, medical: şikayet)

### 5.4 Capacitor (APK)

APK zaten sektör-agnostic çünkü backend sector-aware. UI dynamic render yapıyor, APK'da değişiklik minimal.

---

## 6. Compliance & KVKK

### 6.1 Sağlık Sektörleri (Dental, Plastic, Medical)

Ek gereksinimler:
- **KVKK Madde 6 — Özel Nitelikli Kişisel Veri**: Sağlık verileri için **ayrı açık rıza** alınmalı
- **Veri saklama süresi**: 5 yıl (Tıbbi Kayıt Yönetmeliği), `appointments.metadata` ve `customer_medical_history` otomatik arşivleme
- **Veri silme talebi** (KVKK Madde 7): Mevcut `kvkk_requests` tablosuna ek olarak "tıbbi kayıt silme" alt tipi
- **Audit log**: Tıbbi veriye her erişim loglanır (viewer_id, viewed_at, ip)

### 6.2 Diğer Sektörler

Standart KVKK metni (mevcut). Sektöre özel ince ayarlar:
- **Fitness**: Sağlık beyanı formu (egzersiz öncesi)
- **Veterinary**: Hayvan sahibi + hasta hayvan ilişkisi (vekaletname)
- **Wellness**: Hassas bölge fotoğrafı için ek onay

### 6.3 AI Asistan

Mevcut AI asistan güzellik salonu varsayımıyla çalışıyor. Yeni yaklaşım:
- Sector seçildiğinde ilgili `sector_ai_prompts.system_prompt` yüklenir
- Örnek: dental sektor için "Sen bir diş kliniği asistanısın. Fiyatlandırma, randevu, implant/kanal/ortodonti hakkında bilgi ver..."
- Few-shot examples sector'e göre değişir
- Temperature: medical için 0.3 (deterministic), beauty için 0.7 (creative)

### 6.4 SMS Şablonları

```typescript
// Beauty
"Sayın {customer_name}, {appointment_date} tarihinde {service_name} randevunuz hatırlatmasıdır. Salon: {company_name}. İptal için: {cancel_link}"

// Dental
"Sayın {customer_name}, {appointment_date} saat {appointment_time}'da Dr. {doctor_name} muayenehanesinde randevunuz bulunmaktadır. İmplant/Kanal/Ortodonti işlemleri için hazırlık: {preparation_notes}"

// Plastic Surgery
"Dear {customer_name}, this is a reminder for your {procedure_name} appointment on {appointment_date}. Please avoid {pre_procedure_restrictions}. Consent form: {consent_link}"
```

---

## 7. Sprint Planı (6 Sprint × 1 Hafta = 6 Hafta)

### Sprint 1 (Hafta 1): Sektör Şeması & Seed Data
- DB migration: `sectors`, `company_sectors`, `sector_service_templates`, `sector_employee_specialties` tabloları
- Drizzle schema: `src/db/schema/sectors.ts`, `company_sectors.ts`, `sector_templates.ts`
- Seed data: 9 sektör + 20 service template/sector + 10 specialty/sector
- Migration: 7141 firma → `company_sectors` (beauty primary)
- **Acceptance:** `SELECT COUNT(*) FROM sectors = 9`, `SELECT COUNT(*) FROM company_sectors >= 7141`

### Sprint 2 (Hafta 2): Company Onboarding + Sector Selector
- Frontend: Company onboarding flow'a sector selector (multi-select + primary)
- Backend: `POST /api/companies/:id/sectors` endpoint
- CompanyPanel: `<SectorSelector />` component
- **Acceptance:** Yeni firma beauty + dental multi-sector seçebiliyor, mevcut 7141 firma primary sector 'beauty' görüyor

### Sprint 3 (Hafta 3): Service Template Gallery + Custom Fields
- Frontend: `<ServiceTemplateGallery />` (sector template'lerden hızlı ekleme)
- Backend: `appointments.metadata JSONB` + sector-aware validation
- Drizzle schema update: `appointments.metadata` column
- Frontend: Randevu formunda sector-aware metadata fields (dental: diş_no, medical: şikayet)
- **Acceptance:** Beauty firması saç boyama template'i 1 tıkla ekleyebiliyor, dental firması implant randevusunda diş_no girebiliyor

### Sprint 4 (Hafta 4): Çalışan + KVKK + Compliance
- Çalışan ekranı sector-aware specialties
- KVKK sector disclosures (9 sektör × TR/EN = 18 kayıt)
- `customer_medical_history` tablosu + sağlık sektörü için ek onay akışı
- Audit log: tıbbi veri erişim logları
- **Acceptance:** Dental firması yeni müşteri için tıbbi geçmiş formu gösterebiliyor, müşteri onaylamadan veri kaydedilmiyor

### Sprint 5 (Hafta 5): AI Prompt + SMS Template Sector-Aware
- `sector_ai_prompts` seed (9 sektör için system prompt + few-shot examples)
- AI asistan chat endpoint sector parametresi alıyor
- `sector_sms_templates` seed (9 sektör × 4 template = 36 kayıt)
- NetGSM API sector-aware template selection
- **Acceptance:** Beauty firması AI'ya "saç boyama öner" → saç boyama randevusu açılıyor; dental firması "implant fiyatı?" → implant template'i seçiliyor

### Sprint 6 (Hafta 6): Landing Page + Müşteri UX + Polish
- Landing page sector kartları grid (9 sektör hero)
- Müşteri tarafı hizmet arama sector filtre
- SEO: `/sektor/[slug]` dynamic route (örn. `/sektor/dental`)
- APK rebuild + test
- Performance: lazy load sector templates, cache AI prompts
- **Acceptance:** Landing page 9 sektör kartı gösteriyor, müşteri `/sektor/dental` URL'inden dental firmaları filtreleyebiliyor

---

## 8. Riskler & Mitigasyon

| # | Risk | Olasılık | Etki | Mitigasyon |
|---|---|---|---|---|
| R1 | Mevcut 7141 firma migration hatası (FK violation) | Orta | Yüksek | `session_replication_role='replica'` ile FK bypass + dry-run test |
| R2 | JSONB custom fields validation bypass | Yüksek | Orta | Zod runtime schema + server-side validation |
| R3 | KVKK sağlık verisi uyumsuzluğu (yasal risk) | Düşük | **Çok Yüksek** | Hukuk danışmanı review (Sprint 4 öncesi), audit log zorunlu |
| R4 | Sektör sayısı arttıkça UI karmaşıklığı | Orta | Orta | Sector = config yaklaşımı, kod generic |
| R5 | AI prompt sector-specific az veri → kötü cevap | Orta | Orta | Few-shot examples sector başına min 5, fallback generic prompt |
| R6 | Landing page SEO kaybı (yeni URL yapısı) | Orta | Orta | 301 redirect eski beauty URL → `/sektor/beauty` |
| R7 | Capacitor APK boyutu (yeni component'ler) | Düşük | Düşük | Vite manualChunks (mevcut pattern korunur) |
| R8 | iyzico komisyon değişikliği (sektör bazlı) | Düşük | Yüksek | İyzico sözleşmesi review (Sprint 5 öncesi) |

---

## 9. Kabul Kriterleri

### 9.1 Teknik
- [ ] 9 sektör tamamen çalışır durumda (DB + API + UI)
- [ ] 7141 mevcut firma beauty primary sector olarak görünüyor
- [ ] Yeni firma multi-sector seçebiliyor
- [ ] Sector-specific metadata JSONB validation çalışıyor
- [ ] AI asistan sector-aware (sistem prompt sector parametresine göre değişiyor)
- [ ] SMS template sector-aware (NetGSM API sector parametresi alıyor)
- [ ] Landing page 9 sektör kartı gösteriyor
- [ ] APK yeni UI ile rebuild edildi, tüm sektörler test edildi
- [ ] Drizzle schema 39 tablo, tüm migration'lar çalışıyor
- [ ] Integrity check: company_sectors row count >= companies row count

### 9.2 İş
- [ ] Selim'in 7 sektör talebi karşılanmış (Wellness eklendi, 9 oldu)
- [ ] Hukuk danışmanı sağlık sektörü KVKK onayı verdi
- [ ] İyzico sektör bazlı komisyon sözleşmesi imzalandı
- [ ] Landing page müşteri geri bildirimi pozitif (en az 5 dental/plastic firma signup)

### 9.3 Zaman
- Sprint 1-6 toplam 6 hafta (1 hafta buffer)
- Her sprint sonunda demo + Selim onayı
- DB taşıma tamamlandıktan sonra başlanır (Sprint 1 öncesi prerequisite)

---

## 10. Açık Sorular (Selim ile görüşülecek)

1. **Wellness sektörü** — MVP'ye ekledim (masaj/spa), çıkaralım mı? (Selim 7 sektör dedi, Wellness eklersem 9 olur)
2. **Komisyon oranları** — Dental/Plastic/Medical için %8 mi, farklı mı? (İyzico'ya göre ayarlanacak)
3. **Sub-sector zorunlu mu** — Her firma en az 1 sub-sector seçmeli mi, yoksa boş bırakılabilir mi?
4. **Çok-dilli destek** — TR + EN yeterli mi, yoksa AR/DE eklenmeli? (Alman turizm için dental önemli)
5. **Mevcut beauty firmaları geçiş** — Hepsini otomatik beauty primary yapalım mı, yoksa onboarding'de onaylatalım mı?

---

## 11. Sonraki Adımlar

1. **Hemen (bu akşam):** DB taşıma tamamla (DB_NAME düzeltildi zaten → restart + import)
2. **Sabah:** Sprint 1 için Drizzle schema + migration hazırlığı
3. **Sprint 1 başlangıcı:** Açık sorular cevaplandıktan sonra migration yazımı

**Durum:** ✅ **Onaylandı (2026-09-26 22:33, Selim YILMAZ)** — Wellness dahil 9 sektör, Sprint 1'e geçiş onaylandı.

**Önkoşul:** DB taşıma tamamlanmalı (DB_NAME düzeltme + import_chunks.py). Selim Railway Dashboard'dan `web` service restart atmalı.

**Sprint 1 başlangıç kapsamı:**
- `src/db/schema/sectors.ts` — sectors master table
- `src/db/schema/company_sectors.ts` — many-to-many junction
- `src/db/schema/sector_templates.ts` — service templates
- `src/db/schema/sector_specialties.ts` — employee specialties
- `src/db/seed/sectors-seed.sql` — 9 sektör + service templates + 7141 firma migrate
