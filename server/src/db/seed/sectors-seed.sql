-- =============================================================================
-- Sprint 1 — Sektör master data seed
-- =============================================================================
-- Bu SQL dosyası Sprint 1 kapsamında yüklenen 4 yeni tablo için başlangıç
-- verilerini içerir:
--   1. sectors                       → 9 sektör (master data)
--   2. sector_service_templates      → ~50 hizmet şablonu (her sektör 5-10)
--   3. sector_employee_specialties   → 45 uzmanlık alanı (her sektör 5)
--   4. company_sectors               → mevcut firmaları beauty (sector_id=1)
--                                       primary olarak geriye uyumlu migrate
--
-- Kullanım:
--   psql "$DATABASE_URL" -f src/db/seed/sectors-seed.sql
-- veya
--   psql -h <host> -U <user> -d <db> -f src/db/seed/sectors-seed.sql
--
-- Idempotent: Tüm INSERT'ler ON CONFLICT DO NOTHING / DO UPDATE ile
-- tekrar tekrar çalıştırılabilir. companies tablosunda PK uyumsuzluğu
-- riski yoktur (companies.id SERIAL, FK INTEGER — bkz. schema/company_sectors.ts).
-- =============================================================================

BEGIN;

-- =========================================================================
-- 1. sectors
-- =========================================================================
-- 9 sektör: beauty, hair, barber, dental, plastic_surgery, medical,
--           veterinary, fitness, wellness
-- has_medical_consent = true olanlar: dental, plastic_surgery, medical, veterinary
-- =========================================================================

INSERT INTO sectors (id, slug, name_tr, name_en, icon, color, has_medical_consent, default_duration_minutes, commission_rate, display_order) VALUES
  (1, 'beauty',          'Güzellik Salonu',    'Beauty Salon',         '💅', '#EC4899', false, 45, 5.00,  10),
  (2, 'hair',            'Kuaför',             'Hair Salon',           '💇', '#8B5CF6', false, 60, 5.00,  20),
  (3, 'barber',          'Berber',             'Barbershop',           '✂️', '#3B82F6', false, 30, 5.00,  30),
  (4, 'dental',          'Diş Kliniği',        'Dental Clinic',        '🦷', '#06B6D4', true,  45, 10.00, 40),
  (5, 'plastic_surgery', 'Plastik Cerrahi',    'Plastic Surgery',      '🧬', '#F43F5E', true,  90, 15.00, 50),
  (6, 'medical',         'Tıp Merkezi',        'Medical Center',       '🩺', '#EF4444', true,  30, 12.00, 60),
  (7, 'veterinary',      'Veteriner',          'Veterinary Clinic',    '🐾', '#84CC16', true,  30, 10.00, 70),
  (8, 'fitness',         'Fitness & Spor',     'Fitness & Sports',     '💪', '#F97316', false, 60, 8.00,  80),
  (9, 'wellness',        'Wellness & Spa',     'Wellness & Spa',       '🧘', '#10B981', false, 90, 7.00,  90)
ON CONFLICT (id) DO UPDATE SET
  slug                    = EXCLUDED.slug,
  name_tr                 = EXCLUDED.name_tr,
  name_en                 = EXCLUDED.name_en,
  icon                    = EXCLUDED.icon,
  color                   = EXCLUDED.color,
  has_medical_consent     = EXCLUDED.has_medical_consent,
  default_duration_minutes= EXCLUDED.default_duration_minutes,
  commission_rate         = EXCLUDED.commission_rate,
  display_order           = EXCLUDED.display_order,
  is_active               = true;


-- =========================================================================
-- 2. sector_service_templates
-- =========================================================================
-- Her sektör için 5-10 örnek hizmet. Toplam 53 satır (beauty/hair daha geniş).
-- default_price TRY cinsinden (decimal(10,2)).
-- =========================================================================

-- sector_id = 1 — Beauty (10 hizmet)
INSERT INTO sector_service_templates (sector_id, name_tr, name_en, default_duration_minutes, default_price, requires_specialist, display_order) VALUES
  (1, 'Manikür',                    'Manicure',                  45,  350.00, false, 10),
  (1, 'Pedikür',                    'Pedicure',                  60,  450.00, false, 20),
  (1, 'Cila Bakımı',                'Nail Polish',               30,  200.00, false, 30),
  (1, 'Kalıcı Oje (Gel)',           'Gel Nails',                 60,  600.00, true,  40),
  (1, 'Protez Tırnak',              'Nail Extension',            90,  900.00, true,  50),
  (1, 'Kirpik Lifting',             'Eyelash Lifting',           60,  700.00, true,  60),
  (1, 'Kirpik Ekstension',          'Eyelash Extension',         90, 1200.00, true,  70),
  (1, 'Kaş Tasarımı',               'Eyebrow Design',            30,  350.00, true,  80),
  (1, 'Microblading',               'Microblading',             120, 1800.00, true,  90),
  (1, 'İpek Kirpik',                'Silk Lash',                 90, 1000.00, true, 100)
ON CONFLICT DO NOTHING;

-- sector_id = 2 — Hair (10 hizmet)
INSERT INTO sector_service_templates (sector_id, name_tr, name_en, default_duration_minutes, default_price, requires_specialist, display_order) VALUES
  (2, 'Saç Kesimi (Kadın)',         'Women Haircut',             45,  500.00, false, 10),
  (2, 'Saç Kesimi (Erkek)',         'Men Haircut',               30,  300.00, false, 20),
  (2, 'Saç Boyama',                 'Hair Coloring',             90, 1500.00, true,  30),
  (2, 'Röfle / Balyaj',             'Highlights / Balayage',    120, 2500.00, true,  40),
  (2, 'Saç Düzleştirme (Keratin)',  'Keratin Treatment',        180, 3500.00, true,  50),
  (2, 'Brezilya Fönü',              'Brazilian Blowout',        150, 3000.00, true,  60),
  (2, 'Saç Bakım Maskesi',          'Hair Mask Treatment',       45,  800.00, false, 70),
  (2, 'Maşa / Bukle',               'Curling / Ironing',         45,  600.00, false, 80),
  (2, 'Saç Ekimi Danışmanlığı',     'Hair Transplant Consult',   60,    0.00, true,  90),
  (2, 'Çocuk Saç Kesimi',           'Kids Haircut',              30,  250.00, false, 100)
ON CONFLICT DO NOTHING;

-- sector_id = 3 — Barber (5 hizmet)
INSERT INTO sector_service_templates (sector_id, name_tr, name_en, default_duration_minutes, default_price, requires_specialist, display_order) VALUES
  (3, 'Saç Kesimi',                 'Haircut',                   30,  300.00, false, 10),
  (3, 'Sakal Tıraşı',               'Beard Shave',               30,  250.00, false, 20),
  (3, 'Saç + Sakal Kombo',          'Hair + Beard Combo',        45,  500.00, false, 30),
  (3, 'Saç Yıkama + Masaj',         'Wash + Scalp Massage',      30,  200.00, false, 40),
  (3, 'Çocuk Kesimi',               'Kids Cut',                  30,  200.00, false, 50)
ON CONFLICT DO NOTHING;

-- sector_id = 4 — Dental (7 hizmet)
INSERT INTO sector_service_templates (sector_id, name_tr, name_en, default_duration_minutes, default_price, requires_specialist, display_order) VALUES
  (4, 'Diş Muayenesi',              'Dental Examination',        30,  500.00, true,  10),
  (4, 'Diş Temizliği (Detertraj)',  'Scaling & Polishing',       45, 1500.00, true,  20),
  (4, 'Diş Dolgusu',                'Dental Filling',            60, 2000.00, true,  30),
  (4, 'Kanal Tedavisi',             'Root Canal',                90, 4000.00, true,  40),
  (4, 'Diş Çekimi',                 'Tooth Extraction',          45, 1500.00, true,  50),
  (4, 'Beyazlatma',                 'Teeth Whitening',           60, 5000.00, true,  60),
  (4, 'Ortodonti Muayene',          'Orthodontic Consult',       45, 1000.00, true,  70)
ON CONFLICT DO NOTHING;

-- sector_id = 5 — Plastic Surgery (6 hizmet)
INSERT INTO sector_service_templates (sector_id, name_tr, name_en, default_duration_minutes, default_price, requires_specialist, display_order) VALUES
  (5, 'Burun Estetiği Danışmanlığı','Rhinoplasty Consult',       60, 1000.00, true, 10),
  (5, 'Botoks Uygulaması',          'Botox Injection',           30, 8000.00, true, 20),
  (5, 'Dolgu Uygulaması',           'Dermal Filler',             45, 6000.00, true, 30),
  (5, 'Liposuction Danışmanlığı',   'Liposuction Consult',       60, 1500.00, true, 40),
  (5, 'Karın Germe Danışmanlığı',   'Tummy Tuck Consult',        60, 1500.00, true, 50),
  (5, 'Yüz Germe Danışmanlığı',     'Facelift Consult',          60, 1500.00, true, 60)
ON CONFLICT DO NOTHING;

-- sector_id = 6 — Medical (5 hizmet)
INSERT INTO sector_service_templates (sector_id, name_tr, name_en, default_duration_minutes, default_price, requires_specialist, display_order) VALUES
  (6, 'Genel Muayene',              'General Check-up',          30,  800.00, true, 10),
  (6, 'Kan Tahlili',                'Blood Test',                15,  400.00, false, 20),
  (6, 'Aşılama',                    'Vaccination',               20,  500.00, true, 30),
  (6, 'EKG',                        'ECG',                       20,  600.00, true, 40),
  (6, 'Uzman Konsültasyon',         'Specialist Consultation',   45, 1500.00, true, 50)
ON CONFLICT DO NOTHING;

-- sector_id = 7 — Veterinary (5 hizmet)
INSERT INTO sector_service_templates (sector_id, name_tr, name_en, default_duration_minutes, default_price, requires_specialist, display_order) VALUES
  (7, 'Genel Muayene',              'General Check-up',          30,  600.00, true, 10),
  (7, 'Aşılama',                    'Vaccination',               20,  500.00, true, 20),
  (7, 'Kısırlaştırma',              'Sterilization',            120, 4000.00, true, 30),
  (7, 'Tırnak Kesimi',              'Nail Trimming',             20,  200.00, false, 40),
  (7, 'Diş Temizliği',              'Dental Cleaning',           45, 1500.00, true, 50)
ON CONFLICT DO NOTHING;

-- sector_id = 8 — Fitness (5 hizmet)
INSERT INTO sector_service_templates (sector_id, name_tr, name_en, default_duration_minutes, default_price, requires_specialist, display_order) VALUES
  (8, 'Personal Training',          'Personal Training',         60, 1000.00, true, 10),
  (8, 'Grup Dersi (Yoga/Pilates)',  'Group Class',               60,  300.00, true, 20),
  (8, 'Beslenme Danışmanlığı',      'Nutrition Consult',         45,  800.00, true, 30),
  (8, 'Vücut Analizi',              'Body Composition',          30,  400.00, false, 40),
  (8, 'Hamam / Sauna',              'Turkish Bath / Sauna',      60,  500.00, false, 50)
ON CONFLICT DO NOTHING;

-- sector_id = 9 — Wellness (5 hizmet)
INSERT INTO sector_service_templates (sector_id, name_tr, name_en, default_duration_minutes, default_price, requires_specialist, display_order) VALUES
  (9, 'Klasik Masaj',               'Classic Massage',           60, 1200.00, true, 10),
  (9, 'Aromaterapi Masajı',         'Aromatherapy Massage',      90, 1500.00, true, 20),
  (9, 'Taş Terapisi',               'Hot Stone Therapy',         90, 1800.00, true, 30),
  (9, 'Hamam + Kese',               'Turkish Bath + Scrub',     120, 2000.00, true, 40),
  (9, 'Solaryum',                   'Solarium',                  30,  300.00, false, 50)
ON CONFLICT DO NOTHING;


-- =========================================================================
-- 3. sector_employee_specialties
-- =========================================================================
-- Her sektör için 5 uzmanlık alanı. Toplam 45 satır.
-- Tıbbi sektörlerde requires_certification = true.
-- =========================================================================

-- Beauty (5)
INSERT INTO sector_employee_specialties (sector_id, name_tr, name_en, requires_certification, display_order) VALUES
  (1, 'Manikürist',         'Manicurist',       false, 10),
  (1, 'Pedikürist',         'Pedicurist',       false, 20),
  (1, 'Kirpik Uzmanı',      'Lash Specialist',  false, 30),
  (1, 'Kaş Uzmanı',         'Brow Specialist',  false, 40),
  (1, 'Nail Art Sanatçısı', 'Nail Artist',      false, 50)
ON CONFLICT DO NOTHING;

-- Hair (5)
INSERT INTO sector_employee_specialties (sector_id, name_tr, name_en, requires_certification, display_order) VALUES
  (2, 'Saç Stilisti',       'Hair Stylist',     false, 10),
  (2, 'Kolorist',           'Colorist',         false, 20),
  (2, 'Keratin Uzmanı',     'Keratin Expert',   false, 30),
  (2, 'Saç Ekim Uzmanı',    'Transplant Spec.', true,  40),
  (2, 'Kuaför',             'Stylist',          false, 50)
ON CONFLICT DO NOTHING;

-- Barber (5)
INSERT INTO sector_employee_specialties (sector_id, name_tr, name_en, requires_certification, display_order) VALUES
  (3, 'Berber',             'Barber',           false, 10),
  (3, 'Usta Berber',        'Master Barber',    false, 20),
  (3, 'Sakal Uzmanı',       'Beard Specialist', false, 30),
  (3, 'Saç Tasarımcısı',    'Hair Designer',    false, 40),
  (3, 'Klasik Berber',      'Classic Barber',   false, 50)
ON CONFLICT DO NOTHING;

-- Dental (5) — hepsi sertifika gerektirir
INSERT INTO sector_employee_specialties (sector_id, name_tr, name_en, requires_certification, display_order) VALUES
  (4, 'Diş Hekimi',           'Dentist',          true, 10),
  (4, 'Ortodontist',          'Orthodontist',     true, 20),
  (4, 'Periodontolog',        'Periodontist',     true, 30),
  (4, 'Endodontist',          'Endodontist',      true, 40),
  (4, 'Ağız Cerrahı',         'Oral Surgeon',     true, 50)
ON CONFLICT DO NOTHING;

-- Plastic Surgery (5)
INSERT INTO sector_employee_specialties (sector_id, name_tr, name_en, requires_certification, display_order) VALUES
  (5, 'Plastik Cerrah',       'Plastic Surgeon',  true, 10),
  (5, 'Estetik Cerrah',       'Cosmetic Surgeon', true, 20),
  (5, 'Botoks Uygulayıcısı',  'Botox Injector',   true, 30),
  (5, 'Dolgu Uzmanı',         'Filler Specialist',true, 40),
  (5, 'Medikal Estetisyen',   'Medical Esthetician', true, 50)
ON CONFLICT DO NOTHING;

-- Medical (5)
INSERT INTO sector_employee_specialties (sector_id, name_tr, name_en, requires_certification, display_order) VALUES
  (6, 'Pratisyen Hekim',      'GP',               true, 10),
  (6, 'Kardiyolog',           'Cardiologist',     true, 20),
  (6, 'Dermatolog',           'Dermatologist',    true, 30),
  (6, 'Hemşire',              'Nurse',            true, 40),
  (6, 'Diyetisyen',           'Dietitian',        true, 50)
ON CONFLICT DO NOTHING;

-- Veterinary (5)
INSERT INTO sector_employee_specialties (sector_id, name_tr, name_en, requires_certification, display_order) VALUES
  (7, 'Veteriner Hekim',      'Veterinarian',     true, 10),
  (7, 'Veteriner Cerrah',     'Vet Surgeon',      true, 20),
  (7, 'Hayvan Diş Hekimi',    'Vet Dentist',      true, 30),
  (7, 'Veteriner Teknisyeni', 'Vet Technician',   true, 40),
  (7, 'Pet Kuaför',           'Pet Groomer',      false, 50)
ON CONFLICT DO NOTHING;

-- Fitness (5)
INSERT INTO sector_employee_specialties (sector_id, name_tr, name_en, requires_certification, display_order) VALUES
  (8, 'Personal Trainer',     'Personal Trainer', false, 10),
  (8, 'Yoga Eğitmeni',        'Yoga Instructor',  false, 20),
  (8, 'Pilates Eğitmeni',     'Pilates Instructor', false, 30),
  (8, 'Beslenme Uzmanı',      'Nutritionist',     false, 40),
  (8, 'Spor Masaj Terapisti', 'Sports Massage Therapist', false, 50)
ON CONFLICT DO NOTHING;

-- Wellness (5)
INSERT INTO sector_employee_specialties (sector_id, name_tr, name_en, requires_certification, display_order) VALUES
  (9, 'Masaj Terapisti',      'Massage Therapist', false, 10),
  (9, 'Aromaterapi Uzmanı',   'Aromatherapist',    false, 20),
  (9, 'Hamam Uzmanı',         'Bath Specialist',   false, 30),
  (9, 'Refleksolog',          'Reflexologist',     false, 40),
  (9, 'SPA Terapisti',        'SPA Therapist',     false, 50)
ON CONFLICT DO NOTHING;


-- =========================================================================
-- 4. company_sectors — mevcut firmaları beauty primary olarak migrate et
-- =========================================================================
-- Sprint 1 öncesi tüm firmalar tek sektörlü (güzellik) kabul ediliyordu.
-- Bu INSERT geriye uyumluluk için mevcut her company'yi sector_id=1
-- (beauty) ile is_primary=true olarak ilişkilendirir.
--
-- FK notu: companies.id SERIAL (integer), company_sectors.company_id INTEGER
--          → tip uyumu var, uyumsuzluk yok.
--
-- ON CONFLICT DO NOTHING: aynı (company_id, sector_id) daha önce eklenmişse
--                          sessizce atla (idempotent).
-- =========================================================================

INSERT INTO company_sectors (company_id, sector_id, sub_specialty, is_primary)
SELECT c.id, 1, NULL, true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM company_sectors cs
  WHERE cs.company_id = c.id AND cs.sector_id = 1
)
ON CONFLICT DO NOTHING;

COMMIT;

-- =============================================================================
-- Doğrulama sorguları (çalıştırmak için yorumu kaldırın):
-- =============================================================================
-- SELECT COUNT(*) AS sector_count              FROM sectors;
-- SELECT COUNT(*) AS template_count            FROM sector_service_templates;
-- SELECT COUNT(*) AS specialty_count           FROM sector_employee_specialties;
-- SELECT COUNT(*) AS migrated_companies        FROM company_sectors WHERE sector_id = 1 AND is_primary = true;
-- SELECT s.slug, COUNT(c.id) AS company_count
--   FROM sectors s LEFT JOIN company_sectors cs ON cs.sector_id = s.id
--   LEFT JOIN companies c ON c.id = cs.company_id
--   GROUP BY s.slug ORDER BY s.id;
-- =============================================================================
