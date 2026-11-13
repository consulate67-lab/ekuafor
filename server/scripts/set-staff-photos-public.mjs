import pg from 'pg';
import { execSync } from 'child_process';

const raw = execSync('railway variables --json', { encoding: 'utf8', cwd: process.cwd() });
const j = JSON.parse(raw);
const internal = j.DATABASE_URL || '';
const host = j.RAILWAY_SERVICE_POSTGRES_URL || '';
const m = internal.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!m || !host) {
  console.error('DB parse failed');
  process.exit(1);
}
const [, user, pass, , port, db] = m;
const publicUrl = `postgresql://${user}:${pass}@${host}:${port}/${db}`;

const PHOTOS = [
  {
    first: 'Reyah',
    last: 'YILMAZ',
    photo:
      'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=400&h=400&q=80',
  },
  {
    first: 'Selim',
    last: 'YILMAZ',
    photo:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80',
  },
];

const pool = new pg.Pool({ connectionString: publicUrl, ssl: { rejectUnauthorized: false } });
try {
  for (const p of PHOTOS) {
    const r = await pool.query(
      `UPDATE users
       SET photo = $1
       WHERE company_id = 1
         AND role = 'staff'
         AND lower(first_name) = lower($2)
         AND lower(last_name) = lower($3)
       RETURNING id, first_name, last_name`,
      [p.photo, p.first, p.last],
    );
    console.log(r.rows[0] ? `OK ${r.rows[0].first_name} ${r.rows[0].last_name}` : `SKIP ${p.first}`);
  }
} finally {
  await pool.end();
}
