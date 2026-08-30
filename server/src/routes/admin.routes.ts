import { Router, Request, Response } from 'express';
import { authMiddleware, roleCheck } from '../middleware/auth.middleware';
import { runOsmImport, ImportResult } from '../jobs/import-osm';
import { logger } from '../utils/logger';
import { randomUUID } from 'node:crypto';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// === Admin-only guard: auth + super_admin ===
router.use(authMiddleware, roleCheck(['super_admin']));

/**
 * GET /api/admin/stats
 * DB özet: toplam firma, OSM'den gelen (description LIKE '%OSM ID%'),
 * son 24 saatte eklenen, KVKK talepleri.
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const total = await db.execute(sql`SELECT count(*)::int AS n FROM companies`);
        const osmTotal = await db.execute(sql`SELECT count(*)::int AS n FROM companies WHERE description LIKE '%OSM ID%'`);
        const last24h = await db.execute(sql`SELECT count(*)::int AS n FROM companies WHERE created_at > NOW() - INTERVAL '24 hours'`);
        const byCity = await db.execute(sql`SELECT city, count(*)::int AS n FROM companies WHERE city IS NOT NULL GROUP BY city ORDER BY n DESC LIMIT 20`);
        const kvkkPending = await db.execute(sql`SELECT count(*)::int AS n FROM kvkk_requests WHERE status = 'pending'`);
        const osmJobs = Array.from(jobs.values()).slice(-10).reverse();
        res.json({
            success: true,
            companies: {
                total: (total as any).rows?.[0]?.n ?? 0,
                fromOSM: (osmTotal as any).rows?.[0]?.n ?? 0,
                last24h: (last24h as any).rows?.[0]?.n ?? 0,
                byCity: (byCity as any).rows || [],
            },
            kvkk: { pending: (kvkkPending as any).rows?.[0]?.n ?? 0 },
            osmJobs,
        });
    } catch (e: any) {
        logger.error({ err: e.message }, '[admin/stats] hata');
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * DEBUG: /api/admin/test-network
 * Render → dış internet outbound bağlantı testi.
 * Birden fazla kaynağa paralel fetch yapar, sonuçları döner.
 * Production'da tutmak zararsız (admin-only), debug kolaylığı için.
 */
router.get('/test-network', async (req: Request, res: Response) => {
  const tests = [
    { name: 'overpass-api.de (ana, bloklu)', url: 'https://overpass-api.de/api/status' },
    { name: 'overpass.kumi.systems', url: 'https://overpass.kumi.systems/api/status' },
    { name: 'overpass.osm.ch', url: 'https://overpass.osm.ch/api/status' },
    { name: 'overpass.openstreetmap.fr', url: 'https://overpass.openstreetmap.fr/api/status' },
    { name: 'httpbin.org', url: 'https://httpbin.org/get' },
    { name: 'example.com', url: 'https://example.com/' },
  ];
  const dns = await import('node:dns');
  const results: any[] = [];
  for (const t of tests) {
    const start = Date.now();
    let lookup: any = null;
    try {
      lookup = await new Promise<any>((resolve, reject) => {
        dns.lookup(new URL(t.url).hostname, { all: true }, (err, addrs) => {
          if (err) reject(err); else resolve(addrs);
        });
      });
    } catch (e: any) {
      lookup = { error: e.message };
    }
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 10000);
    let fetchResult: any = {};
    try {
      const r = await fetch(t.url, { signal: ctrl.signal, headers: { 'User-Agent': 'SalonCebinde-Debug/1.0' } });
      fetchResult = { ok: r.ok, status: r.status, bytes: (await r.text()).length };
    } catch (e: any) {
      fetchResult = { error: e.message, cause: e.cause?.code };
    } finally {
      clearTimeout(tid);
    }
    results.push({ name: t.name, url: t.url, dns: lookup, fetch: fetchResult, durationMs: Date.now() - start });
  }
  res.json({ success: true, results });
});

/**
 * In-memory job tracker. Production'da kaybolabilir (process restart),
 * ama sadece debug amaçlı. Persistent job queue gerekmiyor.
 */
interface ImportJob {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'done' | 'error';
  opts: { limit: number; city?: string; dryRun?: boolean; grid?: string };
  result?: ImportResult;
  error?: string;
}
const jobs = new Map<string, ImportJob>();

/**
 * GET /api/admin/import-status
 * Tüm import job'larını listele (son 20).
 */
router.get('/import-status', (req: Request, res: Response) => {
  const list = Array.from(jobs.values())
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 20);
  res.json({ success: true, count: list.length, jobs: list });
});

/**
 * GET /api/admin/import-status/:id
 * Tek bir job'un detayı.
 */
router.get('/import-status/:id', (req: Request, res: Response) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }
  res.json({ success: true, job });
});

/**
 * POST /api/admin/import-osm
 * Body: { limit?: number, city?: string, dryRun?: boolean }
 *   - limit 0 → TÜM İstanbul (fire-and-forget, 202)
 *   - limit > 0 ve <= 50 → sync, sonuç döner
 *   - limit > 50 → fire-and-forget, 202 + jobId
 *
 * Headers: Authorization: Bearer <admin JWT>
 */
router.post('/import-osm', async (req: Request, res: Response) => {
  const limit = Number(req.body?.limit ?? req.query?.limit ?? 5);
  const city = String(req.body?.city ?? req.query?.city ?? 'İstanbul');
  const dryRun = Boolean(req.body?.dryRun ?? req.query?.dryRun ?? false);
  const grid = (req.body?.grid ?? req.query?.grid) ? String(req.body?.grid ?? req.query?.grid) : undefined;
  const triggeredBy = req.user?.email || 'unknown';

  if (Number.isNaN(limit) || limit < 0) {
    return res.status(400).json({ success: false, error: 'limit must be a non-negative integer' });
  }

  // Grid modu (örn 'istanbul' = 4 parça) büyük iştir, her zaman fire-and-forget
  const isLargeJob = limit === 0 || limit > 50 || !!grid;

  // === Büyük job: fire-and-forget (Render HTTP timeout 30s'i aşar) ===
  if (isLargeJob) {
    const jobId = randomUUID();
    const job: ImportJob = {
      id: jobId,
      startedAt: new Date().toISOString(),
      status: 'running',
      opts: { limit, city, dryRun, grid },
    };
    jobs.set(jobId, job);
    logger.info(
      { jobId, limit, city, dryRun, grid, triggeredBy },
      '[admin/import-osm] Fire-and-forget başladı'
    );

    // Response'u HEMEN dön, arka planda çalıştır
    runOsmImport({ limit, city, dryRun, grid })
      .then(result => {
        job.finishedAt = new Date().toISOString();
        job.status = result.ok ? 'done' : 'error';
        job.result = result;
        logger.info(
          { jobId, fetched: result.fetched, inserted: result.inserted, durationMs: result.durationMs, ok: result.ok },
          '[admin/import-osm] Fire-and-forget bitti'
        );
      })
      .catch(e => {
        job.finishedAt = new Date().toISOString();
        job.status = 'error';
        job.error = e.message || String(e);
        logger.error({ jobId, err: e.message }, '[admin/import-osm] Job hata');
      })
      .finally(async () => {
        // pool'u kapatma — diğer admin işlemleri veya server'ın kendi pool'u kullanıyor.
        // NOT: runOsmImport kendi içinde pool.end() çağırmaz, biz de kapatmayız.
        // pool burada server instance'ına ait, kapatırsak tüm uygulamayı kırar.
      });

    return res.status(202).json({
      success: true,
      message: 'Import job başlatıldı (fire-and-forget)',
      jobId,
      statusUrl: `/api/admin/import-status/${jobId}`,
      hint: 'Bittiğinde statusUrl ile sonucu sorgula, ya da Render loglarını izle',
    });
  }

  // === Küçük job: sync çalıştır, sonucu dön ===
  logger.info({ limit, city, dryRun, grid, triggeredBy }, '[admin/import-osm] Sync başladı');
  const result = await runOsmImport({ limit, city, dryRun, grid });
  if (!result.ok) {
    logger.error({ errors: result.errors, durationMs: result.durationMs }, '[admin/import-osm] Sync HATA');
  } else {
    logger.info(
      { fetched: result.fetched, inserted: result.inserted, durationMs: result.durationMs },
      '[admin/import-osm] Sync bitti'
    );
  }
  res.json({ success: result.ok, ...result });
});

export default router;
