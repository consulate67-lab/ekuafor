# Admin Şifre Hash Oluşturma

const bcrypt = require('bcryptjs');

// Admin şifresi: admin123
const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);

console.log('Admin şifre hash:');
console.log(hash);
console.log('\nBu hash değerini server/database/schema.sql dosyasındaki');
console.log('INSERT INTO users satırında $2a$10$YourHashedPasswordHere yerine yazın.');
