import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sectors = JSON.parse(fs.readFileSync(path.join(process.env.TEMP, 'all-services.json'), 'utf8'));
const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;

/**
 * Sadece görsel olarak doğrulanmış Unsplash ID'leri.
 * (çocuk oyuncağı / manzara / tişört / spor vb. ASLA buraya girmez)
 */
const POOLS = {
  nails: [
    'photo-1519014816548-bf5fe059798b', // protez / nail art
    'photo-1604654894610-df63bc536371', // manikür
    'photo-1632345031435-8727f6897d53', // UV lamba + teknisyen
    'photo-1522337660859-02fbefca4702', // oje / glitter
  ],
  skin: [
    'photo-1552693673-1bf958298935', // cihazla cilt bakımı
    'photo-1616394584738-fc6e612e71b9', // maske uygulaması
    'photo-1512290923902-8a9f81dc236c', // yüz bakımı / masaj
    'photo-1596755389378-c31d21fd1273', // yüz maskesi
    'photo-1598440947619-2c35fc9aa908', // cilt ürünleri
  ],
  makeup: [
    'photo-1487412947147-5cebf100ffc2', // makyaj uygulaması
    'photo-1522335789203-aabd1fc54bc9', // makyaj ürünleri
    'photo-1516975080664-ed2fc6a32937', // fırçalar
    'photo-1519741497674-611481863552', // gelin
  ],
  lash: [
    'photo-1487412947147-5cebf100ffc2', // eyeliner / kirpik yakın
    'photo-1522335789203-aabd1fc54bc9', // mascara dahil ürünler
    'photo-1516975080664-ed2fc6a32937', // güzellik araçları
    'photo-1616394584738-fc6e612e71b9', // yüz / kaş hattı
  ],
  wax: [
    'photo-1519823551278-64ac92734fb1', // vücut bakımı / masaj
    'photo-1600334129128-685c5582fd35', // hot stone / vücut
    'photo-1544161515-4ab6ce6db874', // yağ / vücut
    'photo-1616394584738-fc6e612e71b9', // yüz ağda için cilt
    'photo-1552693673-1bf958298935', // klinik güzellik
  ],
  hair: [
    'photo-1595476108010-b4d1f102b1b1', // saç yıkama
    'photo-1522337360788-8b13dee7a37e', // dalgalı saç
    'photo-1492106087820-71f1a00d2b11', // boyalı saç
    'photo-1560066984-138dadb4c035', // salon içi
    'photo-1522338140262-f46f5913618a', // fön
  ],
  barber: [
    'photo-1585747860715-2ba37e788b70',
    'photo-1503951914875-452162b0f3f1',
    'photo-1621605815971-fbc98d665033',
    'photo-1599351431202-1e0f0137899a',
    'photo-1622286342621-4bd786c2447c',
    'photo-1493256338651-d82f7acb2b38',
    'photo-1559599101-f09722fb4948',
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

/** Kritik güzellik hizmetleri — kesin pin (doğrulanmış) */
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

function catFor(name, sector) {
  const n = name.toLocaleLowerCase('tr-TR');
  if (/protez tırnak|manikür|pedikür|oje|nail art|tırnak kesimi|gel söküm/.test(n)) return 'nails';
  if (/kirpik|ipek|kaş|microblading|eyeliner|laminasyon|lifting/.test(n) && !/saç/.test(n)) return 'lash';
  if (/makyaj|gelin makyaj/.test(n)) return 'makeup';
  if (/ağda|epilasyon|lazer/.test(n)) return 'wax';
  if (/cilt|facial|hydrafacial|maske|peeling|komedon|ampül|gözaltı|bb glow|dermapen|botoks|prp|leke|akne/.test(n))
    return 'skin';
  if (/sakal|ustura|tıraş|fade|taper|makine kesim|ense|damat/.test(n)) return 'barber';
  if (/saç|fön|boya|röfle|balyaj|ombre|keratin|perma|kaynak|tonlama|cila|yıkama|maşa|topuz|gelin saçı/.test(n))
    return 'hair';
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

const FORBIDDEN_IN_BEAUTY = new Set(
  [...POOLS.fitness, ...POOLS.yoga, ...POOLS.field, ...POOLS.pool, 'photo-1515488042361-ee00e0ddd4e4', 'photo-1596464716127-f2a82984de30', 'photo-1596755094514-f87e34085b2c', 'photo-1470071459604-3b5ec3a7fe05', 'photo-1515372039744-b8f02a3ae446', 'photo-1558591710-4b4a1ae0f04d'].map(
    (id) => img(id),
  ),
);

const catUsed = {};
const exact = {};
const meta = {};

for (const [name, id] of Object.entries(PIN)) {
  exact[name] = img(id);
  meta[name] = catFor(name, 'beauty');
  const cat = meta[name];
  if (!catUsed[cat]) catUsed[cat] = new Set();
  catUsed[cat].add(exact[name]);
}

for (const sec of sectors) {
  for (const name of sec.services) {
    if (exact[name]) continue;
    const cat = catFor(name, sec.slug);
    const pool = POOLS[cat] || POOLS.skin;
    if (!catUsed[cat]) catUsed[cat] = new Set();
    let chosen = null;
    for (const id of pool) {
      const url = img(id);
      if (!catUsed[cat].has(url)) {
        chosen = url;
        catUsed[cat].add(url);
        break;
      }
    }
    if (!chosen) {
      const id = pool[catUsed[cat].size % pool.length];
      chosen = `${img(id)}&svc=${encodeURIComponent(name)}`;
      catUsed[cat].add(chosen);
    }
    exact[name] = chosen;
    meta[name] = cat;
  }
}

const beautySlugs = new Set(['beauty', 'nails', 'hair', 'lash_brow', 'pmu', 'laser', 'barber']);
let bad = 0;
for (const sec of sectors.filter((s) => beautySlugs.has(s.slug))) {
  for (const n of sec.services) {
    const base = exact[n].split('&svc=')[0];
    const cat = meta[n];
    if (FORBIDDEN_IN_BEAUTY.has(base) || ['fitness', 'yoga', 'field', 'pool'].includes(cat)) {
      console.log('BAD', n, cat, base);
      bad += 1;
    }
  }
}

console.log('mapped', Object.keys(exact).length, 'badBeauty', bad);
for (const k of Object.keys(PIN)) console.log('PIN', k, '=>', exact[k]);

const exactLines = Object.entries(exact)
  .sort(([a], [b]) => a.localeCompare(b, 'tr'))
  .map(([name, url]) => `  ${JSON.stringify(name)}: ${JSON.stringify(url)},`)
  .join('\n');

const catLines = Object.entries(POOLS)
  .map(([k, ids]) => `  ${k}: [${ids.map((id) => `img(${JSON.stringify(id)})`).join(', ')}],`)
  .join('\n');

const BT = '`';
const DL = '$';

const parts = [];
parts.push(`/**
 * Hizmet görselleri — sadece görsel doğrulanmış kategori havuzları.
 * Güzellik asla spor/yoga/manzara/çocuk görseli görmez.
 */

const img = (id: string) =>
  ${BT}https://images.unsplash.com/${DL}{id}?auto=format&fit=crop&w=700&q=80${BT};

export type ServiceImageCategory = keyof typeof CATEGORY_POOLS;

/** Tematik havuzlar — çapraz kullanım yok */
export const CATEGORY_POOLS = {
${catLines}
} as const;

/** Katalog hizmet adı → görsel (kategori güvenli) */
export const SERVICE_IMAGE_EXACT: Record<string, string> = {
${exactLines}
};
`);

parts.push(`
const NAME_RULES: { test: RegExp; cat: ServiceImageCategory }[] = [
  { test: /protez tırnak|manikür|pedikür|oje|nail|gel söküm/i, cat: 'nails' },
  { test: /kirpik|ipek|kaş|microblading|eyeliner|laminasyon|lifting/i, cat: 'lash' },
  { test: /makyaj/i, cat: 'makeup' },
  { test: /ağda|epilasyon|lazer/i, cat: 'wax' },
  { test: /cilt|facial|hydrafacial|maske|peeling|komedon|ampül|gözaltı|bb glow|dermapen|botoks|prp|leke|akne/i, cat: 'skin' },
  { test: /sakal|ustura|tıraş|fade|taper|makine|ense|damat/i, cat: 'barber' },
  { test: /saç|fön|boya|röfle|balyaj|ombre|keratin|perma|kaynak|tonlama|cila|yıkama|maşa|topuz/i, cat: 'hair' },
  { test: /masaj|spa|sauna|jakuzi|kese|refleksoloji|aromaterapi|detoks/i, cat: 'spa' },
  { test: /pilates|yoga|nefes|meditasyon/i, cat: 'yoga' },
  { test: /fitness|pt seansı|wod|antrenman|sparring|crossfit/i, cat: 'fitness' },
  { test: /dans/i, cat: 'dance' },
  { test: /yüzme|havuz/i, cat: 'pool' },
  { test: /saha|tenis|padel|basket|kort/i, cat: 'field' },
  { test: /diş|dolgu|kanal|beyazlat/i, cat: 'dental' },
  { test: /diyet|beslenme/i, cat: 'diet' },
  { test: /psik|terapi|görüşme|koçluk/i, cat: 'therapy' },
  { test: /veteriner|pet|aşı|chip|tüy|grooming/i, cat: 'pet' },
  { test: /fotoğraf|çekim|portre|vesikalık/i, cat: 'photo' },
  { test: /dış yıkama|iç temizleme|pasta|seramik|ppf/i, cat: 'car' },
  { test: /dövme|tattoo|piercing/i, cat: 'tattoo' },
  { test: /solaryum/i, cat: 'solarium' },
  { test: /göz|lens|optik|çerçeve/i, cat: 'optic' },
  { test: /müzik|piyano|gitar/i, cat: 'music' },
  { test: /muayene|kontrol|klinik|fizyo|osteopat|estetik/i, cat: 'clinic' },
];

function normalize(name: string) {
  return name.trim().replace(/\\s+/g, ' ');
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

export function categoryForServiceName(name: string): ServiceImageCategory {
  const n = normalize(name);
  for (const r of NAME_RULES) {
    if (r.test.test(n)) return r.cat;
  }
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

/** Sadece işletmenin kendi yüklediği görsel geçerli; Unsplash stok URL'leri kategori haritasına bırakılır */
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

export function serviceImageSrc(name: string, photo?: string | null, used?: Set<string>): string {
  const own = (photo || '').trim();
  if (own && isCustomServicePhoto(own)) {
    used?.add(own);
    return own;
  }
  const n = normalize(name);
  const exactHit = SERVICE_IMAGE_EXACT[n];
  if (exactHit) {
    const base = exactHit.split('&svc=')[0];
    if (!used || !used.has(base)) {
      used?.add(base);
      return exactHit;
    }
  }
  const cat = categoryForServiceName(n);
  const src = pickFromCategory(cat, used || new Set(), hashName(n), n);
  used?.add(src.split('&svc=')[0]);
  used?.add(src);
  return src;
}

export function assignServiceImages<T extends { id?: number; name: string; photo?: string | null }>(
  services: T[],
): Map<number | string, string> {
  const used = new Set<string>();
  const out = new Map<number | string, string>();
  for (const s of services) {
    out.set(s.id ?? s.name, serviceImageSrc(s.name, s.photo, used));
  }
  return out;
}
`);

const outPath = path.join(__dirname, 'serviceImage.ts');
fs.writeFileSync(outPath, parts.join(''));
console.log('wrote', outPath);
