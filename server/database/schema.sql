-- Saloon Randevu Sistemi Veritabanı Şeması

-- Kullanıcı Rolleri (Eğer yoksa oluştur)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'company_admin', 'customer');
    END IF;
END$$;

-- Kullanıcılar Tablosu
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    company_id INTEGER, -- Hangi firmaya ait olduğu
    board_code VARCHAR(20) UNIQUE, -- Personel board giriş kodu
    gender VARCHAR(10), -- cinsiyet
    department_id INTEGER, -- departman (silinirse NULL olur)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Firmalar Tablosu
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Adres Bilgileri
    address_line TEXT,
    province_id INTEGER,
    province_name VARCHAR(100),
    district_id INTEGER,
    district_name VARCHAR(100),
    neighborhood_id INTEGER,
    neighborhood_name VARCHAR(100),
    street_name VARCHAR(100),
    building_no VARCHAR(20),
    apartment_no VARCHAR(20),
    postal_code VARCHAR(10),
    
    -- Konum Bilgileri
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Banka Bilgileri
    bank_name VARCHAR(255),
    bank_branch VARCHAR(255),
    iban VARCHAR(34),
    account_holder_name VARCHAR(255),
    
    -- Vergi Bilgileri
    tax_number VARCHAR(20),
    tax_office VARCHAR(100),

    -- Çalışma Saatleri (Genel)
    work_start_time VARCHAR(10) DEFAULT '08:00',
    work_end_time VARCHAR(10) DEFAULT '20:00',
    slot_interval INTEGER DEFAULT 30, -- Dakika cinsinden randevu aralığı
    
    -- Hizmet Verilen Cinsiyetler
    genders TEXT[],
    
    -- Ödeme Ayarları
    commission_rate DECIMAL(5, 2) DEFAULT 0.00,
    payment_enabled BOOLEAN DEFAULT false,
    
    -- Durum
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    -- Zaman Damgaları
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Admin İlişkisi
    created_by INTEGER REFERENCES users(id),
    admin_key VARCHAR(20) UNIQUE, -- Firma yönetim paneli anahtarı
    board_key VARCHAR(20) UNIQUE, -- Salon board anahtarı
    company_type VARCHAR(20) DEFAULT 'ASIL', -- 'ÜST FİRMA', 'ASIL', 'ŞUBE'
    main_company_id INTEGER -- Üst firmaya (companies tablosundaki ÜST FİRMA) bağlılık
);

-- Üst Firmalar (Holding/Grup) Tablosu - ESKİ YAPI (Geriye dönük uyumluluk için)
CREATE TABLE IF NOT EXISTS main_companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address_line TEXT,
    province_id INTEGER,
    province_name VARCHAR(100),
    admin_code VARCHAR(20) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departmanlar Tablosu
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Firma-Kullanıcı İlişkisi
CREATE TABLE IF NOT EXISTS company_users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'staff',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, user_id)
);

-- Hizmetler Tablosu
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Çalışma Saatleri (Eski)
CREATE TABLE IF NOT EXISTS working_hours (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Paketler (Birden fazla hizmet içeren paketler)
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    staff_id INTEGER REFERENCES users(id),
    department_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Paket Hizmetleri İlişkisi
CREATE TABLE IF NOT EXISTS package_services (
    id SERIAL PRIMARY KEY,
    package_id INTEGER REFERENCES packages(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    staff_id INTEGER REFERENCES users(id),
    department_id INTEGER,
    order_index INTEGER DEFAULT 0
);

-- Randevular
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES users(id),
    service_id INTEGER REFERENCES services(id),
    staff_id INTEGER REFERENCES users(id),
    package_id INTEGER REFERENCES packages(id),
    
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    
    price DECIMAL(10, 2),
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    payment_method VARCHAR(50),
    
    customer_phone VARCHAR(20),
    customer_name VARCHAR(255),
    device_id VARCHAR(255),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Randevu Hizmetleri (Çoklu hizmet desteği için)
CREATE TABLE IF NOT EXISTS appointment_services (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    price DECIMAL(10, 2),
    duration_minutes INTEGER,
    staff_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    start_time VARCHAR(5),
    end_time VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ödemeler Tablosu
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id),
    company_id INTEGER REFERENCES companies(id),
    
    amount DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) DEFAULT 0.00,
    net_amount DECIMAL(10, 2) NOT NULL,
    
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending',
    
    transaction_id VARCHAR(255),
    transaction_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS Ayarları
CREATE TABLE IF NOT EXISTS sms_settings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'local_gateway',
    api_url TEXT NOT NULL,
    api_key TEXT,
    sender_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id)
);

-- SMS Günlükleri
CREATE TABLE IF NOT EXISTS sms_logs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'sent', 'failed', 'pending'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Müşteri Cihazları (Bildirimler için)
CREATE TABLE IF NOT EXISTS customer_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_companies_location ON companies(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_company ON appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);

-- Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers (Eksikse oluştur)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_companies_updated_at') THEN
        CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_services_updated_at') THEN
        CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_appointments_updated_at') THEN
        CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

-- Varsayılan Admin (Çakışma varsa yapma)
INSERT INTO users (email, password, role, first_name, last_name) 
VALUES ('admin@saloon.com', '$2a$10$YourHashedPasswordHere', 'super_admin', 'Super', 'Admin')
ON CONFLICT (email) DO NOTHING;

-- DATA MIGRATION: Populate company_users from users table (if missing)
-- This fixes the issue where old databases have users/companies but no company_users relation
INSERT INTO company_users (company_id, user_id, role)
SELECT u.company_id, u.id, 
    CASE 
        WHEN u.role = 'company_admin' THEN 'owner'
        ELSE 'staff'
    END
FROM users u
WHERE u.company_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM company_users cu WHERE cu.user_id = u.id AND cu.company_id = u.company_id
);
