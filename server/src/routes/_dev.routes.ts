import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/_dev/admin-reset-password
 *
 * Development-only admin endpoint (2026-09-27 eklendi).
 * Super admin sifre sifirlama + 7 gunluk JWT token uretir.
 *
 * Guvenlik:
 * - ADMIN_KEY env variable ile korunuyor (X-Admin-Key header)
 * - Endpoint Railway container icinde kosuyor, internal DB DNS cozumlenir
 * - Sadece ONE-SHOT kullanimi icin tasarlandi, sonra silinecek
 *
 * Body: { email: string } veya query: ?email=
 * Header: X-Admin-Key: <ADMIN_KEY>
 *
 * Response: { success, email, newPassword, jwt, userId, role, expiresIn }
 */
router.post('/admin-reset-password', async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) {
        return res.status(503).json({ success: false, error: 'ADMIN_KEY env not configured' });
    }

    const providedKey = req.headers['x-admin-key'];
    if (!providedKey || providedKey !== adminKey) {
        logger.warn({ ip: req.ip, path: req.path }, '_dev reset-password: invalid admin key');
        return res.status(403).json({ success: false, error: 'Forbidden: invalid admin key' });
    }

    const email = (req.body?.email || req.query?.email) as string;
    if (!email) {
        return res.status(400).json({ success: false, error: 'email required (body.email or ?email=)' });
    }

    // Lazy import (server config DATABASE_URL okuyor)
    const { default: pool } = await import('../config/database');

    try {
        // 1. User'i bul (sadece bilinen kolonlar)
        const result = await pool.query(
            'SELECT id, email, role FROM users WHERE email = $1 LIMIT 1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found', email });
        }

        const user = result.rows[0];

        // 2. Yeni sifre uret
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let newPassword = '';
        for (let i = 0; i < 16; i++) {
            newPassword += chars[Math.floor(Math.random() * chars.length)];
        }

        // 3. bcrypt hash
        const hash = await bcrypt.hash(newPassword, 10);

        // 4. password kolonunu guncelle (bcrypt hash Supabase import'undan dolayi
        //    password_hash yerine 'password' adiyla gelmis - auth.routes.ts:60 INSERT
        //    pattern'iyle ayni)
        await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hash, user.id]
        );

        // 5. JWT token
        if (!process.env.JWT_SECRET) {
            return res.status(503).json({ success: false, error: 'JWT_SECRET missing' });
        }
        const token = jwt.sign(
            {
                sub: String(user.id),
                email: user.email,
                role: user.role || 'super_admin',
                type: 'admin',
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        logger.info(
            { adminKey: '***', targetEmail: email, targetUserId: user.id },
            '_dev admin-reset-password: SUCCESS'
        );

        return res.json({
            success: true,
            email: user.email,
            userId: user.id,
            role: user.role || 'super_admin',
            newPassword,
            token,
            expiresIn: '7d',
        });
    } catch (err: any) {
        logger.error({ err: err?.message }, '_dev admin-reset-password failed');
        return res.status(500).json({ success: false, error: err?.message || 'Internal error' });
    }
});

/**
 * GET /api/_dev/admin-info
 *
 * Debug icin user bilgisi (sifre gostermeden)
 */
router.get('/admin-info', async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'];
    if (!adminKey || providedKey !== adminKey) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const email = req.query?.email as string;
    if (!email) {
        return res.status(400).json({ success: false, error: 'email required' });
    }
    const { default: pool } = await import('../config/database');
    const result = await pool.query(
        'SELECT id, email, role FROM users WHERE email = $1',
        [email]
    );
    if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, user: result.rows[0] });
});

/**
 * GET /api/_dev/users-schema
 *
 * Sadece debug icin — users tablosunun column listesi (information_schema).
 * Dogru kolon ismini bulmaya yarar, sonra silinecek.
 */
router.get('/users-schema', async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'];
    if (!adminKey || providedKey !== adminKey) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const { default: pool } = await import('../config/database');
    try {
        const result = await pool.query(
            `SELECT column_name, data_type, is_nullable
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'users'
             ORDER BY ordinal_position`
        );
        res.json({ success: true, columns: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/_dev/test-password
 * bcrypt verify debug. Sifre eslesmesinin neden basarisiz oldugunu anlamak icin.
 */
router.post('/test-password', async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'];
    if (!adminKey || providedKey !== adminKey) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const email = (req.body?.email || req.query?.email) as string;
    const testPassword = (req.body?.password || req.query?.password) as string;
    if (!email || !testPassword) {
        return res.status(400).json({ success: false, error: 'email + password required' });
    }
    const { default: pool } = await import('../config/database');
    try {
        const result = await pool.query(
            'SELECT id, email, password FROM users WHERE email = $1 LIMIT 1',
            [email]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'user not found' });
        }
        const user = result.rows[0];
        const storedPassword = user.password;
        const isBcryptLike = typeof storedPassword === 'string'
            && /^\$2[aby]\$/.test(storedPassword);
        let compareResult: boolean | null = null;
        if (isBcryptLike) {
            const bcrypt = (await import('bcryptjs')).default;
            compareResult = await bcrypt.compare(testPassword, storedPassword);
        } else {
            // Bcrypt degilse direkt karsilastir
            compareResult = storedPassword === testPassword;
        }
        res.json({
            success: true,
            userId: user.id,
            storedPasswordLength: storedPassword?.length ?? 0,
            storedPasswordPrefix: typeof storedPassword === 'string'
                ? storedPassword.substring(0, 7) : null,
            isBcryptHash: isBcryptLike,
            isPlaintextMatch: storedPassword === testPassword,
            compareResult,
            testPasswordLength: testPassword.length,
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/_dev/exec-sql
 *
 * Admin key ile korunan raw SQL execution. SADECE production disi debug amacli
 * kullanilacak, Sprint 3 baslangicinda SILINECEK. Sadece admin istegi yapar.
 *
 * Body: { sql: "SELECT * FROM sectors" veya "INSERT INTO ... VALUES (...)" }
 * Response: { rowCount, rows }
 */
router.post('/exec-sql', async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'];
    if (!adminKey || providedKey !== adminKey) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const sql = (req.body?.sql || req.query?.sql) as string;
    if (!sql || typeof sql !== 'string') {
        return res.status(400).json({ success: false, error: 'sql (string) required' });
    }
    const { default: pool } = await import('../config/database');
    try {
        const result = await pool.query(sql);
        res.json({
            success: true,
            rowCount: result.rowCount,
            rows: result.rows,
            command: result.command,
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, code: err.code });
    }
});

/**
 * POST /api/_dev/list-table
 *
 * Generic SELECT listeleme. { table: 'sectors', limit: 50 } gibi.
 */
router.post('/list-table', async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'];
    if (!adminKey || providedKey !== adminKey) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const table = (req.body?.table || req.query?.table) as string;
    const limit = Math.min(parseInt((req.body?.limit || req.query?.limit) as string) || 100, 1000);
    if (!table) {
        return res.status(400).json({ success: false, error: 'table required' });
    }
    const { default: pool } = await import('../config/database');
    try {
        // Whitelist only known safe table names
        const allowed = ['sectors', 'companies', 'sector_service_templates', 'users'];
        if (!allowed.includes(table)) {
            return res.status(400).json({ success: false, error: `table not allowed: ${table}. Whitelist: ${allowed.join(',')}` });
        }
        const result = await pool.query(`SELECT * FROM ${table} LIMIT $1`, [limit]);
        res.json({ success: true, rowCount: result.rowCount, rows: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, code: err.code });
    }
});

/**
 * GET /api/_dev/supabase-discover
 *
 * Supabase DB'nin gerçek schema'sını keşfeder (information_schema.columns).
 * Sprint 2 transferi için: Supabase → Railway kolon mapping'i için zemin.
 *
 * Tables: companies, users, services, sector_service_templates,
 *         sector_employee_specialties, sectors, sector_companies,
 *         company_sectors, packages, appointments, employees
 *
 * Response: {
 *   success, supabaseHost,
 *   tables: {
 *     [tableName]: {
 *       columns: [{ column_name, data_type, is_nullable }],
 *       count: number,
 *       samples: [{...3 rows...}]
 *     }
 *   }
 * }
 */
router.get('/supabase-discover', async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'];
    if (!adminKey || providedKey !== adminKey) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
    if (!supabaseUrl) {
        return res.status(503).json({
            success: false,
            error: 'SUPABASE_DATABASE_URL env not configured (server/.env.local veya Railway env)',
        });
    }

    // Parse host for logging (without exposing credentials)
    let supabaseHost = 'unknown';
    try {
        const match = supabaseUrl.match(/@([^:/]+)/);
        if (match) supabaseHost = match[1];
    } catch {
        // ignore
    }

    const supabase = new Pool({
        connectionString: supabaseUrl,
        // @ts-expect-error node-postgres 'family' option (IPv4-only) destekliyor ama @types/pg tanımı eksik
        family: 4, // IPv4-only (Railway container IPv6 ENETUNREACH, Supabase hostname hem A hem AAAA döner)
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
    });

    const TABLES_TO_DISCOVER = [
        'companies',
        'users',
        'services',
        'sector_service_templates',
        'sector_employee_specialties',
        'sectors',
        'sector_companies',
        'company_sectors',
        'packages',
        'appointments',
        'employees',
    ];

    try {
        logger.info({ supabaseHost }, '_dev supabase-discover: starting');
        const out: any = {
            success: true,
            supabaseHost,
            discoveredAt: new Date().toISOString(),
            tables: {},
        };

        for (const table of TABLES_TO_DISCOVER) {
            // Schema columns
            const schemaResult = await supabase.query(
                `SELECT column_name, data_type, is_nullable
                 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = $1
                 ORDER BY ordinal_position`,
                [table]
            );

            if (schemaResult.rowCount === 0) {
                out.tables[table] = { exists: false };
                continue;
            }

            // Count
            const countResult = await supabase.query(`SELECT COUNT(*)::int AS total FROM ${table}`);
            const count = countResult.rows[0].total;

            // Sample (3 rows, sanitized for size)
            const sampleResult = await supabase.query(`SELECT * FROM ${table} LIMIT 3`);
            const samples = sampleResult.rows.map((row: any) => {
                const sanitized: any = {};
                for (const k of Object.keys(row)) {
                    const v = row[k];
                    if (typeof v === 'string' && v.length > 200) {
                        sanitized[k] = v.substring(0, 200) + `... [${v.length} chars]`;
                    } else if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
                        sanitized[k] = JSON.stringify(v).substring(0, 200);
                    } else {
                        sanitized[k] = v;
                    }
                }
                return sanitized;
            });

            out.tables[table] = {
                exists: true,
                columns: schemaResult.rows,
                columnCount: schemaResult.rowCount,
                count,
                sampleCount: sampleResult.rowCount,
                samples,
            };
        }

        // Also fetch Railway (current) companies schema for diff comparison
        const { default: pool } = await import('../config/database');
        const railwayCompaniesSchema = await pool.query(
            `SELECT column_name, data_type, is_nullable
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'companies'
             ORDER BY ordinal_position`
        );
        out.railwayCompaniesSchema = {
            columns: railwayCompaniesSchema.rows,
            columnCount: railwayCompaniesSchema.rowCount,
        };

        await supabase.end();
        logger.info(
            { supabaseHost, tablesFound: Object.keys(out.tables).filter(t => out.tables[t].exists).length },
            '_dev supabase-discover: SUCCESS'
        );
        res.json(out);
    } catch (err: any) {
        await supabase.end().catch(() => {});
        logger.error({ err: err?.message, code: err?.code }, '_dev supabase-discover failed');
        res.status(500).json({ success: false, error: err.message, code: err.code });
    }
});

/**
 * POST /api/_dev/transfer-from-supabase
 *
 * Sprint 2 transfer: Supabase DB'den Railway DB'ye tablo bazli INSERT.
 * 6 aşamalı planın Stage 2+4 endpoint'i. Stage 3 dryRun validation buradan
 * yapılacak (dryRun=true ile çağır, INSERT yok).
 *
 * Body veya query:
 *   {
 *     tables: string[] (default: ['companies']),
 *     dryRun: boolean (default: true — güvenli default),
 *     chunkSize: number (default: 100 — Railway DB stability),
 *     skipExisting: boolean (default: true — Selim'in tercihi)
 *   }
 *
 * Header: X-Admin-Key
 *
 * Response: {
 *   success, dryRun, startedAt, completedAt, durationMs,
 *   results: {
 *     [tableName]: {
 *       totalInSupabase, totalInRailway, attempted, inserted, skipped,
 *       errors, errorSamples, columnMapping, skippedColumns, chunkCount
 *     }
 *   }
 * }
 *
 * Mapping stratejisi:
 *   1. Aynı kolon adı + aynı tip → direkt map
 *   2. Aynı kolon adı + farklı tip → coerce (best effort)
 *   3. Özel mapping tablosu (users.password_hash → password vs.)
 *   4. Supabase'de var + Railway'de yok → skip + log
 *   5. Railway'de var + Supabase'de yok → null default
 *
 * Duplicate detection: name alanı (case-insensitive trim, exact match)
 */
router.post('/transfer-from-supabase', async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'];
    if (!adminKey || providedKey !== adminKey) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
    if (!supabaseUrl) {
        return res.status(503).json({
            success: false,
            error: 'SUPABASE_DATABASE_URL env not configured',
        });
    }

    const tables = (req.body?.tables || req.query?.tables || 'companies') as string | string[];
    const tablesList: string[] = Array.isArray(tables)
        ? tables
        : String(tables).split(',').map(t => t.trim()).filter(Boolean);
    const dryRun = req.body?.dryRun !== undefined
        ? Boolean(req.body.dryRun)
        : (req.query?.dryRun !== undefined ? String(req.query.dryRun) === 'true' : true);
    const chunkSize = Math.min(
        parseInt(String(req.body?.chunkSize || req.query?.chunkSize || '100')) || 100,
        1000
    );
    const skipExisting = req.body?.skipExisting !== undefined
        ? Boolean(req.body.skipExisting)
        : (req.query?.skipExisting !== undefined ? String(req.query.skipExisting) !== 'false' : true);

    const ALLOWED_TABLES = [
        'companies',
        'users',
        'services',
        'sector_service_templates',
        'sector_employee_specialties',
    ];
    for (const t of tablesList) {
        if (!ALLOWED_TABLES.includes(t)) {
            return res.status(400).json({
                success: false,
                error: `table not allowed: ${t}. Allowed: ${ALLOWED_TABLES.join(',')}`,
            });
        }
    }

    // Özel kolon mapping'leri (Supabase → Railway). Memory'den + Stage 1 keşfinden.
    const SPECIAL_MAPPINGS: Record<string, Record<string, string | null>> = {
        users: {
            password_hash: 'password',  // bcrypt hash'i Supabase password_hash, Railway password
        },
        companies: {
            // Şimdilik özel mapping yok — Stage 2 keşfi sonrası eklenecek
        },
        services: {},
        sector_service_templates: {},
        sector_employee_specialties: {},
    };

    const supabase = new Pool({
        connectionString: supabaseUrl,
        // @ts-expect-error node-postgres 'family' option (IPv4-only) destekliyor ama @types/pg tanımı eksik
        family: 4,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
    });

    const startedAt = new Date();
    const t0 = Date.now();
    const allResults: Record<string, any> = {};

    try {
        const { default: pool } = await import('../config/database');

        for (const table of tablesList) {
            const tableStart = Date.now();
            const tableResult: any = {
                totalInSupabase: 0,
                totalInRailway: 0,
                attempted: 0,
                inserted: 0,
                skipped: 0,
                errors: 0,
                errorSamples: [],
                columnMapping: {},
                skippedColumns: [],
                chunkCount: 0,
            };

            // 1. Supabase schema
            const supabaseSchema = await supabase.query(
                `SELECT column_name, data_type FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
                [table]
            );
            // 2. Railway schema
            const railwaySchema = await pool.query(
                `SELECT column_name, data_type FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
                [table]
            );

            if (supabaseSchema.rowCount === 0) {
                tableResult.error = `Table '${table}' does not exist in Supabase`;
                allResults[table] = tableResult;
                continue;
            }
            if (railwaySchema.rowCount === 0) {
                tableResult.error = `Table '${table}' does not exist in Railway`;
                allResults[table] = tableResult;
                continue;
            }

            const supabaseColMap = new Map(supabaseSchema.rows.map((r: any) => [r.column_name, r.data_type]));
            const railwayColSet = new Set(railwaySchema.rows.map((r: any) => r.column_name));

            // 3. Mapping oluştur (kullanılacak Railway kolonları)
            const mapping: Record<string, string> = {}; // supabaseCol -> railwayCol
            const skippedCols: string[] = [];
            for (const supCol of supabaseColMap.keys()) {
                if (railwayColSet.has(supCol)) {
                    mapping[supCol] = supCol;
                } else if (SPECIAL_MAPPINGS[table]?.[supCol]) {
                    const target = SPECIAL_MAPPINGS[table][supCol];
                    if (target && railwayColSet.has(target)) {
                        mapping[supCol] = target;
                    } else {
                        skippedCols.push(`${supCol} -> ${target ?? 'SKIP'} (target not found)`);
                    }
                } else {
                    skippedCols.push(supCol);
                }
            }
            tableResult.columnMapping = mapping;
            tableResult.skippedColumns = skippedCols;

            // 4. Counts
            const supabaseCount = await supabase.query(`SELECT COUNT(*)::int AS total FROM ${table}`);
            tableResult.totalInSupabase = supabaseCount.rows[0].total;

            const railwayCount = await pool.query(`SELECT COUNT(*)::int AS total FROM ${table}`);
            tableResult.totalInRailway = railwayCount.rows[0].total;

            if (tableResult.totalInSupabase === 0) {
                allResults[table] = tableResult;
                continue;
            }

            // 5. Duplicate detection için Railway'deki mevcut name'leri çek
            const existingNames = new Set<string>();
            if (skipExisting && (table === 'companies' || table === 'services' || table === 'sector_service_templates')) {
                const nameCol = table === 'sector_service_templates' ? 'slug' : 'name';
                if (railwayColSet.has(nameCol)) {
                    const existing = await pool.query(`SELECT ${nameCol} FROM ${table}`);
                    for (const row of existing.rows) {
                        const v = row[nameCol];
                        if (v) existingNames.add(String(v).toLowerCase().trim());
                    }
                }
            }

            // 6. Chunked SELECT + INSERT
            const mappedRailwayCols = Object.values(mapping);
            const totalChunks = Math.ceil(tableResult.totalInSupabase / chunkSize);

            for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
                const offset = chunkIdx * chunkSize;
                tableResult.chunkCount++;

                // Supabase'den chunk oku
                const chunkRows = await supabase.query(
                    `SELECT * FROM ${table} ORDER BY id ASC LIMIT $1 OFFSET $2`,
                    [chunkSize, offset]
                );

                if (chunkRows.rowCount === 0) break;

                // Filter + sanitize
                const filteredRows: any[][] = [];
                const nameCol = table === 'sector_service_templates' ? 'slug' : 'name';
                const hasNameCol = mapping[nameCol] !== undefined;

                for (const row of chunkRows.rows) {
                    tableResult.attempted++;

                    // Duplicate check
                    if (skipExisting && hasNameCol) {
                        const name = row[nameCol];
                        if (name && existingNames.has(String(name).toLowerCase().trim())) {
                            tableResult.skipped++;
                            continue;
                        }
                    }

                    // Map columns
                    const values: any[] = [];
                    for (const supCol of Object.keys(mapping)) {
                        const railCol = mapping[supCol];
                        const val = row[supCol];

                        // Sanitize: tarih, JSON, vs.
                        if (val instanceof Date) {
                            values.push(val.toISOString());
                        } else if (typeof val === 'object' && val !== null) {
                            values.push(JSON.stringify(val));
                        } else {
                            values.push(val);
                        }
                    }
                    filteredRows.push(values);
                }

                if (filteredRows.length === 0) continue;

                if (dryRun) {
                    tableResult.inserted += filteredRows.length;
                    continue;
                }

                // Gerçek INSERT — chunk başına tek sorgu (Postgres VALUES array)
                const placeholders = filteredRows
                    .map((_, i) => `(${mappedRailwayCols.map((__, j) => `$${i * mappedRailwayCols.length + j + 1}`).join(',')})`)
                    .join(',');
                const insertSql = `INSERT INTO ${table} (${mappedRailwayCols.join(',')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`;
                const flatValues = filteredRows.flat();

                try {
                    const result = await pool.query(insertSql, flatValues);
                    tableResult.inserted += result.rowCount || 0;
                } catch (err: any) {
                    tableResult.errors++;
                    if (tableResult.errorSamples.length < 3) {
                        tableResult.errorSamples.push({
                            chunk: chunkIdx,
                            offset,
                            error: err.message,
                            code: err.code,
                            sampleRow: chunkRows.rows[0],
                        });
                    }
                    logger.error({ table, chunk: chunkIdx, err: err.message, code: err.code }, 'transfer chunk failed');
                }
            }

            tableResult.durationMs = Date.now() - tableStart;
            allResults[table] = tableResult;
        }

        await supabase.end();
        const completedAt = new Date();
        logger.info(
            {
                dryRun,
                tables: tablesList,
                summary: Object.fromEntries(
                    Object.entries(allResults).map(([k, v]: [string, any]) =>
                        [k, { inserted: v.inserted, skipped: v.skipped, errors: v.errors, attempted: v.attempted }]
                    )
                ),
            },
            '_dev transfer-from-supabase: COMPLETED'
        );
        res.json({
            success: true,
            dryRun,
            skipExisting,
            chunkSize,
            startedAt: startedAt.toISOString(),
            completedAt: completedAt.toISOString(),
            durationMs: Date.now() - t0,
            results: allResults,
        });
    } catch (err: any) {
        await supabase.end().catch(() => {});
        logger.error({ err: err?.message, code: err?.code }, '_dev transfer-from-supabase failed');
        res.status(500).json({
            success: false,
            error: err.message,
            code: err.code,
            partialResults: allResults,
            durationMs: Date.now() - t0,
        });
    }
});

export default router;
