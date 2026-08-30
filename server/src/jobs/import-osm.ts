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

// Overpass ana sunucu (overpass-api.de) Render IP'sini blokluyor.
// kumi.systems 500, osm.ch 0 döndü. openstreetmap.fr (Fransa) deneniyor.
const OVERPASS = 'https://overpass.openstreetmap.fr/api/interpreter';

export interface ImportOpts {
  limit: number;       // 0 = sınırsız (TÜM İstanbul)
  city?: string;       // default: İstanbul
  dryRun?: boolean;    // true = DB'ye yazma, sadece say
  adminEmail?: string; // default: sarpyilmaz@saloon.com
}

export interface ImportResult {
  ok: boolean;
  city: string;
  limit: number;
  dryRun: boolean;
  fetched: number;
  inserted: number;
  durationMs: number;
  errors: string[];
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

function buildQuery(city: string, limit: number): string {
  const limitStr = limit > 0 ? `out ${limit}` : 'out';
  // Türkiye'de yaygın OSM tag'leri: shop=hairdresser, shop=beauty, amenity=beauty_salon
  return `[out:json][timeout:180];area["name"="${city}"];(node["shop"="hairdresser"](area);node["shop"="beauty"](area);node["amenity"="beauty_salon"](area);way["shop"="hairdresser"](area);way["shop"="beauty"](area);way["amenity"="beauty_salon"](area););${limitStr} center;`;
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

async function fetchOSM(city: string, limit: number): Promise<OSMElement[]> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 180000);
  // Render free plan IPv6 outbound desteklemiyor → ENETUNREACH.
  // Supabase direct connection IPv6-only olduğu için varsayılan ipv6first kalır,
  // ama Overpass çağrısı için IPv4 zorla (DB bağlantısı zaten kurulu, etkilenmez).
  const prevOrder = (dns as any).getDefaultResultOrder?.() || null;
  dns.setDefaultResultOrder('ipv4first');
  try {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SalonCebinde-OSM-Importer/1.0 (selim@saloncebinde.com)',
      },
      body: 'data=' + encodeURIComponent(buildQuery(city, limit)),
      signal: controller.signal,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Overpass HTTP ${res.status}: ${t.slice(0, 500)}`);
    }
    const data: any = await res.json();
    return ((data.elements || []) as OSMElement[]).filter(e => e.lat || e.center?.lat);
  } finally {
    clearTimeout(tid);
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
  const result: ImportResult = {
    ok: false,
    city,
    limit,
    dryRun,
    fetched: 0,
    inserted: 0,
    durationMs: 0,
    errors: [],
  };
  const t0 = Date.now();

  try {
    const adminId = await getAdminId(adminEmail);
    const elems = await fetchOSM(city, limit);
    result.fetched = elems.length;
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
    // Logger.error eklenecek (admin route pino log'lar)
  }
  return result;
}
