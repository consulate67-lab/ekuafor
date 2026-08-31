// OpenStreetMap → Drizzle companies import (job modülü)
// Hem admin route hem CLI tarafından çağrılabilir.
// CLI:  npx tsx scripts/import-osm.ts [limit]
//   limit=0 → TÜM İstanbul (fire-and-forget için sınır: 30-60s)

import 'dotenv/config';
import dns from 'node:dns';
// Supabase direct connection IPv6-only. Render'da IPv6 var, lokal'de de zorla.
if (process.env.DNS_ORDER_IPV6_FIRST !== 'false') {
  dns.setDefaultResultOrder('ipv6first');
}

import { db, pool } from '../db';
import { companies, osmImportProgress } from '../db/schema/core';
import { sql, eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

// Overpass mirror listesi (fallback zinciri).
// Render free plan IP'si bazı mirror'lar tarafından bloklanıyor / transient hata dönüyor.
// Bu yüzden 4 mirror'ı sırayla deniyoruz, hangisi veri döndürürse onu kullanıyoruz.
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',       // ana, bazen bloklu
  'https://overpass.kumi.systems/api/interpreter', // Almanya, bazen 500
  'https://overpass.osm.ch/api/interpreter',       // İsviçre
  'https://overpass.openstreetmap.fr/api/interpreter', // Fransa, bazen 504
];

export interface ImportOpts {
  limit: number;       // 0 = sınırsız (TÜM bbox / grid)
  city?: string;       // default: İstanbul
  dryRun?: boolean;    // true = DB'ye yazma, sadece say
  adminEmail?: string; // default: sarpyilmaz@saloon.com
  grid?: string;       // 'istanbul' = 4 parçalı grid, undefined = tek bbox
}

export interface ImportResult {
  ok: boolean;
  city: string;
  limit: number;
  dryRun: boolean;
  grid: string | null;
  parts: number;       // kaç parça sorgu atıldı
  skipped: number;     // persistent queue'da atlanan il sayısı
  fetched: number;
  inserted: number;
  durationMs: number;
  errors: string[];
  perPart?: { part: number; bbox: [number, number, number, number]; fetched: number; error?: string }[];
  sample?: { name: string; boardCode: string; phone: string | null };
}

interface OSMElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// İl → [south, west, north, east] bbox mapping (tek parça).
const CITY_BBOX: Record<string, [number, number, number, number]> = {
  'İstanbul': [40.8, 28.0, 41.6, 29.7],
  'Ankara':   [39.5, 32.5, 40.3, 33.5],
  'İzmir':    [38.1, 26.7, 38.7, 27.5],
};
// Default: İstanbul
const DEFAULT_BBOX: [number, number, number, number] = [40.8, 28.0, 41.6, 29.7];

// İstanbul grid: 2x2 = 4 parça. Tam bbox 40.8-41.6N × 28.0-29.7E
// Paralel çağrı riskli (rate limit), sıralı çağırıyoruz.
const CITY_GRID: Record<string, [number, number, number, number][]> = {
  'istanbul': [
    [41.2, 28.0, 41.6, 28.85],  // NW: Avrupa kuzey
    [41.2, 28.85, 41.6, 29.7],  // NE: Anadolu kuzey
    [40.8, 28.0, 41.2, 28.85],  // SW: Avrupa güney
    [40.8, 28.85, 41.2, 29.7],  // SE: Anadolu güney
  ],
};

// Türkiye 81 il — her il için tek parça bbox (yaklaşık merkez ±0.3° enlem, ±0.4° boylam).
// OSM admin boundary detaylı değil ama şehir merkezi POI'leri için yeterli.
// grid='all' modunda 81 il sırayla çağrılır.
const ALL_CITY_BBOX: Record<string, [number, number, number, number]> = {
  'adana':          [36.7,  34.9, 37.3,  35.7],
  'adiyaman':       [37.4,  37.9, 38.1,  38.6],
  'afyonkarahisar': [38.4,  30.1, 39.0,  31.0],
  'agri':           [39.4,  42.6, 40.0,  43.5],
  'amasya':         [40.3,  35.4, 40.9,  36.2],
  'ankara':         [39.5,  32.5, 40.3,  33.5],
  'antalya':        [36.6,  30.3, 37.1,  31.0],
  'artvin':         [40.8,  41.4, 41.5,  42.3],
  'aydin':          [37.5,  27.4, 38.2,  28.3],
  'balikesir':      [39.3,  27.4, 40.0,  28.4],
  'bilecik':        [39.8,  29.6, 40.4,  30.4],
  'bingol':         [38.5,  40.1, 39.2,  40.9],
  'bitlis':         [38.0,  41.7, 38.7,  42.5],
  'bolu':           [40.4,  31.2, 41.0,  32.0],
  'burdur':         [37.4,  29.9, 38.0,  30.7],
  'bursa':          [39.8,  28.6, 40.5,  29.6],
  'canakkale':      [39.8,  26.0, 40.5,  26.8],
  'cankiri':        [40.2,  33.2, 40.9,  34.0],
  'corum':          [40.2,  34.5, 40.9,  35.4],
  'denizli':        [37.4,  28.7, 38.1,  29.5],
  'diyarbakir':     [37.5,  39.8, 38.3,  40.7],
  'edirne':         [41.3,  26.1, 42.0,  27.0],
  'elazig':         [38.3,  38.8, 39.0,  39.6],
  'erzincan':       [39.4,  39.1, 40.1,  39.9],
  'erzurum':        [39.5,  40.8, 40.3,  41.7],
  'eskisehir':      [39.4,  30.1, 40.1,  30.9],
  'gaziantep':      [36.7,  37.0, 37.4,  37.8],
  'giresun':        [40.5,  38.0, 41.3,  38.8],
  'gumushane':      [40.1,  39.1, 40.8,  39.9],
  'hakkari':        [37.2,  43.3, 37.9,  44.2],
  'hatay':          [35.8,  35.8, 36.6,  36.5],
  'isparta':        [37.4,  30.2, 38.1,  30.9],
  'mersin':         [36.4,  34.2, 37.2,  35.0],
  'istanbul':       [40.8,  28.0, 41.6,  29.7],  // grid var, fallback
  'izmir':          [38.1,  26.7, 38.7,  27.5],
  'kars':           [40.2,  42.7, 40.9,  43.5],
  'kastamonu':      [41.0,  33.3, 41.7,  34.2],
  'kayseri':        [38.4,  35.1, 39.1,  35.9],
  'kirklareli':     [41.3,  26.8, 42.1,  27.7],
  'kirsehir':       [38.8,  33.8, 39.5,  34.6],
  'kocaeli':        [40.5,  29.5, 41.2,  30.4],
  'konya':          [37.5,  32.1, 38.2,  32.9],
  'kutahya':        [39.0,  29.6, 39.7,  30.4],
  'malatya':        [38.0,  37.9, 38.7,  38.7],
  'manisa':         [38.2,  27.0, 38.9,  27.8],
  'kahramanmaras':  [37.2,  36.5, 37.9,  37.3],
  'mardin':         [37.0,  40.3, 37.7,  41.1],
  'mugla':          [36.8,  27.9, 37.6,  28.8],
  'mus':            [38.4,  41.1, 39.1,  41.9],
  'nevsehir':       [38.2,  34.3, 38.9,  35.1],
  'nigde':          [37.6,  34.3, 38.3,  35.0],
  'ordu':           [40.5,  37.4, 41.3,  38.3],
  'rize':           [40.6,  40.1, 41.4,  40.9],
  'sakarya':        [40.4,  30.0, 41.1,  30.8],
  'samsun':         [40.9,  35.9, 41.6,  36.8],
  'siirt':          [37.5,  41.5, 38.3,  42.3],
  'sinop':          [41.6,  34.7, 42.4,  35.5],
  'sivas':          [39.4,  36.6, 40.1,  37.4],
  'tekirdag':       [40.6,  27.1, 41.3,  27.9],
  'tokat':          [39.9,  36.1, 40.6,  36.9],
  'trabzon':        [40.6,  39.3, 41.4,  40.1],
  'tunceli':        [38.7,  39.1, 39.4,  39.9],
  'sanliurfa':      [36.8,  38.4, 37.5,  39.2],
  'usak':           [38.3,  29.0, 39.0,  29.7],
  'van':            [38.1,  43.0, 38.8,  43.8],
  'yozgat':         [39.4,  34.4, 40.1,  35.2],
  'zonguldak':     [41.0,  31.4, 41.7,  32.2],
  'aksaray':        [38.0,  33.7, 38.7,  34.4],
  'bayburt':        [39.9,  39.8, 40.6,  40.5],
  'karaman':        [36.8,  32.8, 37.5,  33.6],
  'kirikkale':      [39.5,  33.1, 40.2,  33.9],
  'batman':         [37.5,  40.7, 38.2,  41.5],
  'sirnak':         [37.1,  42.0, 37.8,  42.8],
  'bartin':         [41.2,  31.9, 41.9,  32.7],
  'ardahan':        [40.7,  42.3, 41.4,  43.1],
  'igdir':          [39.5,  43.6, 40.2,  44.4],
  'yalova':         [40.3,  28.9, 40.9,  29.6],
  'karabuk':        [40.8,  32.2, 41.5,  33.0],
  'kilis':          [36.4,  36.7, 37.1,  37.5],
  'osmaniye':       [36.7,  35.8, 37.4,  36.6],
  'duzce':          [40.5,  30.7, 41.2,  31.5],
};

function buildQueryForBbox(bbox: [number, number, number, number], limit: number): string {
  const limitStr = limit > 0 ? `out ${limit}` : 'out';
  const [s, w, n, e] = bbox;
  // Türkiye'de yaygın OSM tag'leri: shop=hairdresser (en yaygın), shop=beauty, amenity=beauty_salon
  return `[out:json][timeout:120];(node["shop"="hairdresser"](${s},${w},${n},${e});node["shop"="beauty"](${s},${w},${n},${e});node["amenity"="beauty_salon"](${s},${w},${n},${e});way["shop"="hairdresser"](${s},${w},${n},${e});way["shop"="beauty"](${s},${w},${n},${e});way["amenity"="beauty_salon"](${s},${w},${n},${e}););${limitStr} center;`;
}

function buildQuery(city: string, limit: number): string {
  const bbox = CITY_BBOX[city] || DEFAULT_BBOX;
  return buildQueryForBbox(bbox, limit);
}

function mapToCompany(e: OSMElement, city: string, adminId: number) {
  const t = e.tags || {};
  const lat = e.lat ?? e.center?.lat;
  const lon = e.lon ?? e.center?.lon;
  const addr = t['addr:full']
    || [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ').trim();
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    + Date.now().toString(36).slice(-2);

  return {
    name: t.name || 'İsimsiz İşletme',
    phone: t.phone || t['contact:phone'] || null,
    addressLine: addr || null,
    city: t['addr:city'] || city,
    district: t['addr:district'] || t['addr:suburb'] || null,
    neighborhood: t['addr:neighbourhood'] || null,
    postalCode: t['addr:postcode'] || null,
    latitude: lat?.toString() || null,
    longitude: lon?.toString() || null,
    website: t.website || t['contact:website'] || null,
    description: [t.operator, t.opening_hours, `OSM ID: ${e.id}`].filter(Boolean).join(' | ') || null,
    boardCode: code,
    isActive: true,
    createdBy: adminId,
    isVerified: false,
    paymentEnabled: false,
    genders: ['Kadın', 'Erkek'],
    workStartTime: '09:00',
    workEndTime: '20:00',
    slotInterval: '30',
  };
}

async function getAdminId(email: string): Promise<number> {
  const result = await db.execute(sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`);
  const rows = (result as any).rows || [];
  if (!rows.length) throw new Error(`Admin user (${email}) not found in DB`);
  return rows[0].id;
}

async function fetchOSM(queryStr: string, errorsRef?: string[]): Promise<OSMElement[]> {
  // Render free plan IPv6 outbound desteklemiyor → ENETUNREACH.
  // Supabase direct connection IPv6-only olduğu için varsayılan ipv6first kalır,
  // ama Overpass çağrısı için IPv4 zorla (DB bağlantısı zaten kurulu, etkilenmez).
  const prevOrder = (dns as any).getDefaultResultOrder?.() || null;
  dns.setDefaultResultOrder('ipv4first');
  const errors = errorsRef || [];
  const PER_MIRROR_TIMEOUT_MS = 25000; // 25s per mirror, max 4×25=100s
  try {
    for (const mirror of OVERPASS_MIRRORS) {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), PER_MIRROR_TIMEOUT_MS);
      try {
        const res = await fetch(mirror, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'SalonCebinde-OSM-Importer/1.0 (selim@saloncebinde.com)',
          },
          body: 'data=' + encodeURIComponent(queryStr),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const t = await res.text();
          errors.push(`${mirror}: HTTP ${res.status} (${t.slice(0, 100)})`);
          continue;
        }
        const data: any = await res.json();
        const elems = ((data.elements || []) as OSMElement[]).filter(e => e.lat || e.center?.lat);
        if (elems.length > 0) {
          return elems; // başarılı mirror
        }
        errors.push(`${mirror}: 0 element`);
      } catch (e: any) {
        errors.push(`${mirror}: ${e.message} (cause: ${e.cause?.code || '-'})`);
        continue;
      } finally {
        clearTimeout(tid);
      }
    }
    throw new Error(`Tüm Overpass mirror'lar başarısız: ${errors.join(' | ')}`);
  } finally {
    if (prevOrder) dns.setDefaultResultOrder(prevOrder);
  }
}

/**
 * OSM import'u çalıştırır. Endpoint veya script tarafından çağrılabilir.
 * Hata durumunda errors[] içinde döner, exception fırlatmaz (fire-and-forget uyumlu).
 */
export async function runOsmImport(opts: ImportOpts): Promise<ImportResult> {
  const city = opts.city || 'İstanbul';
  const limit = opts.limit ?? 5;
  const dryRun = opts.dryRun ?? false;
  const adminEmail = opts.adminEmail || 'sarpyilmaz@saloon.com';
  const grid = opts.grid?.toLowerCase() || null;
  const result: ImportResult = {
    ok: false,
    city,
    limit,
    dryRun,
    grid,
    parts: 0,
    skipped: 0,
    fetched: 0,
    inserted: 0,
    durationMs: 0,
    errors: [],
    perPart: [],
  };
  const t0 = Date.now();

  try {
    const adminId = await getAdminId(adminEmail);

    // 'all' grid modu: Türkiye'nin 81 ilini sırayla çağır (Aşama 5.3)
    // Her il tek parça bbox, büyük job olduğu için fire-and-forget beklenir.
    // Persistent progress: server restart olursa done olanlar atlanır (Aşama 5.5).
    if (grid === 'all') {
      const cityKeys = Object.keys(ALL_CITY_BBOX);
      const bboxes = Object.values(ALL_CITY_BBOX);

      // Skip zaten 'done' olanları (server restart sonrası devam)
      const doneRows = await db.select({ city: osmImportProgress.city })
        .from(osmImportProgress)
        .where(eq(osmImportProgress.status, 'done'));
      const doneSet = new Set(doneRows.map(r => r.city));
      const remaining: { key: string; bbox: [number, number, number, number] }[] = [];
      cityKeys.forEach((k, i) => {
        if (!doneSet.has(k)) remaining.push({ key: k, bbox: bboxes[i] });
      });
      result.parts = remaining.length;
      result.skipped = doneSet.size;

      logger.info(
        { total: cityKeys.length, remaining: remaining.length, skipped: doneSet.size },
        '[import-osm] all-cities master başladı'
      );

      const allElems: OSMElement[] = [];
      const seenIds = new Set<number>();

      for (let i = 0; i < remaining.length; i++) {
        const { key: cityName, bbox } = remaining[i];
        const queryStr = buildQueryForBbox(bbox, 0);
        let cityFetched = 0;
        try {
          // Persistent progress: running
          await db.insert(osmImportProgress).values({
            city: cityName, status: 'running', startedAt: new Date(),
          }).onConflictDoUpdate({
            target: osmImportProgress.city,
            set: { status: 'running', startedAt: new Date() },
          });

          const elems = await fetchOSM(queryStr, result.errors);
          for (const e of elems) {
            if (!seenIds.has(e.id)) {
              seenIds.add(e.id);
              (e as any)._city = cityName;
              allElems.push(e);
              cityFetched++;
            }
          }
          result.perPart!.push({ part: i + 1, bbox, fetched: cityFetched });

          // Persistent progress: done
          await db.insert(osmImportProgress).values({
            city: cityName, status: 'done', fetched: cityFetched, inserted: 0, finishedAt: new Date(),
          }).onConflictDoUpdate({
            target: osmImportProgress.city,
            set: { status: 'done', fetched: cityFetched, finishedAt: new Date() },
          });
        } catch (e: any) {
          const errMsg = (e.message || String(e)).slice(0, 500);
          result.perPart!.push({ part: i + 1, bbox, fetched: 0, error: errMsg });
          // Persistent progress: error (retry için)
          await db.insert(osmImportProgress).values({
            city: cityName, status: 'error', errorMessage: errMsg, finishedAt: new Date(),
          }).onConflictDoUpdate({
            target: osmImportProgress.city,
            set: { status: 'error', errorMessage: errMsg, finishedAt: new Date() },
          });
        }
      }
      result.fetched = allElems.length;
      result.durationMs = Date.now() - t0;
      if (allElems.length) {
        const records = allElems.map((e: any) => mapToCompany(e, e._city || city, adminId));
        result.sample = { name: records[0].name, boardCode: records[0].boardCode, phone: records[0].phone };
        if (!dryRun) {
          for (let i = 0; i < records.length; i += 500) {
            const batch = records.slice(i, i + 500);
            const r = await db.insert(companies).values(batch).returning({ id: companies.id });
            result.inserted += r.length;
          }
        } else {
          result.inserted = records.length;
        }
        // done il sayısı + inserted güncelle (tüm done iller toplamı)
        await db.execute(sql`UPDATE osm_import_progress SET inserted = ${result.inserted} WHERE status = 'done'`);
      }
      result.ok = true;
      logger.info(
        { fetched: result.fetched, inserted: result.inserted, durationMs: result.durationMs, skipped: result.skipped },
        '[import-osm] all-cities master bitti'
      );
      return result;
    }

    // Grid modu: birden fazla bbox parçasını sırayla çağır, sonuçları birleştir
    if (grid && CITY_GRID[grid]) {
      const bboxes = CITY_GRID[grid];
      result.parts = bboxes.length;
      // Her parça için limit uygula (parça başına max)
      const perPartLimit = limit > 0 ? Math.ceil(limit / bboxes.length) : 0;
      const allElems: OSMElement[] = [];
      const seenIds = new Set<number>();
      for (let i = 0; i < bboxes.length; i++) {
        const bbox = bboxes[i];
        const queryStr = buildQueryForBbox(bbox, perPartLimit);
        try {
          const elems = await fetchOSM(queryStr, result.errors);
          // Aynı OSM node/way birden fazla parçada olabilir, dedup
          let added = 0;
          for (const e of elems) {
            if (!seenIds.has(e.id)) {
              seenIds.add(e.id);
              allElems.push(e);
              added++;
            }
          }
          result.perPart!.push({ part: i + 1, bbox, fetched: added });
        } catch (e: any) {
          result.perPart!.push({ part: i + 1, bbox, fetched: 0, error: e.message?.slice(0, 200) || String(e).slice(0, 200) });
        }
      }
      result.fetched = allElems.length;
      if (!allElems.length) {
        result.durationMs = Date.now() - t0;
        result.ok = true;
        return result;
      }
      // Apply final limit (e.g., test mode limit=20)
      const finalElems = limit > 0 ? allElems.slice(0, limit) : allElems;
      const records = finalElems.map(e => mapToCompany(e, city, adminId));
      if (records.length) {
        result.sample = { name: records[0].name, boardCode: records[0].boardCode, phone: records[0].phone };
      }
      if (!dryRun) {
        for (let i = 0; i < records.length; i += 500) {
          const batch = records.slice(i, i + 500);
          const r = await db.insert(companies).values(batch).returning({ id: companies.id });
          result.inserted += r.length;
        }
      } else {
        result.inserted = records.length;
      }
      result.durationMs = Date.now() - t0;
      result.ok = true;
      return result;
    }

    // Tek bbox modu (eski davranış)
    const elems = await fetchOSM(buildQuery(city, limit), result.errors);
    result.fetched = elems.length;
    result.parts = 1;
    if (!elems.length) {
      result.durationMs = Date.now() - t0;
      result.ok = true;
      return result;
    }
    const records = elems.map(e => mapToCompany(e, city, adminId));
    result.sample = { name: records[0].name, boardCode: records[0].boardCode, phone: records[0].phone };

    if (!dryRun) {
      for (let i = 0; i < records.length; i += 500) {
        const batch = records.slice(i, i + 500);
        const r = await db.insert(companies).values(batch).returning({ id: companies.id });
        result.inserted += r.length;
      }
    } else {
      result.inserted = records.length; // simulate
    }

    result.durationMs = Date.now() - t0;
    result.ok = true;
  } catch (e: any) {
    // Detaylı hata yakalama — Render dashboard logs'ta görünür
    const detail = {
      message: e.message || String(e),
      name: e.name,
      cause: e.cause ? { code: e.cause.code, message: e.cause.message, syscall: e.cause.syscall } : undefined,
      code: e.code,
      stack: e.stack?.split('\n').slice(0, 5).join('\n'),
    };
    result.errors.push(JSON.stringify(detail));
    result.durationMs = Date.now() - t0;
  }
  return result;
}
