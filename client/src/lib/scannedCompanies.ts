/** QR ile okutulan / ziyaret edilen işletmeler (çoklu). */

const SCANNED_KEY = 'saloon_scanned_company_ids_v1';
const LEGACY_PIN_KEY = 'saloon_pinned_company_v1';
const LAST_OPENED_KEY = 'saloon_last_opened_company_v1';

function readIds(): number[] {
  try {
    const raw = localStorage.getItem(SCANNED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map(n => Number(n))
          .filter(n => Number.isFinite(n) && n > 0);
      }
    }
  } catch {
    /* ignore */
  }
  return migrateLegacyPin();
}

function migrateLegacyPin(): number[] {
  try {
    const n = Number(localStorage.getItem(LEGACY_PIN_KEY));
    if (Number.isFinite(n) && n > 0) {
      writeIds([n]);
      return [n];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function writeIds(ids: number[]) {
  try {
    localStorage.setItem(SCANNED_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

/** En son okutulan / eklenen başta. */
export function getScannedCompanyIds(): number[] {
  return readIds();
}

export function addScannedCompanyId(id: number): number[] {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return readIds();
  const next = [n, ...readIds().filter(x => x !== n)];
  writeIds(next);
  try {
    localStorage.setItem(LEGACY_PIN_KEY, String(n));
  } catch {
    /* ignore */
  }
  return next;
}

export function removeScannedCompanyId(id: number): number[] {
  const next = readIds().filter(x => x !== Number(id));
  writeIds(next);
  return next;
}

export function getLastOpenedCompanyId(): number | null {
  try {
    const n = Number(localStorage.getItem(LAST_OPENED_KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function setLastOpenedCompanyId(id: number) {
  try {
    localStorage.setItem(LAST_OPENED_KEY, String(id));
  } catch {
    /* ignore */
  }
}

/** Deep link / QR URL’sinden firma id çıkarır. */
export function extractCompanyIdFromAppUrl(url: string): number | null {
  try {
    const u = new URL(url);
    const q = u.searchParams.get('c') || u.searchParams.get('firma') || u.searchParams.get('company');
    if (q && /^\d+$/.test(q)) return Number(q);
  } catch {
    /* ignore */
  }
  const hashMatch = url.match(/#\/(?:firma\/)?(\d+)/i);
  if (hashMatch) {
    const n = Number(hashMatch[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const pathMatch = url.match(/\/c\/(\d+)(?:[/?#]|$)/i) || url.match(/\/firma\/(\d+)(?:[/?#]|$)/i);
  if (pathMatch) {
    const n = Number(pathMatch[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}
