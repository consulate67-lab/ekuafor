import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';

const require = createRequire(pathToFileURL(path.join('/app/server', 'package.json')).href);
const { Client } = require('pg');

const companyId = Number(process.argv[2] || 5);
const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS hide_prices BOOLEAN DEFAULT false`);
const before = await client.query(`SELECT id, name, hide_prices FROM companies WHERE id = $1`, [companyId]);
console.log('before', before.rows[0]);
const after = await client.query(
  `UPDATE companies SET hide_prices = true, updated_at = NOW() WHERE id = $1 RETURNING id, name, hide_prices`,
  [companyId],
);
console.log('after', after.rows[0]);

try {
  const Redis = (await import('ioredis')).default;
  const redis = new Redis(process.env.REDIS_URL);
  await redis.del(`company:detail:${companyId}`);
  console.log('redis cleared');
  await redis.quit();
} catch (e) {
  console.log('redis skip', e.message);
}

await client.end();
