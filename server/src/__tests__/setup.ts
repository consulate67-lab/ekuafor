/**
 * Vitest global setup — server test ortamı.
 *
 * Test başlamadan önce env değişkenlerini set eder (zod fail-fast için).
 * DB bağlantısı kurmaz — integration test'lerde mock'lanır.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_with_32_chars_minimum_for_testing_purposes';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'saloon_test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.TURKIYE_API_BASE_URL = 'https://turkiyeapi.dev/api/v1';
process.env.PORT = '3001';
