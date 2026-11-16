import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sectors = JSON.parse(fs.readFileSync(path.join(process.env.TEMP, 'all-services.json'), 'utf8'));
const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;

/**
 * Görsel doğrulanmış havuzlar.
 * hair = kadın kuaför; barber = erkek berber (kadın saç görseli YOK).
 */
const POOLS = {
  nails: [
    'photo-1519014816548-bf5fe059798b',
    'photo-1604654894610-df63bc536371',
    'photo-1632345031435-8727f6897d53',
    'photo-1522337660859-02fbefca4702',
  ],
  skin: [
    'photo-1552693673-1bf958298935',
    'photo-1616394584738-fc6e612e71b9',
    'photo-1512290923902-8a9f81dc236c',
    'photo-1596755389378-c31d21fd1273',
    'photo-1598440947619-2c35fc9aa908',
  ],
  makeup: [
    'photo-1487412947147-5cebf100ffc2',
    'photo-1522335789203-aabd1fc54bc9',
    'photo-1516975080664-ed2fc6a32937',
    'photo-1519741497674-611481863552',
  ],
  lash: [
    'photo-1487412947147-5cebf100ffc2',
    'photo-1522335789203-aabd1fc54bc9',
    'photo-1516975080664-ed2fc6a32937',
    'photo-1616394584738-fc6e612e71b9',
  ],
  wax: [
    'photo-1519823551278-64ac92734fb1',
    'photo-1600334129128-685c5582fd35',
    'photo-1544161515-4ab6ce6db874',
    'photo-1616394584738-fc6e612e71b9',
    'photo-1552693673-1bf958298935',
  ],
  /** Kadın kuaför */
  hair: [
    'photo-1595476108010-b4d1f102b1b1', // yıkama
    'photo-1522337360788-8b13dee7a37e', // dalgalı kadın saçı
    'photo-1492106087820-71f1a00d2b11', // boyalı kadın saçı
    'photo-1560066984-138dadb4c035', // salon
    'photo-1522338140262-f46f5913618a', // fön
  ],
  /** Erkek berber — kadın görseli yasak */
  barber: [
    'photo-1585747860715-2ba37e788b70', // berber koltukları
    'photo-1503951914875-452162b0f3f1', // sakal tıraşı
    'photo-1621605815971-fbc98d665033', // makine/araç
    'photo-1599351431202-1e0f0137899a', // fade + ustura
    'photo-1622286342621-4bd786c2447c', // erkek kesim
    'photo-1493256338651-d82f7acb2b38', // makine kesim
    'photo-1605497788044-5a32c7078486', // erkek fön/şekil
  ],
  spa: [
    'photo-1519823551278-64ac92734fb1',
    'photo-1600334129128-685c5582fd35',
    'photo-1544161515-4ab6ce6db874',
    'photo-1507652313519-d4e9174996dd',
  ],
  fitness: [
    'photo-1534438327276-14e5300c3a48',
    'photo-1517836357463-d25dfeac3438',
    'photo-1540497077202-7c8a3999166f',
    'photo-1571019614242-c5c5dee9f50b',
    'photo-1571902943202-507ec2618e8f',
  ],
  yoga: [
    'photo-1544367567-0f2fcb009e0b',
    'photo-1518611012118-696072aa579a',
    'photo-1506126613408-eca07ce68773',
    'photo-1545205597-3d9d02c29597',
  ],
  dance: ['photo-1508700929628-666bc8bd84ea', 'photo-1518834107812-67b0b7c58434', 'photo-1535525153412-5a42439a210d'],
  pool: ['photo-1576013551627-0cc20b96c2a7', 'photo-1519315901367-f34ff9154487', 'photo-1575429198097-0414ec08e8cd'],
  field: ['photo-1574629810360-7efbbe195018', 'photo-1529900748604-07564a03e7a6', 'photo-1552674605-db6ffd4facb5'],
  dental: [
    'photo-1606811841689-23dfddce3e95',
    'photo-1588776814546-1ffcf47267a5',
    'photo-1629909613654-28e377c37b09',
    'photo-1609840114035-3c981b782dfe',
  ],
  clinic: [
    'photo-1519494026892-80bbd2d6fd0d',
    'photo-1579684385127-1ef15d508118',
    'photo-1576091160399-112ba8d25d1d',
    'photo-1666214280557-f1b5022eb634',
    'photo-1582750433449-648ed127bb54',
  ],
  diet: [
    'photo-1490645935967-10de6ba17061',
    'photo-1512621776951-a57141f2eefd',
    'photo-1498837167922-ddd27525d352',
    'photo-1546069901-ba9599a7e63c',
  ],
  therapy: ['photo-1573497019940-1c28c88b4f3e', 'photo-1552664730-d307ca884978', 'photo-1497366216548-37526070297c'],
  pet: [
    'photo-1548199973-03cce0bbc87b',
    'photo-1583511655857-d19b40a7a54e',
    'photo-1450778869180-41d0601e046e',
    'photo-1583337130417-3346a1be7dee',
  ],
  photo: [
    'photo-1492691527719-9d1e07e534b4',
    'photo-1554048612-b6a482bc67e5',
    'photo-1516035069371-29a1b244cc32',
    'photo-1542038784456-1ea8e935640e',
  ],
  car: ['photo-1601362840469-51e4d8d58785', 'photo-1492144534655-ae79c964c9d7', 'photo-1503376780353-7e6692767b70'],
  music: ['photo-1511379938547-c1f69419868d', 'photo-1507838153414-b4b713384a76', 'photo-1510915361894-db8b60106cb1'],
  education: ['photo-1503676260728-1c00da094a0b', 'photo-1427504494785-3a9ca7044f45', 'photo-1509062522246-3755977927d7'],
  tattoo: ['photo-1611501275019-9b5cda994e8d', 'photo-1541534741688-6078c6bfb5c5', 'photo-1599351431202-1e0f0137899a'],
  solarium: ['photo-1616394584738-fc6e612e71b9', 'photo-1552693673-1bf958298935', 'photo-1596755389378-c31d21fd1273'],
  optic: ['photo-1577803645773-f96470509666', 'photo-1473496169904-658ba7c44d8a', 'photo-1511499767150-a48a237f0083'],
};

const FEMALE_HAIR_IDS = new Set(POOLS.hair);
const MALE_BARBER_IDS = new Set(POOLS.barber);

const PIN = {
  'Protez tırnak': 'photo-1519014816548-bf5fe059798b',
  Manikür: 'photo-1604654894610-df63bc536371',
  Pedikür: 'photo-1632345031435-8727f6897d53',
  'Kalıcı oje (gel)': 'photo-1522337660859-02fbefca4702',
  'Protez / gel söküm': 'photo-1632345031435-8727f6897d53',
  'İpek kirpik (full set)': 'photo-1487412947147-5cebf100ffc2',
  'İpek kirpik dolgu': 'photo-1522335789203-aabd1fc54bc9',
  'İpek kirpik söküm': 'photo-1516975080664-ed2fc6a32937',
  'Kirpik lifting': 'photo-1487412947147-5cebf100ffc2',
  'Kirpik boyama': 'photo-1522335789203-aabd1fc54bc9',
  'Tüm vücut ağda': 'photo-1519823551278-64ac92734fb1',
  'Tam bacak ağda': 'photo-1600334129128-685c5582fd35',
  'Yarım bacak ağda': 'photo-1544161515-4ab6ce6db874',
  'Yüz ağda': 'photo-1616394584738-fc6e612e71b9',
  'Ağda (bölgesel)': 'photo-1552693673-1bf958298935',
  'Klasik cilt bakımı': 'photo-1552693673-1bf958298935',
  'Günlük makyaj': 'photo-1487412947147-5cebf100ffc2',
  'Profesyonel / gece makyajı': 'photo-1522335789203-aabd1fc54bc9',
  'Gelin makyajı': 'photo-1519741497674-611481863552',
  // Berber pinleri (erkek)
  'Damat tıraşı': 'photo-1503951914875-452162b0f3f1',
  'Fade / taper': 'photo-1599351431202-1e0f0137899a',
  'Sakal tıraşı': 'photo-1503951914875-452162b0f3f1',
  'Ustura tıraş (sıcak havlu)': 'photo-1599351431202-1e0f0137899a',
  'Makine kesimi': 'photo-1493256338651-d82f7acb2b38',
  'Saç + sakal': 'photo-1622286342621-4bd786c2447c',
};

const SECTOR_CAT = {
  hair: 'hair',
  barber: 'barber',
  beauty: 'skin',
  nails: 'nails',
  laser: 'wax',
  pmu: 'lash',
  tattoo: 'tattoo',
  solarium: 'solarium',
  massage: 'spa',
  spa: 'spa',
  wellness: 'spa',
  pilates_yoga: 'yoga',
  fitness: 'fitness',
  dance: 'dance',
  martial: 'fitness',
  pool: 'pool',
  sports_facility: 'field',
  dental: 'dental',
  physio: 'clinic',
  podiatry: 'clinic',
  dietitian: 'diet',
  psychology: 'therapy',
  dermatology: 'skin',
  medical: 'clinic',
  plastic_surgery: 'clinic',
  veterinary: 'pet',
  optic: 'optic',
  photo: 'photo',
  pet_grooming: 'pet',
  car_detail: 'car',
  coaching: 'therapy',
  tutoring: 'education',
  lash_brow: 'lash',
  hair_transplant: 'clinic',
  crossfit: 'fitness',
  music: 'music',
  osteopathy: 'clinic',
};

const MALE_SECTORS = new Set(['barber']);
const FEMALE_HAIR_SECTORS = new Set(['hair']);

function catFor(name, sector) {
  const n = name.toLocaleLowerCase('tr-TR');
  if (/protez tırnak|manikür|pedikür|oje|nail art|tırnak kesimi|gel söküm/.test(n)) return 'nails';
  if (/kirpik|ipek|microblading|eyeliner|laminasyon|lifting/.test(n) && !/saç/.test(n)) return 'lash';
  if (/makyaj|gelin makyaj/.test(n)) return 'makeup';
  if (/ağda|epilasyon|lazer/.test(n)) return 'wax';
  if (/cilt|facial|hydrafacial|maske|peeling|komedon|ampül|gözaltı|bb glow|dermapen|botoks|prp|leke|akne|black mask/.test(n)) {
    // Berberde yüz bakımı / black mask → erkek berber havuzu
    if (MALE_SECTORS.has(sector) && /black mask|yüz bakımı/.test(n)) return 'barber';
    return 'skin';
  }

  // Erkek-kodlu anahtarlar
  if (/sakal|ustura|tıraş|fade|taper|makine|ense|damat|çizgi|erkek/.test(n)) return 'barber';

  // Kadın kuaför-kodlu anahtarlar
  if (/fön|balyaj|ombre|gelin saçı|maşa|topuz|röfle|keratin|brezilya|babylights|sombre|kaynak|protez saç|bukle|nişal|cila|gloss|tonlama|perma|dip boya|komple boya|dip açma/.test(n))
    return 'hair';

  // Kaş: berberde erkek kaş alma, kuaförde kadın
  if (/kaş/.test(n)) return MALE_SECTORS.has(sector) ? 'barber' : 'lash';

  // Genel saç / kesim / yıkama / şekil — sektöre göre cinsiyet
  if (/saç|kesim|yıkama|şekillendirme|wax|boya/.test(n)) {
    if (MALE_SECTORS.has(sector)) return 'barber';
    if (FEMALE_HAIR_SECTORS.has(sector)) return 'hair';
    return SECTOR_CAT[sector] === 'barber' ? 'barber' : 'hair';
  }

  if (/masaj|spa|sauna|jakuzi|kese|refleksoloji|aromaterapi|detoks/.test(n)) return 'spa';
  if (/pilates|yoga|nefes|meditasyon/.test(n)) return 'yoga';
  if (/fitness|pt seansı|wod|antrenman|sparring|crossfit/.test(n)) return 'fitness';
  if (/dans/.test(n)) return 'dance';
  if (/yüzme|havuz|kulvar/.test(n)) return 'pool';
  if (/saha|tenis|padel|basket|kort/.test(n)) return 'field';
  if (/diş|dolgu|kanal|beyazlat/.test(n)) return 'dental';
  if (/diyet|beslenme/.test(n)) return 'diet';
  if (/psik|çift \/ aile|ön görüş|tanışma|birebir|bireysel terapi|online seans|koçluk/.test(n)) return 'therapy';
  if (/veteriner|aşı|chip|tüy|yıkama \+ tarama|full grooming/.test(n)) return 'pet';
  if (/fotoğraf|çekim|portre|vesikalık|ürün çekim/.test(n)) return 'photo';
  if (/dış yıkama|iç temizleme|pasta|seramik|ppf/.test(n)) return 'car';
  if (/dövme|tattoo|piercing|cover-up/.test(n)) return 'tattoo';
  if (/solaryum/.test(n)) return 'solarium';
  if (/göz|lens|çerçeve/.test(n)) return 'optic';
  if (/müzik|bireysel ders/.test(n) && sector === 'music') return 'music';
  if (/özel ders|grup dersi/.test(n) && sector === 'tutoring') return 'education';
  if (
    /muayene|kontrol|enjeksiyon|panseuman|fizyo|ftr|osteopat|manuel|ayak bakımı|nasır|estetik|füe|dhi|konsültasyon|check-up/.test(
      n,
    )
  )
    return 'clinic';
  return SECTOR_CAT[sector] || 'skin';
}

function exactKey(sector, name) {
  return `${sector}::${name}`;
}

const nameSectors = {};
for (const sec of sectors) {
  for (const name of sec.services) {
    if (!nameSectors[name]) nameSectors[name] = [];
    nameSectors[name].push(sec.slug);
  }
}

const catUsed = {};
const exact = {}; // may include "sector::name" keys
const meta = {};

function pickUrl(cat, label) {
  const pool = POOLS[cat] || POOLS.skin;
  if (!catUsed[cat]) catUsed[cat] = new Set();
  for (const id of pool) {
    const url = img(id);
    if (!catUsed[cat].has(url)) {
      catUsed[cat].add(url);
      return url;
    }
  }
  const id = pool[catUsed[cat].size % pool.length];
  const chosen = `${img(id)}&svc=${encodeURIComponent(label)}`;
  catUsed[cat].add(chosen);
  return chosen;
}

// Global PIN (sektör bağımsız isimler — güzellik)
for (const [name, id] of Object.entries(PIN)) {
  // Berber-only pins: store under barber:: if name exists in barber
  const inBarber = (nameSectors[name] || []).includes('barber');
  const onlyBarber = inBarber && !(nameSectors[name] || []).some((s) => s !== 'barber');
  if (onlyBarber || ['Damat tıraşı', 'Fade / taper', 'Sakal tıraşı', 'Ustura tıraş (sıcak havlu)', 'Makine kesimi', 'Saç + sakal'].includes(name)) {
    const key = exactKey('barber', name);
    exact[key] = img(id);
    meta[key] = 'barber';
    if (!catUsed.barber) catUsed.barber = new Set();
    catUsed.barber.add(exact[key]);
  } else {
    exact[name] = img(id);
    meta[name] = catFor(name, 'beauty');
    const cat = meta[name];
    if (!catUsed[cat]) catUsed[cat] = new Set();
    catUsed[cat].add(exact[name]);
  }
}

for (const sec of sectors) {
  for (const name of sec.services) {
    const multi = (nameSectors[name] || []).length > 1;
    const key = multi ? exactKey(sec.slug, name) : name;
    if (exact[key] || exact[name] && !multi) continue;
    // PIN already set plain name — skip non-multi
    if (!multi && exact[name]) continue;

    const cat = catFor(name, sec.slug);
    const chosen = pickUrl(cat, multi ? `${sec.slug}:${name}` : name);
    exact[key] = chosen;
    meta[key] = cat;

    // Also set plain name for single-sector or first occurrence as fallback
    if (!exact[name]) {
      exact[name] = chosen;
      meta[name] = cat;
    }
  }
}

// Explicit dual mapping for Saç kesimi
exact[exactKey('hair', 'Saç kesimi')] = pickUrl('hair', 'hair:Saç kesimi');
exact[exactKey('barber', 'Saç kesimi')] = pickUrl('barber', 'barber:Saç kesimi');
meta[exactKey('hair', 'Saç kesimi')] = 'hair';
meta[exactKey('barber', 'Saç kesimi')] = 'barber';

// Audit: berber asla kadın hair havuzu görmesin
let badGender = 0;
for (const sec of sectors.filter((s) => s.slug === 'barber')) {
  for (const n of sec.services) {
    const key = exact[exactKey('barber', n)] ? exactKey('barber', n) : n;
    const url = exact[key] || exact[n];
    const baseId = (url || '').match(/photo-[a-z0-9-]+/)?.[0];
    const cat = meta[key] || meta[n];
    if (cat === 'hair' || (baseId && FEMALE_HAIR_IDS.has(baseId) && !MALE_BARBER_IDS.has(baseId))) {
      console.log('BAD_GENDER', n, cat, baseId);
      badGender += 1;
    }
  }
}

console.log('mapped', Object.keys(exact).length, 'badGender', badGender);
console.log('barber Saç kesimi', exact[exactKey('barber', 'Saç kesimi')]);
console.log('hair Saç kesimi', exact[exactKey('hair', 'Saç kesimi')]);
console.log('Damat', exact[exactKey('barber', 'Damat tıraşı')] || exact['Damat tıraşı']);

const exactLines = Object.entries(exact)
  .sort(([a], [b]) => a.localeCompare(b, 'tr'))
  .map(([name, url]) => `  ${JSON.stringify(name)}: ${JSON.stringify(url)},`)
  .join('\n');

const catLines = Object.entries(POOLS)
  .map(([k, ids]) => `  ${k}: [${ids.map((id) => `img(${JSON.stringify(id)})`).join(', ')}],`)
  .join('\n');

const BT = '`';
const DL = '$';

const header = `/**
 * Hizmet görselleri — kategori + cinsiyet/sektör kilitli.
 * hair = kadın kuaför; barber = erkek berber (kadın saç görseli yok).
 * Anahtar: "Hizmet" veya "sektor::Hizmet" (ortak isimler için).
 */

const img = (id: string) =>
  ${BT}https://images.unsplash.com/${DL}{id}?auto=format&fit=crop&w=700&q=80${BT};

export type ServiceImageCategory = keyof typeof CATEGORY_POOLS;

export const CATEGORY_POOLS = {
${catLines}
} as const;

export const SERVICE_IMAGE_EXACT: Record<string, string> = {
${exactLines}
};
`;

const runtime = `
const MALE_SECTORS = new Set(['barber']);
const FEMALE_HAIR_SECTORS = new Set(['hair']);

function normalize(name: string) {
  return name.trim().replace(/\\s+/g, ' ');
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

/** Hizmet adı + sektör → kategori (berberde saç kesimi asla kadın kuaför olmaz) */
export function categoryForServiceName(name: string, sectorSlug?: string | null): ServiceImageCategory {
  const n = normalize(name).toLocaleLowerCase('tr-TR');
  const sector = (sectorSlug || '').trim();

  if (/protez tırnak|manikür|pedikür|oje|nail|gel söküm/i.test(n)) return 'nails';
  if (/kirpik|ipek|microblading|eyeliner|laminasyon|lifting/i.test(n) && !/saç/i.test(n)) return 'lash';
  if (/makyaj/i.test(n)) return 'makeup';
  if (/ağda|epilasyon|lazer/i.test(n)) return 'wax';
  if (/cilt|facial|hydrafacial|maske|peeling|komedon|ampül|gözaltı|bb glow|dermapen|botoks|prp|leke|akne/i.test(n)) {
    if (MALE_SECTORS.has(sector) && /black mask|yüz bakımı/i.test(n)) return 'barber';
    return 'skin';
  }
  if (/sakal|ustura|tıraş|fade|taper|makine|ense|damat|çizgi|erkek/i.test(n)) return 'barber';
  if (/fön|balyaj|ombre|gelin|maşa|topuz|röfle|keratin|brezilya|babylights|sombre|kaynak|protez saç|bukle|cila|gloss|tonlama|perma|dip boya|komple boya/i.test(n))
    return 'hair';
  if (/kaş/i.test(n)) return MALE_SECTORS.has(sector) ? 'barber' : 'lash';
  if (/saç|kesim|yıkama|şekillendirme|wax|boya/i.test(n)) {
    if (MALE_SECTORS.has(sector)) return 'barber';
    if (FEMALE_HAIR_SECTORS.has(sector)) return 'hair';
    return 'hair';
  }
  if (/masaj|spa|sauna|jakuzi|kese|refleksoloji|aromaterapi|detoks/i.test(n)) return 'spa';
  if (/pilates|yoga|nefes|meditasyon/i.test(n)) return 'yoga';
  if (/fitness|pt seansı|wod|antrenman|sparring|crossfit/i.test(n)) return 'fitness';
  if (/dans/i.test(n)) return 'dance';
  if (/yüzme|havuz/i.test(n)) return 'pool';
  if (/saha|tenis|padel|basket|kort/i.test(n)) return 'field';
  if (/diş|dolgu|kanal|beyazlat/i.test(n)) return 'dental';
  if (/diyet|beslenme/i.test(n)) return 'diet';
  if (/psik|terapi|görüşme|koçluk/i.test(n)) return 'therapy';
  if (/veteriner|pet|aşı|chip|tüy|grooming/i.test(n)) return 'pet';
  if (/fotoğraf|çekim|portre|vesikalık/i.test(n)) return 'photo';
  if (/dış yıkama|iç temizleme|pasta|seramik|ppf/i.test(n)) return 'car';
  if (/dövme|tattoo|piercing/i.test(n)) return 'tattoo';
  if (/solaryum/i.test(n)) return 'solarium';
  if (/göz|lens|optik|çerçeve/i.test(n)) return 'optic';
  if (/müzik|piyano|gitar/i.test(n)) return 'music';
  if (/muayene|kontrol|klinik|fizyo|osteopat|estetik/i.test(n)) return 'clinic';
  if (MALE_SECTORS.has(sector)) return 'barber';
  if (FEMALE_HAIR_SECTORS.has(sector)) return 'hair';
  return 'skin';
}

function pickFromCategory(cat: ServiceImageCategory, used: Set<string>, seed: number, label: string): string {
  const pool = CATEGORY_POOLS[cat] || CATEGORY_POOLS.skin;
  for (let i = 0; i < pool.length; i += 1) {
    const src = pool[(seed + i) % pool.length];
    if (!used.has(src)) return src;
  }
  return ${BT}${DL}{pool[seed % pool.length]}&svc=${DL}{encodeURIComponent(label)}${BT};
}

function isCustomServicePhoto(photo: string): boolean {
  if (photo.startsWith('data:image/')) return true;
  if (!photo.startsWith('http')) return false;
  try {
    const host = new URL(photo).hostname;
    if (host.includes('unsplash.com') || host.includes('images.unsplash.com')) return false;
  } catch {
    return false;
  }
  return true;
}

function lookupExact(name: string, sectorSlug?: string | null): string | undefined {
  const n = normalize(name);
  const sector = (sectorSlug || '').trim();
  if (sector) {
    const keyed = SERVICE_IMAGE_EXACT[\`\${sector}::\${n}\`];
    if (keyed) return keyed;
  }
  return SERVICE_IMAGE_EXACT[n];
}

export function serviceImageSrc(
  name: string,
  photo?: string | null,
  used?: Set<string>,
  sectorSlug?: string | null,
): string {
  const own = (photo || '').trim();
  if (own && isCustomServicePhoto(own)) {
    used?.add(own);
    return own;
  }
  const n = normalize(name);
  const exactHit = lookupExact(n, sectorSlug);
  if (exactHit) {
    const base = exactHit.split('&svc=')[0];
    if (!used || !used.has(base)) {
      used?.add(base);
      return exactHit;
    }
  }
  const cat = categoryForServiceName(n, sectorSlug);
  const src = pickFromCategory(cat, used || new Set(), hashName(\`\${sectorSlug || ''}|\${n}\`), n);
  used?.add(src.split('&svc=')[0]);
  used?.add(src);
  return src;
}

export function assignServiceImages<T extends { id?: number; name: string; photo?: string | null }>(
  services: T[],
  opts?: { sectorSlug?: string | null },
): Map<number | string, string> {
  const used = new Set<string>();
  const out = new Map<number | string, string>();
  const sectorSlug = opts?.sectorSlug;
  for (const s of services) {
    out.set(s.id ?? s.name, serviceImageSrc(s.name, s.photo, used, sectorSlug));
  }
  return out;
}
`;

// Fix template literals in runtime that used escaped backticks incorrectly
const fixedRuntime = runtime
  .replace(/\\`\\$\{sector\}::\\$\{n\}\\`/g, '`${sector}::${n}`')
  .replace(/\\`\\$\{sectorSlug \|\| ''\}\|\\$\{n\}\\`/g, '`${sectorSlug || \'\'}|${n}`');

fs.writeFileSync(path.join(__dirname, 'serviceImage.ts'), header + fixedRuntime);
console.log('wrote serviceImage.ts');
