/**
 * Her sektör için 1 demo firma + tüm katalog hizmetleri + 2 çalışan.
 * Idempotent: adı "Demo · …" ile başlayan aynı sektör firması varsa günceller.
 *
 * Kullanım (server klasöründen):
 *   node scripts/seed-sector-demo-companies.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import crypto from 'crypto';
import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, '..');
const repoRoot = path.join(serverRoot, '..');

// .env yükle
for (const p of [path.join(serverRoot, '.env'), path.join(repoRoot, '.env.local')]) {
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  }
}

const require = createRequire(pathToFileURL(path.join(serverRoot, 'package.json')).href);
const { Client } = require('pg');

const catalogPath = path.join(repoRoot, 'tablet', 'src', 'lib', 'sectorCatalog.ts');
const catalogSrc = fs.readFileSync(catalogPath, 'utf8');

/** sectorCatalog.ts içinden slug + hizmetleri kaba parse (build gerekmez) */
function parseCatalog(src) {
  const sectors = [];
  const blockRe =
    /\{\s*slug:\s*'([^']+)',\s*name:\s*'((?:\\'|[^'])*)',[\s\S]*?services:\s*\[/g;
  let m;
  while ((m = blockRe.exec(src))) {
    const slug = m[1];
    const name = m[2].replace(/\\'/g, "'");
    // services dizisini dengeli parantez ile çıkar
    let i = m.index + m[0].length;
    let depth = 1;
    let bodyStart = i;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === '[') depth += 1;
      else if (ch === ']') depth -= 1;
      i += 1;
    }
    const body = src.slice(bodyStart, i - 1);
    const services = [];
    const seen = new Set();
    const svcRe = /svc\(\s*'((?:\\'|[^'])*)'\s*,\s*(\d+)\s*,\s*(\d+)/g;
    let s;
    while ((s = svcRe.exec(body))) {
      const svcName = s[1].replace(/\\'/g, "'");
      if (seen.has(svcName)) continue;
      seen.add(svcName);
      // Bu svc çağrısının geri kalanında mode var mı?
      const tail = body.slice(s.index, s.index + 500);
      const modeMatch = tail.match(/mode:\s*'(\w+)'/);
      const bookingMode =
        modeMatch?.[1] || (/^(grup|wod)\b/i.test(svcName) ? 'class' : 'staff');
      services.push({
        name: svcName,
        durationMinutes: Number(s[2]),
        price: Number(s[3]),
        bookingMode,
      });
    }
    sectors.push({ slug, name, services });
  }
  return sectors;
}

const FIRM_PREFIX = 'Demo · ';
const PHONE = '05336660125';
const CITY = 'İstanbul';
const DISTRICTS = ['Kadıköy', 'Beşiktaş', 'Şişli', 'Üsküdar', 'Bakırköy', 'Ataşehir', 'Maltepe', 'Sarıyer'];

/** Eksik sektörler için varsayılan meta */
const SECTOR_META = {
  hair: { icon: '💇', color: '#8B5CF6', medical: false },
  barber: { icon: '✂️', color: '#3B82F6', medical: false },
  beauty: { icon: '💅', color: '#EC4899', medical: false },
  nails: { icon: '💅', color: '#F472B6', medical: false },
  laser: { icon: '✨', color: '#A78BFA', medical: false },
  pmu: { icon: '🖊️', color: '#C084FC', medical: false },
  tattoo: { icon: '🖋️', color: '#64748B', medical: false },
  solarium: { icon: '☀️', color: '#FBBF24', medical: false },
  massage: { icon: '💆', color: '#34D399', medical: false },
  spa: { icon: '🛁', color: '#2DD4BF', medical: false },
  wellness: { icon: '🧘', color: '#10B981', medical: false },
  pilates_yoga: { icon: '🧘‍♀️', color: '#14B8A6', medical: false },
  fitness: { icon: '💪', color: '#F97316', medical: false },
  dance: { icon: '💃', color: '#E11D48', medical: false },
  martial: { icon: '🥋', color: '#DC2626', medical: false },
  pool: { icon: '🏊', color: '#0EA5E9', medical: false },
  sports_facility: { icon: '🏟️', color: '#0284C7', medical: false },
  dental: { icon: '🦷', color: '#06B6D4', medical: true },
  physio: { icon: '🦴', color: '#6366F1', medical: true },
  podiatry: { icon: '👣', color: '#818CF8', medical: true },
  dietitian: { icon: '🥗', color: '#22C55E', medical: false },
  psychology: { icon: '🧠', color: '#8B5CF6', medical: false },
  dermatology: { icon: '🧴', color: '#F59E0B', medical: true },
  medical: { icon: '🩺', color: '#EF4444', medical: true },
  plastic_surgery: { icon: '🧬', color: '#F43F5E', medical: true },
  veterinary: { icon: '🐾', color: '#84CC16', medical: true },
  optic: { icon: '👓', color: '#38BDF8', medical: false },
  photo: { icon: '📷', color: '#94A3B8', medical: false },
  pet_grooming: { icon: '🐶', color: '#FB923C', medical: false },
  car_detail: { icon: '🚗', color: '#475569', medical: false },
  coaching: { icon: '🎯', color: '#7C3AED', medical: false },
  tutoring: { icon: '📚', color: '#2563EB', medical: false },
  lash_brow: { icon: '👁️', color: '#DB2777', medical: false },
  hair_transplant: { icon: '🌱', color: '#059669', medical: true },
  crossfit: { icon: '🏋️', color: '#EA580C', medical: false },
  music: { icon: '🎵', color: '#7C3AED', medical: false },
  osteopathy: { icon: '👐', color: '#0D9488', medical: true },
};

const STAFF_POOL = [
  ['Elif', 'Yılmaz'],
  ['Mert', 'Kaya'],
  ['Zeynep', 'Demir'],
  ['Can', 'Öztürk'],
  ['Ayşe', 'Çelik'],
  ['Burak', 'Arslan'],
  ['Deniz', 'Aydın'],
  ['Selin', 'Koç'],
];

const HOURS = [
  ['09:00', '19:00'],
  ['10:00', '20:00'],
  ['08:30', '18:30'],
  ['11:00', '21:00'],
  ['09:30', '19:30'],
  ['08:00', '17:00'],
  ['10:30', '22:00'],
];

function boardCode(first) {
  return `${first.slice(0, 3).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

const sectors = parseCatalog(catalogSrc);
if (!sectors.length) {
  console.error('Katalog parse edilemedi');
  process.exit(1);
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL && !/supabase\.co/i.test(process.env.DATABASE_URL)) {
    return { url: process.env.DATABASE_URL, via: 'env' };
  }
  try {
    const raw = execSync('railway variables --json', {
      encoding: 'utf8',
      cwd: serverRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const j = JSON.parse(raw);
    const internal = j.DATABASE_URL || '';
    const publicHost = j.RAILWAY_SERVICE_POSTGRES_URL || j.PGHOST_PUBLIC || '';
    const m = internal.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    if (m && publicHost && !/railway\.internal/i.test(publicHost)) {
      const [, user, pass, , port, db] = m;
      return {
        url: `postgresql://${user}:${pass}@${publicHost}:${port}/${db}`,
        via: 'railway-public',
      };
    }
    if (m && publicHost) {
      // publicHost may already be host:port or just host
      const [, user, pass, , port, db] = m;
      const host = publicHost.includes(':') ? publicHost.split(':')[0] : publicHost;
      return {
        url: `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}`,
        via: 'railway-public-host',
      };
    }
    if (internal) return { url: internal, via: 'railway-internal' };
  } catch (e) {
    console.warn('railway variables alınamadı:', e.message || e);
  }
  if (process.env.DATABASE_URL) return { url: process.env.DATABASE_URL, via: 'env-fallback' };
  return { url: null, via: 'none' };
}

const { url, via } = resolveDatabaseUrl();
if (!url) {
  console.error('DATABASE_URL yok');
  process.exit(1);
}
console.log('DB via:', via, url.replace(/:[^:@]+@/, ':***@').replace(/\/\/[^@]+@/, '//***@'));

const client = new Client({
  connectionString: url,
  ssl: /railway|amazonaws|neon|render|proxy/i.test(url) ? { rejectUnauthorized: false } : undefined,
});

await client.connect();
console.log(`sektör: ${sectors.length}`);

await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS web_template_id VARCHAR(64)`);
await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS hide_prices BOOLEAN DEFAULT false`);
await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true`);
await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS show_address BOOLEAN DEFAULT true`);
await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(255)`);
await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(255)`);
await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT`);

const fakePw = await bcrypt.hash('DemoStaff123!', 8);
const results = [];

for (let i = 0; i < sectors.length; i += 1) {
  const sec = sectors[i];
  const firmName = `${FIRM_PREFIX}${sec.name}`;
  const [workStart, workEnd] = HOURS[i % HOURS.length];
  const district = DISTRICTS[i % DISTRICTS.length];
  const description = `${sec.name} demo işletmesi. Tüm sektör hizmetleri aktif — görsel ve randevu testi için oluşturuldu.`;
  const webTemplateId = `${sec.slug}-01`;
  const slot = [15, 20, 30, 45][i % 4];

  let sectorRow = await client.query(
    `SELECT id, name_tr, default_duration_minutes FROM sectors WHERE slug = $1 LIMIT 1`,
    [sec.slug],
  );
  if (!sectorRow.rows[0]) {
    const meta = SECTOR_META[sec.slug] || { icon: '🏪', color: '#64748B', medical: false };
    const insSec = await client.query(
      `INSERT INTO sectors (
         slug, name_tr, name_en, icon, color, has_medical_consent,
         default_duration_minutes, commission_rate, display_order, is_active
       ) VALUES ($1,$2,$3,$4,$5,$6,30,5.00,$7,true)
       ON CONFLICT (slug) DO UPDATE SET is_active = true, name_tr = EXCLUDED.name_tr
       RETURNING id`,
      [
        sec.slug,
        sec.name.slice(0, 100),
        sec.slug,
        meta.icon,
        meta.color,
        !!meta.medical,
        (i + 1) * 10,
      ],
    );
    sectorRow = insSec;
    console.log(`+ sector eklendi: ${sec.slug}`);
  } else {
    await client.query(`UPDATE sectors SET is_active = true WHERE slug = $1 AND is_active IS NOT TRUE`, [
      sec.slug,
    ]);
  }
  const sectorId = sectorRow.rows[0].id;

  let companyId;
  const existing = await client.query(
    `SELECT id FROM companies WHERE name = $1 LIMIT 1`,
    [firmName],
  );

  if (existing.rows[0]) {
    companyId = existing.rows[0].id;
    await client.query(
      `UPDATE companies SET
         phone = $2,
         description = $3,
         city = $4,
         district = $5,
         address_line = $6,
         work_start_time = $7,
         work_end_time = $8,
         slot_interval = $9,
         is_active = true,
         is_verified = true,
         web_template_id = $10,
         hide_prices = false,
         show_phone = true,
         show_address = true,
         license_end_date = NOW() + INTERVAL '2 years',
         updated_at = NOW()
       WHERE id = $1`,
      [
        companyId,
        PHONE,
        description,
        CITY,
        district,
        `${district} Demo Cad. No:${10 + i}`,
        workStart,
        workEnd,
        slot,
        webTemplateId,
      ],
    );
  } else {
    const ins = await client.query(
      `INSERT INTO companies (
         name, description, phone, email, website,
         address_line, city, district,
         work_start_time, work_end_time, slot_interval,
         is_active, is_verified, company_type,
         web_template_id, hide_prices, show_phone, show_address,
         license_end_date, board_key, admin_key, booking_flow
       ) VALUES (
         $1,$2,$3,$4,$5,
         $6,$7,$8,
         $9,$10,$11,
         true, true, 'ASIL',
         $12, false, true, true,
         NOW() + INTERVAL '2 years',
         upper(substr(md5(random()::text),1,8)),
         lpad((floor(random()*900000)+100000)::int::text, 6, '0'),
         'SPDT'
       ) RETURNING id`,
      [
        firmName,
        description,
        PHONE,
        `demo.${sec.slug}@saloon.test`,
        null,
        `${district} Demo Cad. No:${10 + i}`,
        CITY,
        district,
        workStart,
        workEnd,
        slot,
        webTemplateId,
      ],
    );
    companyId = ins.rows[0].id;
  }

  await client.query(`DELETE FROM company_sectors WHERE company_id = $1`, [companyId]);
  await client.query(
    `INSERT INTO company_sectors (company_id, sector_id, is_primary) VALUES ($1,$2,true)
     ON CONFLICT DO NOTHING`,
    [companyId, sectorId],
  );

  // Departman
  let deptId;
  const dept = await client.query(
    `SELECT id FROM departments WHERE company_id = $1 ORDER BY id LIMIT 1`,
    [companyId],
  );
  if (dept.rows[0]) deptId = dept.rows[0].id;
  else {
    const d = await client.query(
      `INSERT INTO departments (company_id, name) VALUES ($1,$2) RETURNING id`,
      [companyId, 'Genel'],
    );
    deptId = d.rows[0].id;
  }

  // Hizmetleri yeniden yükle (tam katalog)
  await client.query(`DELETE FROM services WHERE company_id = $1`, [companyId]);
  for (const svc of sec.services) {
    const mode = ['staff', 'class', 'resource'].includes(svc.bookingMode) ? svc.bookingMode : 'staff';
    const durationOptions =
      mode === 'resource' ? [svc.durationMinutes, svc.durationMinutes + 30, svc.durationMinutes + 60] : null;
    await client.query(
      `INSERT INTO services (
         company_id, name, duration_minutes, price, booking_mode, duration_options, is_active, department_id
       ) VALUES ($1,$2,$3,$4,$5,$6,true,$7)`,
      [
        companyId,
        svc.name.slice(0, 255),
        svc.durationMinutes,
        svc.price,
        mode,
        durationOptions,
        deptId,
      ],
    );
  }

  // Çalışanlar: eski demo staff temizle + 2 yeni
  await client.query(
    `DELETE FROM users WHERE company_id = $1 AND role = 'staff' AND email LIKE 'demo-%@staff.local'`,
    [companyId],
  );
  const a = STAFF_POOL[i % STAFF_POOL.length];
  const b = STAFF_POOL[(i + 3) % STAFF_POOL.length];
  for (const [first, last] of [a, b]) {
    const email = `demo-${sec.slug}-${first.toLowerCase()}@staff.local`;
    const existsStaff = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existsStaff.rows[0]) {
      await client.query(
        `UPDATE users SET company_id=$2, is_active=true, phone=$3, department_id=$4, first_name=$5, last_name=$6
         WHERE id=$1`,
        [existsStaff.rows[0].id, companyId, PHONE, deptId, first, last],
      );
    } else {
      await client.query(
        `INSERT INTO users (
           email, password, role, first_name, last_name, phone,
           company_id, is_active, board_code, department_id, title
         ) VALUES ($1,$2,'staff',$3,$4,$5,$6,true,$7,$8,$9)`,
        [
          email,
          fakePw,
          first,
          last,
          PHONE,
          companyId,
          boardCode(first),
          deptId,
          'Personel',
        ],
      );
    }
  }

  // Çalışma saatleri (0=Pazar … 6=Cmt) — Pzt–Cmt açık
  await client.query(`DELETE FROM working_hours WHERE company_id = $1`, [companyId]);
  for (const day of [1, 2, 3, 4, 5, 6]) {
    const end = day === 6 ? (workEnd > '18:00' ? '18:00' : workEnd) : workEnd;
    await client.query(
      `INSERT INTO working_hours (company_id, day_of_week, start_time, end_time, is_active)
       VALUES ($1,$2,$3::time,$4::time,true)`,
      [companyId, day, workStart, end],
    );
  }

  // Redis local tunnel'da yok; atlanır (API cache 60sn içinde düşer)

  const svcCount = (
    await client.query(`SELECT COUNT(*)::int AS c FROM services WHERE company_id = $1`, [companyId])
  ).rows[0].c;

  results.push({
    id: companyId,
    slug: sec.slug,
    name: firmName,
    services: svcCount,
    hours: `${workStart}-${workEnd}`,
  });
  console.log(`OK #${companyId} ${sec.slug} · ${svcCount} hizmet · ${workStart}-${workEnd}`);
}

await client.end();
console.log('\n=== ÖZET ===');
console.log(`Toplam firma: ${results.length}`);
console.log(`Telefon: ${PHONE}`);
for (const r of results) {
  console.log(`${String(r.id).padStart(4)}  ${r.slug.padEnd(18)}  ${r.services} svc  ${r.name}`);
}
