# Saloon — Yeniden Yapılandırma Planı

**Tarih:** 2026-10-12
**Durum:** Onaylandı (2026-10-12) — Faz 0 ve Faz 1 tamamlandı, Faz 2 başladı
**Kapsam:** Güvenlik düzeltmeleri, gereksiz kodun silinmesi, sektör-bağımsız rezervasyon modeli ve 4 ekranın yeniden düzenlenmesi.
**Kapsam dışı (sonraki aşama):** Offline çalışma. Bu planda yalnızca offline'a hazırlık yapılır.

`PLAN-SECTOR-MULTITENANT.md` bu planla sadeleştirilir; çakışan noktalarda bu doküman geçerlidir (bkz. Bölüm 9).

---

## 1. Projenin Bugünkü Durumu (Özet)

| Katman | Teknoloji | Not |
|---|---|---|
| İstemci | React 18 + Vite + Tailwind + Capacitor (Android/iOS) | Tek kod tabanı, HashRouter, ~20 sayfa |
| Sunucu | Express + TypeScript + PostgreSQL (Drizzle + ham SQL) | Railway'de çalışıyor, istemciyi de servis ediyor |
| Diğer | Redis (opsiyonel), NetGSM SMS, Firebase Admin push, SMTP | |

### Ekranların bugünkü karşılıkları

| Hedef ekran | Bugün kullanılan dosyalar | Sorun |
|---|---|---|
| 1. Müşteri (telefon) | `CustomerHome`, `BookingPage`, `MyAppointments`, `MyNotifications`, `CustomerLogin` | Tamamen kuaför/berber dili, cinsiyet ana filtre, rezervasyon personel zorunlu |
| 2. Firma kullanıcısı (telefon) | `Dashboard` (firma kısmı) + `AppointmentManagement` + `CompanyPanel` + `StaffPanel` + `ServiceManagement` + `Inventory` | Aynı iş 3-4 farklı yerde; randevu onayı `CompanyPanel`'de yok, `AppointmentManagement`'ta |
| 3. Firma dashboard (ekran/TV) | `SalonBoard` (1809 satır) | "Offline" kalıntıları var ama offline hiç çalışmıyor; personel modunda otomatik yenileme yok; masraflar ilk açılışta yüklenmiyor |
| 4. Admin (firma tanımlama) | `Dashboard` (süper admin kısmı) + `CompanyList/Form/Detail` + `MainCompanyPanel` | `Dashboard` iki rolü birden taşıyor; 3 ayrı firma keşif sistemi (OSM, Overpass, Google/Yandex) iç içe |

### Kritik teknik bulgular

- **Rezervasyon modeli personel merkezli.** Kaynak (saha, kulvar, oda) ve kapasite (grup dersi) kavramı yok. Halı saha, havuz, pilates bugünkü modelle doğru çalışamaz.
- **4 paralel migration mekanizması** var (`db/migrate.ts`, Drizzle, `database/schema.sql`, `scripts/migration_v2.js`) + route içinde tablo oluşturan kodlar. Canlı şema ile Drizzle şeması arasında ciddi fark var. Yeni sektör tabloları (`0001_sprint1_sectors.sql`) canlıya hiç uygulanmıyor.
- **API sözleşme hataları:** Personel API'si `userId/firstName` döndürüyor, müşteri ekranı `id/first_name` bekliyor; rezervasyon `service_id` gönderiyor, sunucu `id` okuyor; `PATCH /appointments/:id/rate` rotası yok.
- **Ölü kod:** `cron.service.ts` hiç başlatılmıyor; `CustomerHome` içindeki QR ve "kayıtlı değil" modalları açılamıyor; Android'de `AIAssistant` native eklentisi yok, JS tarafı boşuna çağırıyor; `CompanyList`'teki `/salon-generator` linki olmayan bir sayfaya gidiyor.

---

## 2. Verilen Kararlar

| Konu | Karar |
|---|---|
| Yapay zeka çağrı asistanı (Whisper, NLP, AIAdminPanel) | **Tamamen silinecek** |
| Stok / envanter | **Silinecek** |
| CRM + otomasyon kuralları + cron | **Silinecek** |
| Hizmet paketleri | **Silinecek** |
| iyzico online ödeme | **Silinecek** |
| E-fatura / XSLT | **Korunacak** (dosyalar sunucu altına taşınacak) |
| Ana firma / zincir şube raporları | **Korunacak** (sabit kod kaldırılıp gerçek yetkiyle korunacak) |
| `CabaniFiyat` (C# WinForms) | **Repodan çıkarılıp ayrı klasöre/repoya taşınacak** |
| Kaynak + kapasite modeli | **Bu planda yapılacak** |
| Firma keşfi (Google Maps / Yandex / OSM toplu içe aktarma) | **Silinecek** — adres seçimi ve harita üzerinde konum işaretleme korunur |
| Offline | **Sonraki aşama** — bu planda sadece veri erişim katmanı hazırlanır |
| Marka adı | **Saloon** kalıyor. Uygulama içindeki "Salon Cebinde" yazıları "Saloon" olur; paket adı (`com.saloncebinde.app`) değişmez |
| Online ödeme | iyzico tanımlı değil, silinir. İleride **PayTR** ile başlanır (Faz 7) |
| Tahsilat kaydı | **Tutulacak** — randevu tamamlanınca nakit / kart / havale seçimiyle |
| Üyelik / ders kartı (örn. 10 derslik pilates) | **İstenecek** — Faz 7'de, rezervasyon modeli oturduktan sonra |
| Sağlık sektörü | İlk sürümde sadece randevu; **tıbbi kayıt tutulmaz** |

---

## 3. Faz 0 — Acil Güvenlik (ilk iş, 1 gün)

Bu maddeler canlıda açık durumda. Diğer her şeyden önce yapılmalı.

1. **`/api/_admin-reset` uç noktasını sil** (`server/src/routes/admin-reset.routes.ts` + `registry.ts` satır 103). Kimlik doğrulaması yok; e-postayı bilen herkes herhangi bir kullanıcının şifresini değiştirip yeni şifreyi cevapta alabiliyor.
2. **`db/migrate.ts` içindeki süper admin şifre sıfırlamasını kaldır.** Sunucu her açıldığında süper admin şifresini repoda yazılı bir şifreye geri çekiyor. `server/database/seed_super_admin.sql` içindeki düz metin şifreyi sil.
3. **`/api/setup` rotasını sil** (sabit sorgu anahtarıyla şema SQL'i çalıştırıyor).
4. **`admin.routes.ts` içindeki ham SQL / truncate / import uç noktalarını sil** (JWT kontrolünden önce, sadece `IMPORT_SECRET` ile korunuyor).
5. **`test-exec-sql.js` dosyasını sil** ve içindeki yetki bilgisini (IMPORT_SECRET vb.) Railway'de **değiştir**.
6. **`996633` sabit kodunu** `MainCompanyPanel.tsx` ve `company.routes.ts` (`/check-code`) içinden kaldır.
7. **Kimlik doğrulaması olmayan yazma işlemlerine yetki ekle:** firma silme, personel ekle/güncelle/sil/fotoğraf, randevu durum güncelleme, SMS ayar/gönderim, ana firma CRUD, sektör atama (firma sahipliği kontrolü).
8. Süper admin şifresini değiştir; db dump dosyaları müşteri verisi içerdiği için repodan/diskten güvenli şekilde kaldır.

**Kabul:** Bu uç noktalar 404 dönüyor; yetkisiz istekler 401/403 alıyor; sunucu yeniden başlatıldığında admin şifresi değişmiyor.

**Durum (2026-10-12):** Tamamlandı ve canlıda doğrulandı (commit `747794f`). Süper admin şifreleri değiştirildi, Railway'den `IMPORT_SECRET` silindi. Ek olarak bulunup kapatılanlar: `/api/auth/update-company` (herkes kendini istediği firmaya bağlayabiliyordu), başka firmanın hizmetini güncelleme/silme, departman ekleme/silme, `/companies/debug/callback-logs`, `verify-test` uç noktaları, personel için sabit "123456" şifresi.
Yeni ortak kontrol: `companyAuth` (JWT veya tablet için `X-Board-Key`), `requireCompanyAccess`, `canAccessCompany` (`server/src/middleware/auth.middleware.ts`).
Elle yapılacaklar: deploy sonrası süper admin şifresini `server/scripts/reset-admin-password.ts` ile değiştirmek; Railway'den `IMPORT_SECRET` değişkenini silmek; boş kurulum için `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` tanımlamak.

---

## 4. Faz 1 — Repo Temizliği (0,5 gün)

### Silinecek (kökte)
- Loglar: `logs.txt`, `import-log*.txt`, `cap-sync.log`, `client-build-final.log`, `frontend-build.log`, `generate.log`, `gh-pages-deploy.log`, `gradle-build*.log`
- Doğrulama/debug artıkları: `verify-page*.html`, `verify-bundle.js`, `verify-output.json`, `req-body.json`, `test-exec-sql.js`
- Taşıma artıkları: `db-dump.json`, `db-dump-part1.json`, `db-dump-part2.json`, `import_chunks.py`, `split_dump.py`, `__pycache__/`, `set-db-reference.ps1`
- `.trash-*` klasörlerinin tamamı (6 adet)
- `scripts/supabase-transfer.ts` ve `server/scripts/supabase-transfer.ts` (birebir aynı; Supabase taşıması bitti)
- `seed-atlasplan-categories.sql` (referansı yok; gerekiyorsa sektör seed'ine taşınır)

### Taşınacak / düzeltilecek
- `CabaniFiyat/` → repo dışına (örn. `D:\CabaniFiyat`)
- `xslt/` → `server/src/resources/xslt/` (bugün `process.cwd()/../xslt` ile aranıyor, deploy düzenine bağımlı)
- `client/public/Saloon.apk` (12,9 MB, git'te) → git'ten çıkar, GitHub Release / artifact olarak dağıt
- `client/.github/workflows/build-apk.yml` → sil (GitHub bu konumu okumaz, kökteki ile aynı)
- `render.yaml`, `Procfile` → sil (Railway kullanılıyor); `deploy-frontend.yml` (GitHub Pages) → sil veya Railway'e göre güncelle
- `client/deploy-ftp.js` → sil
- `docker-compose.yml` → sadece yerel geliştirme için kalsın, eski `schema.sql` yerine Drizzle migration'ı kullansın

### Dokümanlar
- `DEVELOPMENT.md`, `QUICKSTART.md`, `SETUP.md` → tek bir güncel `README.md` içinde birleştir (Railway + Capacitor + migration komutları). Eski admin şifreleri ve eski fazlar silinir.

### `.gitignore` eklemeleri
`__pycache__/`, `*.pyc`, `db-dump*.json`, `import-log*.txt`, `*.log`, `verify-*`, `bin/`, `obj/`, `temp_audio/`, `.cache/`

### Bağımlılıklar
- Kök `package.json`: `iyzipay`, `basic-ftp` kaldır
- İstemci: `firebase` (hiç import yok), `basic-ftp`, `dotenv`, `gh-pages` kaldır; `@capacitor/cli` → devDependencies
- Sunucu: `cron` (kullanılmıyor, `node-cron` var — o da Faz 2'de gidiyor), `@types/*`, `tsx`, `typescript` → devDependencies

**Durum (2026-10-12):** Tamamlandı. XSLT dosyaları `server/resources/xslt/` altına taşındı. Dump ve taşıma artıkları `D:\Saloon-arsiv`, `CabaniFiyat` `D:\CabaniFiyat` klasörüne alındı. APK workflow'u artık sadece elle tetikleniyor. Sunucu bağımlılık temizliği, modüller silinirken Faz 2'de yapılacak.

**Sonraya kalan notlar:**
- `railway.toml` (config-as-code) 2026-12-01'den sonra desteklenmiyor; `railway config migrate` ile taşınmalı.
- `saloncebinde.com` SSL sertifikası geçersiz, personel SMS linkleri oraya gidiyor (`company.routes.ts`, `company.service.ts`). Faz 5'te ayarlanabilir uygulama adresine (`APP_URL`) bağlanacak.
- Railway'deki `GOOGLE_MAPS_API_KEY` değişkeni Faz 2.1 ile birlikte silinecek.

---

## 5. Faz 2 — Gereksiz Modüllerin Silinmesi (2 gün)

Her modül ayrı commit olarak silinir; her commit sonrası `tsc`, test ve build çalıştırılır.

### 5.1 Firma keşfi (Google / Yandex / OSM)
- **Sunucu:** `services/google-maps.service.ts`, `services/yandex-maps.service.ts`, `routes/maps.routes.ts`, `routes/generator.routes.ts`, `jobs/import-osm.ts`, `scripts/import-osm.ts`, `scripts/test-osm.mjs`, `admin.routes.ts` içindeki OSM / şehir temizleme / import durumu uç noktaları, `data/turkiye-*.ts` (4 dosya, sadece bu kodlar kullanıyor), `osm_import_progress` tablosu, `GOOGLE_MAPS_API_KEY` / `YANDEX_MAPS_API_KEY`
- **İstemci:** `Dashboard.tsx` içindeki "Lead Hunter" bölümü, `CompanyForm.tsx` içindeki Google/Yandex hızlı içe aktarma, `CompanyList.tsx` içindeki "Salon Yakala" linki
- **Korunur:** `address.routes.ts` + `address.service.ts` (il/ilçe/mahalle seçimi), Leaflet ile konum işaretleme, enlem/boylam, müşteri tarafında yakındaki firmalar ve yol tarifi

### 5.2 Yapay zeka çağrı asistanı
- **Sunucu:** `routes/ai.routes.ts`, `services/ai-assistant.service.ts`, `services/local-nlp.service.ts`, `services/local-stt.service.ts`, `db/schema/ai.ts`, ilgili bağımlılıklar (`@xenova/transformers`, ffmpeg paketleri, `wavefile`, `openai`)
- **İstemci:** `pages/AIAdminPanel.tsx`, `lib/aiParser.ts`, `App.tsx` içindeki `AIAssistant` eklenti çağrıları ve AI onay modalı, `CompanyPanel/index.tsx` içindeki ikinci AI başlatma, `Dashboard.tsx` içindeki sesli randevu
- **Veritabanı:** AI tabloları (yedek alındıktan sonra)

### 5.3 Stok / envanter
- `components/InventoryTab.tsx`, `pages/Inventory.tsx`, `routes/inventory.routes.ts`, `db/schema/inventory.ts`, `ServiceManagement`/`ServicesTab` içindeki malzeme bağlantıları

### 5.4 CRM + otomasyon
- `CompanyPanel/CRMTab.tsx`, `services/automation.service.ts`, `services/cron.service.ts` (zaten hiç çalışmıyor), otomasyon rotaları, `node-cron`
- Not: Müşteri listesi (randevu geçmişinden) firma kullanıcısı ekranında basit bir "Müşteriler" görünümü olarak kalabilir — CRM değil, salt okunur liste.

### 5.5 Hizmet paketleri
- `routes/package.routes.ts`, `services/package.service.ts`, `packages` / `package_services` tabloları, `BookingPage` ve `ServicesTab` içindeki paket akışları

### 5.6 iyzico online ödeme
- `routes/payment.routes.ts`, `services/payment.service.ts`, `services/iyzico.service.ts`, `types/iyzipay.d.ts`, `MyAppointments` içindeki "öde" butonu
- **Dikkat:** Lisans yenileme ödemesi de iyzico üzerinden. Silindikten sonra PayTR gelene kadar lisans süresi admin ekranından elle uzatılır.
- **Korunur:** Firma içi tahsilat kaydı (randevu tamamlandığında nakit / kart / havale olarak "ödendi" işaretleme) — raporlardaki ciro buna dayanır, online ödeme değil.

### 5.7 Diğer ölü kod
- `StaffPanel.tsx` (hiçbir yerden link yok, `Dashboard` + randevular ekranı kapsıyor)
- `ServiceManagement.tsx` (`ServicesTab` ile aynı işi yapıyor, sahte silme butonu var)
- `CustomerHome` içindeki açılamayan QR / "kayıtlı değil" modalları ve tarayıcı kodu
- `BookingPage` içindeki "Sistemi Sıfırla" butonu (tüm localStorage'ı siliyor)
- `trigger.ts`, `.deploy-trigger`, debug `console.log`'lar, `void x` ile susturulmuş kullanılmayan değişkenler

**Kabul:** `tsc --noEmit` temiz, testler geçiyor, istemci build boyutu düşmüş, sunucu açılışında model indirmiyor.

---

## 6. Faz 3 — Veri Katmanını Tek Kaynağa İndirme (2 gün)

1. Canlı Railway şemasını `drizzle-kit introspect` ile çek; Drizzle şemasını canlıya göre düzelt (tip farkları: `slot_interval`, `working_hours.day_of_week`, `rating`, saat dilimi vb.).
2. **Drizzle migration'ları tek otorite olsun.** Sunucu, migration'ları **port dinlemeye başlamadan önce** çalıştırsın.
3. `db/migrate.ts` içindeki gerekli kısımları Drizzle migration'larına taşı, sonra dosyayı sil. `database/schema.sql`, `scripts/migrate.js`, `scripts/migration_v2.js`, `scripts/seed-admin.js`, `scripts/generate-admin-hash.js` silinir.
4. Route/servis içinde tablo oluşturan kodları kaldır (`expense.routes.ts` içindeki `expenses`, `payment.service.ts`, `company.service.ts`, finans kodu). `expenses` tablosu Drizzle şemasına eklenir.
5. Silinen modüllerin tabloları ayrı bir "drop" migration'ıyla kaldırılır (öncesinde `pg_dump` yedeği).
6. İki ayrı PostgreSQL pool'u (`config/database.ts` ve `db/index.ts`) teke indirilir.
7. Sektör seed'i (`sectors-seed.sql`) migration'a dahil edilir; bugünkü haliyle canlıya hiç uygulanmıyor.
8. İlk süper admin, migration ile değil, tek seferlik bir CLI komutuyla (env'den şifre okuyarak) oluşturulur.

**Kabul:** Boş bir veritabanında `npm run migrate` tüm şemayı kuruyor; canlıda migration "değişiklik yok" diyor; repoda başka şema yazan kod kalmıyor.

---

## 7. Faz 4 — Sektör-Bağımsız Rezervasyon Modeli (4-5 gün)

### 7.1 Üç rezervasyon tipi

Her **hizmet** bir rezervasyon tipi taşır. Firma sektörü sadece varsayılanları ve dili belirler; davranışı hizmet belirler.

| Tip | Ne rezerve edilir | Örnek sektörler | Çakışma kuralı |
|---|---|---|---|
| `staff` | Bir çalışanın zamanı | Kuaför, berber, masaj, ayak sağlığı, doktor, diş | Aynı çalışan aynı anda 1 randevu |
| `resource` | Bir kaynağın zamanı (saha, kulvar, oda, kabin) | Halı saha, havuz kulvarı, masaj odası, tenis kortu | Aynı kaynak aynı anda 1 rezervasyon |
| `class` | Planlanmış bir seansta yer | Pilates grup dersi, yüzme kursu, yoga | Seans kapasitesi dolana kadar N kişi |

Masaj gibi hem çalışan hem oda gerektiren durumlar için hizmet, `staff` tipinde olup opsiyonel olarak bir kaynak türü de isteyebilir (`requires_resource_type`). İlk sürümde bu opsiyonel tutulur.

### 7.2 Şema değişiklikleri

```sql
-- Kaynaklar (saha, kulvar, oda...)
CREATE TABLE resources (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,          -- "Saha 1", "Kulvar 3", "Oda A"
  resource_type VARCHAR(50) NOT NULL,  -- 'pitch', 'lane', 'room', 'court', 'chair'
  capacity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0
);

-- Hangi hizmet hangi kaynaklarda verilebilir
CREATE TABLE service_resources (
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, resource_id)
);

-- Grup dersi seansları
CREATE TABLE class_sessions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id),
  staff_id INTEGER REFERENCES users(id),      -- eğitmen (opsiyonel)
  resource_id INTEGER REFERENCES resources(id), -- salon/stüdyo (opsiyonel)
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL,
  recurrence_rule TEXT                         -- haftalık tekrar (opsiyonel)
);

ALTER TABLE services ADD COLUMN booking_mode VARCHAR(10) NOT NULL DEFAULT 'staff'; -- staff|resource|class
ALTER TABLE services ADD COLUMN duration_options INTEGER[];  -- örn. halı saha {60,90,120}
ALTER TABLE appointments ADD COLUMN resource_id INTEGER REFERENCES resources(id);
ALTER TABLE appointments ADD COLUMN class_session_id INTEGER REFERENCES class_sessions(id);
ALTER TABLE appointments ADD COLUMN party_size INTEGER DEFAULT 1;
```

Mevcut tüm hizmetler `booking_mode = 'staff'` olarak kalır → mevcut kuaför verisi etkilenmez.

### 7.3 Sunucu tarafında tek müsaitlik servisi

Bugün müsait saatler **istemcide** hesaplanıyor (`BookingPage` 60 günlük randevuyu indirip kendisi hesaplıyor). Yeni yapı:

- `GET /api/availability?company_id&service_id&date[&staff_id|resource_id][&duration]` → boş slotlar
- `GET /api/class-sessions?company_id&from&to` → seanslar + kalan yer
- `POST /api/appointments` sunucuda tekrar çakışma/kapasite kontrolü yapar (transaction + kilit), istemciye güvenmez.

Bu, müşteri ekranını basitleştirir ve offline aşamasında da tek doğrulama noktası olur.

### 7.4 Sektör kataloğu güncellemesi

Mevcut 9 sektöre ek/değişiklik:

| Slug | İsim | Varsayılan rezervasyon tipi |
|---|---|---|
| `beauty`, `hair`, `barber` | Güzellik / Kuaför / Berber | staff |
| `massage_spa` | Masaj / Spa | staff (+ opsiyonel oda) |
| `pilates_yoga` | Pilates / Yoga Stüdyosu | class (+ birebir için staff) |
| `fitness` | Fitness / PT | staff |
| `pool` | Havuz / Yüzme | resource (kulvar) + class (kurs) |
| `sports_facility` | Halı Saha / Kort / Spor Tesisi | resource |
| `podiatry` | Ayak Sağlığı / Podoloji | staff |
| `medical`, `dental`, `physio` | Klinik / Diş / Fizyoterapi | staff |
| `veterinary` | Veteriner | staff |

Sektör seçildiğinde firmaya hazır hizmet şablonları ve (resource sektörlerinde) örnek kaynaklar önerilir.

### 7.5 Bu fazda düzeltilecek API hataları
- Personel API'si tek bir biçimde (`id`, `first_name`, `last_name`) dönsün
- Rezervasyon `services: [{ service_id, staff_id }]` biçimi sunucuyla eşleşsin
- `PATCH /appointments/:id/rate` eklensin (veya puanlama kaldırılsın)
- Personel olmadan randevu kabul edilip çakışma kontrolü atlanması düzeltilsin

**Kabul:** Bir kuaför (staff), bir halı saha (resource, 60/90/120 dk) ve bir pilates stüdyosu (class, 8 kişilik seans) aynı sistemde uçtan uca randevu alabiliyor; aynı slot iki kez satılamıyor.

---

## 8. Faz 5 — Ekranların Yeniden Düzenlenmesi (6-8 gün)

### Ortak: tasarım sistemi ve marka
- Marka **Saloon**. "Salon Cebinde" yazıları "Saloon" olur; pembe tema, ✂️ ikonları, `ekuafor_*` / `salon_*` localStorage anahtarları kaldırılır. Nötr bir ana renk + sektör rengi vurgu olarak kullanılır.
- Ortak bileşenler: `Button`, `Card`, `BottomNav`, `Sheet` (mobil alt panel), `EmptyState`, `StatusBadge`, `SectorIcon`. Bugün her sayfa kendi Tailwind kopyasını taşıyor.
- Etiketler sektöre göre değişir (`lib/sectors.ts` üzerinden): "Personel" → "Uzman / Eğitmen / Doktor", "Hizmet" → "Hizmet / Ders / Saha" vb.
- **Offline hazırlığı:** Tüm API çağrıları sayfalardan çıkarılıp `client/src/api/` altında modül bazlı fonksiyonlara (`appointmentsApi`, `companiesApi`...) toplanır. Offline aşamasında sadece bu katman değişecek.

### 8.1 Ekran 1 — Müşteri (telefon öncelikli)

**Akış:** Ana sayfa → Firma → Rezervasyon → Randevularım

- **Ana sayfa:** Üstte sektör kartları (yatay kaydırılabilir), arama çubuğu ("Ne arıyorsun? Pilates, halı saha, kuaför..."), konuma göre yakındaki firmalar. Cinsiyet filtresi ana filtre olmaktan çıkar, sadece ilgili sektörlerde opsiyonel kalır.
- **Firma sayfası:** Sektör rozeti, hizmetler, ekip/kaynaklar, yorumlar, yol tarifi (Google Maps'e bağlı değil; cihazın harita uygulamasını açan genel link).
- **Rezervasyon sihirbazı** hizmetin tipine göre adım değiştirir:
  - `staff`: Hizmet → Uzman (veya "fark etmez") → Gün → Saat → Onay
  - `resource`: Hizmet → Süre (60/90/120) → Gün → Saat → (Kaynak otomatik / seçilebilir) → Onay
  - `class`: Ders → Haftalık takvimden seans (kalan yer gösterilir) → Kişi sayısı → Onay
- **Randevularım / Bildirimler:** Mevcut mantık korunur; ödeme butonu kalkar.
- Sunucu: `GET /companies` sektör filtresi + sayfalama alır, liste cevabında birincil sektör döner.
- `LandingPage` (web): sektörlere göre genel tanıtım, firma başvurusunda sektör seçimi.
- `KvkkPage` ve OTP SMS metinleri: "güzellik salonu/kuaför" yerine genel randevu platformu dili.

### 8.2 Ekran 2 — Firma kullanıcısı (telefon öncelikli)

Tek bir giriş (JWT), tek bir uygulama kabuğu, alt menüde 4 sekme. `CompanyPanel`'in ayrı `admin_key` kapısı kaldırılır; yetki rolden gelir (`company_admin` her şeyi, `staff` kendi randevularını ve kendi raporunu görür).

| Sekme | İçerik | Kaynak alınan mevcut kod |
|---|---|---|
| **Randevular** | Bekleyenler en üstte, büyük Onayla / Reddet butonları; altında bugünün zaman çizelgesi; tamamla + tahsilat (nakit / kart / havale) | `AppointmentManagement` |
| **Masraf** | Tutar, kategori, açıklama, fiş fotoğrafı (opsiyonel OCR); son masraflar listesi | `Dashboard` masraf bölümü, `/expenses` API |
| **Raporlar** | Gün/hafta/ay; randevu sayısı, ciro, masraf, net; personel bazında kırılım | `Dashboard` + `report.service` |
| **Daha fazla** | Firma profili + sektör, hizmetler (rezervasyon tipiyle), personel, **kaynaklar**, **ders seansları**, çalışma saatleri, SMS ayarları, e-fatura | `CompanyPanel` sekmeleri (`ProfileTab`, `ServicesTab`, `StaffTab`, `FinanceTab`), `SmsSettings` |

- `CompanyPanel/index.tsx` (1731 satır), `Dashboard.tsx`'in firma kısmı ve `AppointmentManagement.tsx` (1769 satır) bu yeni kabuğa dağıtılıp silinir.
- `FinanceTab` (1627 satır) içinden e-fatura korunur; "hazırlanıyor" yazan boş rapor sayfaları silinir.
- Gereksiz `window.location.reload()` çağrıları kaldırılır.

### 8.3 Ekran 3 — Firma Dashboard (tablet / TV, şık ve modern)

`SalonBoard` → `Board` olarak yeniden yazılır. Amaç: tüm çalışanların (veya kaynakların) günü tek bakışta.

- **Sütunlar:** Firmanın tipine göre çalışanlar ve/veya kaynaklar (Saha 1, Saha 2...). Grup dersleri ayrı bir şerit olarak.
- **Satırlar:** Zaman çizelgesi, şu anki saat çizgisi, durum renkleri (bekliyor / onaylı / devam ediyor / tamamlandı).
- **Yan panel:** Bekleyen talepler (onay/red), günün özeti (randevu, ciro).
- **Hızlı işlemler:** Boş hücreye dokun → hızlı randevu; randevuya dokun → durum değiştir / tahsilat.
- **Veri:** Tek bir `useBoardData` hook'u; 30 sn otomatik yenileme her modda çalışır (bugün personel modunda çalışmıyor), sekme gizliyken durur, hata durumunda üstte "bağlantı yok" şeridi gösterilir.
- **Temizlik:** `is_local` / `is_updated_locally` kalıntıları, `index.html` içindeki her açılışta service worker silen script, `public/sw.js`, `public/clear-cache.html` kaldırılır (offline aşamasında doğru bir service worker yazılacak).
- **Giriş:** Board anahtarı korunur (TV'de şifre yazmak zor) ama sunucu, anahtardan kısa ömürlü, sadece okuma + randevu durum güncelleme yetkili bir token üretir. `Login.tsx` içindeki bozuk board girişi (`key` ↔ `board_key` uyuşmazlığı) kaldırılır; board girişi sadece `/board` üzerinden yapılır.

### 8.4 Ekran 4 — Admin (firma tanımlama)

- `Dashboard.tsx`'in süper admin kısmı ayrı bir `admin/AdminHome` sayfasına taşınır: firma sayısı, sektör dağılımı, lisansı biten firmalar, son kayıtlar.
- **Firma tanımlama sihirbazı** (`CompanyForm` sadeleşir):
  1. Temel bilgiler (ad, telefon, e-posta, web)
  2. **Sektör** (çoklu seçim + birincil) — `SectorSelector` bileşeni burada kullanılır
  3. Adres: il/ilçe/mahalle + haritada konum işaretleme (keşif/içe aktarma yok)
  4. Çalışma saatleri ve slot aralığı
  5. Sektör şablonundan hizmetler + (gerekiyorsa) kaynaklar
  6. Yönetici kullanıcı ve davet (SMS/e-posta ile şifre belirleme linki)
  7. Lisans ve fatura bilgileri (IBAN alanı `iban` / `bank_iban` uyuşmazlığı giderilir)
- `CompanyList`: sektör ve şehir filtresi, arama, sayfalama.
- **Ana firma / zincir yönetimi** admin menüsü altına alınır; `996633` ve localStorage kod kapısı yerine süper admin veya zincir sahibi rolüyle erişilir. Ana firma rotalarına sunucuda yetki eklenir.
- İstemci rotaları role göre korunur (bugün giriş yapan her rol firma CRUD sayfalarına gidebiliyor).

---

## 9. `PLAN-SECTOR-MULTITENANT.md` ile İlişki

O doküman korunur ama şu maddeler **iptal / ertelenir:**

| Madde | Durum | Sebep |
|---|---|---|
| `sector_ai_prompts` | İptal | AI modülü silindi |
| Sektöre göre komisyon (`commission_rate`) | İptal | Online ödeme silindi |
| `customer_medical_history` + tıbbi kayıt | Ertelenir | Sağlık verisi KVKK özel nitelikli; hukuki onay olmadan saklanmamalı. İlk sürümde sağlık firmaları sadece randevu alır, tıbbi veri tutulmaz. |
| `sector_sms_templates`, `sector_kvkk_disclosures` tabloları | Sadeleşir | İlk sürümde `lib/sectors.ts` + sunucu tarafı sabit şablonlar yeterli |
| `sectors`, `company_sectors`, `sector_service_templates`, `sector_employee_specialties` | Devam | Faz 3'te migration'a alınır, Faz 4'te genişletilir |

---

## 10. Faz 6 — Offline İçin Hazırlık (bu planda sadece altyapı)

Offline'ın kendisi sonraki aşamada planlanacak. Bu planda yapılanlar onu kolaylaştırır:

- Tüm API çağrıları tek bir `client/src/api/` katmanında (Faz 5)
- Müsaitlik ve çakışma kontrolü sunucuda tek yerde (Faz 4) → offline'da yapılan randevular senkronda doğrulanabilir
- Randevu oluşturmaya **idempotency anahtarı** (`client_request_id`) eklenir → aynı istek iki kez gelirse tek kayıt oluşur
- Kayıtlara `updated_at` her yerde tutulur → çakışma çözümü için temel
- Board ekranı tek bir veri hook'undan beslenir → ileride IndexedDB önbelleği bu hook'un arkasına eklenir

---

## 10b. Faz 7 — Üyelik ve PayTR (ekranlar oturduktan sonra)

### Üyelik / ders kartı
Silinen "hizmet paketleri" yerine, ders tipi sektörler için daha doğru bir model:

```sql
CREATE TABLE membership_plans (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,          -- "10 Derslik Pilates Kartı", "Aylık Sınırsız"
  credits INTEGER,                     -- NULL = sınırsız
  valid_days INTEGER NOT NULL,         -- 30, 60, 90
  price DECIMAL(10,2) NOT NULL,
  service_ids INTEGER[]                -- hangi derslerde geçerli
);

CREATE TABLE customer_memberships (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES membership_plans(id),
  customer_id INTEGER NOT NULL REFERENCES users(id),
  remaining_credits INTEGER,
  starts_at DATE NOT NULL,
  expires_at DATE NOT NULL
);

ALTER TABLE appointments ADD COLUMN membership_id INTEGER REFERENCES customer_memberships(id);
```

- Firma kullanıcısı üyeliği elle satar (tahsilat kaydıyla); müşteri derse kayıt olurken kartından 1 kredi düşer, iptalde geri yüklenir.
- Müşteri ekranında "Üyeliklerim" bölümü: kalan ders, bitiş tarihi.

### PayTR
- Ödeme sağlayıcısı tek bir arayüz arkasında yazılır (`PaymentProvider`), ilk uygulama PayTR (iFrame API + callback doğrulama).
- İlk kullanım: firma lisans ödemesi. İkinci adım: müşterinin online randevu / üyelik ödemesi.
- PayTR mağaza bilgileri (merchant id / key / salt) sadece sunucu ortam değişkenlerinde tutulur.

---

## 11. Sıralama ve Süre Tahmini

| Faz | İş | Tahmini süre | Bağımlılık |
|---|---|---|---|
| 0 | Acil güvenlik | 1 gün | — |
| 1 | Repo temizliği | 0,5 gün | — |
| 2 | Modül silme | 2 gün | Faz 0 |
| 3 | Tek migration kaynağı | 2 gün | Faz 2 |
| 4 | Rezervasyon modeli (staff / resource / class) | 4-5 gün | Faz 3 |
| 5.1 | Müşteri ekranı | 2 gün | Faz 4 |
| 5.2 | Firma kullanıcısı ekranı | 2-3 gün | Faz 4 |
| 5.3 | Board ekranı | 1,5 gün | Faz 4 |
| 5.4 | Admin ekranı | 1,5 gün | Faz 3 |
| 6 | Offline hazırlık | Faz 4-5 içinde | — |
| 7 | Üyelik + PayTR | 3-4 gün | Faz 4, 5 |

**Toplam:** Faz 0-6 yaklaşık 17-20 iş günü, Faz 7 ile 20-24 iş günü. Her faz sonunda çalışan bir build ve kısa demo hedeflenir.

Her fazda doğrulama: `npm run typecheck`, `npm test` (istemci + sunucu), istemci build, sunucunun boş veritabanında migration ile ayağa kalkması, kritik akışların elle denenmesi (müşteri randevusu, firma onayı, board görünümü, admin firma oluşturma).

---

## 12. Cevaplanan Sorular (2026-10-12)

1. **Marka adı:** Saloon kalıyor.
2. **Lisans ödemesi:** iyzico tanımlı değil; PayTR ile başlanacak (Faz 7). O zamana kadar admin elle uzatır.
3. **Tahsilat kaydı:** Tutulacak.
4. **Üyelik / ders kartı:** İstenecek (Faz 7).
5. **Sağlık sektörü:** Sadece randevu, tıbbi kayıt yok.
