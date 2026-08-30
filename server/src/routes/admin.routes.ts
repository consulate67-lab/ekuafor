import { Router, Request, Response } from 'express';
import { authMiddleware, roleCheck } from '../middleware/auth.middleware';
import { runOsmImport, ImportResult } from '../jobs/import-osm';
import { logger } from '../utils/logger';
import { randomUUID } from 'node:crypto';

const router = Router();

// === Admin-only guard: auth + super_admin ===
router.use(authMiddleware, roleCheck(['super_admin']));

/**
 * In-memory job tracker. Production'da kaybolabilir (process restart),
 * ama sadece debug amaçlı. Persistent job queue gerekmiyor.
 */
interface ImportJob {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'done' | 'error';
  opts: { limit: number; city?: string; dryRun?: boolean };
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
  const triggeredBy = req.user?.email || 'unknown';

  if (Number.isNaN(limit) || limit < 0) {
    return res.status(400).json({ success: false, error: 'limit must be a non-negative integer' });
  }

  const isLargeJob = limit === 0 || limit > 50;

  // === Büyük job: fire-and-forget (Render HTTP timeout 30s'i aşar) ===
  if (isLargeJob) {
    const jobId = randomUUID();
    const job: ImportJob = {
      id: jobId,
      startedAt: new Date().toISOString(),
      status: 'running',
      opts: { limit, city, dryRun },
    };
    jobs.set(jobId, job);
    logger.info(
      { jobId, limit, city, dryRun, triggeredBy },
      '[admin/import-osm] Fire-and-forget başladı'
    );

    // Response'u HEMEN dön, arka planda çalıştır
    runOsmImport({ limit, city, dryRun })
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
  logger.info({ limit, city, dryRun, triggeredBy }, '[admin/import-osm] Sync başladı');
  const result = await runOsmImport({ limit, city, dryRun });
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
