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
import { companies } from '../db/schema/core';
import { sql } from 'drizzle-orm';

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
    fetched: 0,
    inserted: 0,
    durationMs: 0,
    errors: [],
    perPart: [],
  };
  const t0 = Date.now();

  try {
    const adminId = await getAdminId(adminEmail);

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
