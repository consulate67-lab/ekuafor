import { Router, Request, Response } from 'express';
import { authMiddleware, roleCheck } from '../middleware/auth.middleware';
import { runOsmImport, ImportResult, ALL_CITY_BBOX } from '../jobs/import-osm';
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
        const osmProgress = await db.execute(sql`SELECT status, count(*)::int AS n FROM osm_import_progress GROUP BY status`);
        const osmJobs = Array.from(jobs.values()).slice(-10).reverse();
        const progress = (osmProgress as any).rows || [];
        const progressMap: Record<string, number> = {};
        progress.forEach((r: any) => { progressMap[r.status] = r.n; });
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
            osmProgress: {
                done: progressMap.done || 0,
                error: progressMap.error || 0,
                pending: progressMap.pending || 0,
                running: progressMap.running || 0,
            },
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
  opts: { limit: number; city?: string; dryRun?: boolean; grid?: string; mode?: 'standard' | 'extended' };
  result?: ImportResult;
  error?: string;
}
const jobs = new Map<string, ImportJob>();

/**
 * GET /api/admin/users?role=super_admin
 * User'ları listele (admin debug için). super_admin'leri bulmak için.
 */
router.get('/users', async (req: Request, res: Response) => {
    try {
        const role = String(req.query.role || '');
        const r: any = await db.execute(sql`SELECT id, email, role, first_name, last_name, created_at FROM users ${role ? sql`WHERE role = ${role}` : sql``} ORDER BY id DESC LIMIT 50`);
        res.json({ success: true, count: (r as any).rows?.length || 0, users: (r as any).rows || [] });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/admin/normalize-cities
 * Companies tablosundaki city alanını Türkçe-uyumlu Title Case'e çevirir.
 * OSM'den gelen "ankara", eski verilerdeki "Ankara", "ANKARA" gibi
 * case-sensitive duplicate'leri tekilleştirir.
 *
 * ALL_CITY_BBOX'taki 81 il için LOWER karşılaştırma ile doğru Türkçe isme çevirir.
 * Body: { dryRun?: boolean, onlyAffected?: boolean }
 *   - dryRun=true: UPDATE yapmaz, sadece kaç satır etkileneceğini raporlar
 *   - onlyAffected=true: Sadece değişecek satırları UPDATE yapar
 */
router.post('/normalize-cities', async (req: Request, res: Response) => {
    try {
        const dryRun = Boolean(req.body?.dryRun ?? req.query?.dryRun ?? false);
        const triggeredBy = req.user?.email || 'unknown';

        // ALL_CITY_BBOX + CITY_BBOX'taki 84 il'i (büyük/küçük) proper case'e çevir
        // city_match → proper_name map
        // Türkçe locale: 'aydin' → 'Aydın', 'sirnak' → 'Şırnak', 'istanbul' → 'İstanbul' doğru
        const cityMap = new Map<string, string>();
        for (const [k, _] of Object.entries(ALL_CITY_BBOX || {})) {
            // Önce tüm anahtarı Türkçe locale ile küçült (i→ı, İ→i)
            const lower = k.trim().toLocaleLowerCase('tr-TR');
            // Proper case: ilk harfi büyüt (Türkçe), geri kalan zaten küçük
            const proper = lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1);
            cityMap.set(lower, proper);
        }
        // CITY_BBOX'taki büyük harfli olanlar (İstanbul, Ankara, İzmir)
        for (const k of Object.keys({} as any)) { /* type-only */ }
        // ALL_CITY_BBOX zaten tüm 81 ili kapsıyor, ek gerek yok

        if (cityMap.size === 0) {
            return res.status(500).json({ success: false, error: 'City map boş, ALL_CITY_BBOX import edilemedi' });
        }

        // Şu an DB'deki unique city string'lerini çek (lowercase)
        const beforeRes = await db.execute(sql`SELECT city, count(*)::int AS n FROM companies WHERE city IS NOT NULL GROUP BY city ORDER BY city`);
        const beforeRows = (beforeRes as any).rows || [];
        const beforeCount = beforeRows.length;
        const totalCompanies = beforeRows.reduce((s: number, r: any) => s + Number(r.n || 0), 0);

        // Her unique city string için case-insensitive match yap
        let toUpdate = 0;
        const sampleChanges: { from: string; to: string; count: number }[] = [];
        for (const row of beforeRows) {
            const orig = String(row.city || '');
            // Önce Türkçe locale ile küçült (Türkçe I/İ/ı/i doğru dönüşümü)
            const lower = orig.trim().toLocaleLowerCase('tr-TR');
            const proper = cityMap.get(lower);
            if (proper && proper !== orig) {
                toUpdate += Number(row.n);
                if (sampleChanges.length < 20) sampleChanges.push({ from: orig, to: proper, count: Number(row.n) });
            }
        }

        if (dryRun) {
            return res.json({
                success: true,
                dryRun: true,
                uniqueCities: beforeCount,
                totalCompanies,
                toUpdate,
                uniqueAfter: cityMap.size,
                sampleChanges,
                message: `Dry run: ${toUpdate} firma güncellenecek.`,
            });
        }

        // Gerçek UPDATE: her unique case için ayrı UPDATE (race condition yok, hızlı)
        let updated = 0;
        const updateLog: string[] = [];
        for (const [from, to] of cityMap.entries()) {
            // from = lowercase anahtar (ALL_CITY_BBOX'tan)
            // Aynı lowercase'e sahip TÜM varyasyonları (Ankara, ankara, ANKARA) to'ya çevir
            const r: any = await db.execute(sql`UPDATE companies SET city = ${to} WHERE LOWER(city) = ${from} AND city IS NOT NULL`);
            const n = r?.rowCount ?? r?.affectedRows ?? 0;
            if (n > 0) {
                updated += Number(n);
                updateLog.push(`${from} → ${to}: ${n} satır`);
            }
        }

        // Sonra kalan (Türkiye'de olmayan) şehirleri Title Case'e çevir
        // Örn: "buca" → "Buca" (ilçe olabilir)
        const otherRes = await db.execute(sql`SELECT city, count(*)::int AS n FROM companies WHERE city IS NOT NULL GROUP BY city`);
        const otherRows = (otherRes as any).rows || [];
        let otherUpdated = 0;
        for (const row of otherRows) {
            const orig = String(row.city || '');
            // Türkçe locale ile proper case
            const lower = orig.trim().toLocaleLowerCase('tr-TR');
            const proper = lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1);
            if (proper !== orig) {
                const r: any = await db.execute(sql`UPDATE companies SET city = ${proper} WHERE city = ${orig}`);
                const n = r?.rowCount ?? 0;
                if (n > 0) {
                    otherUpdated += Number(n);
                    updateLog.push(`${orig} → ${proper} (ilçe): ${n} satır`);
                }
            }
        }

        const afterRes = await db.execute(sql`SELECT count(DISTINCT city)::int AS n FROM companies WHERE city IS NOT NULL`);
        const afterUnique = (afterRes as any).rows?.[0]?.n ?? 0;

        logger.info(
            { updated, otherUpdated, total: updated + otherUpdated, beforeCount, afterUnique, triggeredBy, updateLog: updateLog.slice(0, 30) },
            '[admin/normalize-cities] city normalize tamamlandı'
        );

        res.json({
            success: true,
            uniqueCities: { before: beforeCount, after: afterUnique },
            totalUpdated: updated + otherUpdated,
            from81Il: updated,
            fromIlce: otherUpdated,
            sampleChanges: updateLog.slice(0, 30),
        });
    } catch (e: any) {
        logger.error({ err: e.message, stack: e.stack?.slice(0, 500) }, '[admin/normalize-cities] hata');
        res.status(500).json({ success: false, error: e.message });
    }
});

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
  const modeRaw = (req.body?.mode ?? req.query?.mode ?? 'standard') as string;
  const mode = modeRaw === 'extended' ? 'extended' : 'standard';
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
      opts: { limit, city, dryRun, grid, mode },
    };
    jobs.set(jobId, job);
    logger.info(
      { jobId, limit, city, dryRun, grid, mode, triggeredBy },
      '[admin/import-osm] Fire-and-forget başladı'
    );

    // Response'u HEMEN dön, arka planda çalıştır
    runOsmImport({ limit, city, dryRun, grid, mode })
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
  logger.info({ limit, city, dryRun, grid, mode, triggeredBy }, '[admin/import-osm] Sync başladı');
  const result = await runOsmImport({ limit, city, dryRun, grid, mode });
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
