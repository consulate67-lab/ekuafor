-- ============================================================
-- Super Admin Kullanıcısı Oluşturma
-- Email   : sarpyilmaz@saloncebimde.com
-- Şifre   : Continue677
-- ============================================================

INSERT INTO users (email, password, role, first_name, last_name, phone, is_active)
VALUES (
    'sarpyilmaz@saloncebimde.com',
    '$2a$10$Ba0KuHHWuOcEFC/OnP/6gu3CFAcF.Z.4iz2h.ira1C0.xH4vdy4a6',
    'super_admin',
    'sarp',
    'yılmaz',
    '5336660125',
    true
)
ON CONFLICT (email) 
DO UPDATE SET
    password  = EXCLUDED.password,
    role      = 'super_admin',
    is_active = true;
