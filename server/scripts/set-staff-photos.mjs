/**
 * Demo / canlı: firma çalışanlarına portre URL yazar.
 * Usage: railway run -- node scripts/set-staff-photos.mjs
 */
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL yok');
  process.exit(1);
}

const PHOTOS = [
  {
    first: 'Reyah',
    last: 'YILMAZ',
    // Profesyonel kadın portre (Unsplash)
    photo:
      'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=400&h=400&q=80',
  },
  {
    first: 'Selim',
    last: 'YILMAZ',
    // Profesyonel erkek / berber tarzı portre
    photo:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80',
  },
];

const pool = new pg.Pool({ connectionString: url, ssl: url.includes('railway') ? { rejectUnauthorized: false } : undefined });

const companyId = Number(process.env.COMPANY_ID || 1);

try {
  for (const p of PHOTOS) {
    const r = await pool.query(
      `UPDATE users
       SET photo = $1
       WHERE company_id = $2
         AND role = 'staff'
         AND lower(first_name) = lower($3)
         AND lower(last_name) = lower($4)
       RETURNING id, first_name, last_name`,
      [p.photo, companyId, p.first, p.last],
    );
    console.log(r.rows[0] ? `OK ${r.rows[0].first_name} ${r.rows[0].last_name}` : `SKIP ${p.first} ${p.last}`);
  }
} finally {
  await pool.end();
}
