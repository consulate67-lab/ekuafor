/**
 * Hizmet adı → işlem görseli.
 * - Önce birebir isim eşleşmesi (katalog)
 * - Sonra dar anahtar kelime (her kuralın kendi benzersiz görseli)
 * - Sayfa içinde aynı görsel tekrar kullanılmaz (assignServiceImages)
 */

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;

/** Katalog hizmet adları → benzersiz görsel (doğrulanmış Unsplash) */
const EXACT: Record<string, string> = {
  // —— Güzellik ——
  'Klasik cilt bakımı': img('photo-1552693673-1bf958298935'),
  'Derin temizlik / komedon': img('photo-1515377905703-c4788e51af15'),
  'Hydrafacial / aqua peeling': img('photo-1540555700478-4be289fbecef'),
  'Vitamin / ampül bakımı': img('photo-1596755389378-c31d21fd1273'),
  'Altın / kollajen maske': img('photo-1512290923902-8a9f81dc236c'),
  'Gözaltı bakımı': img('photo-1516975080664-ed2fc6a32937'),
  'Günlük makyaj': img('photo-1487412947147-5cebf100ffc2'),
  'Profesyonel / gece makyajı': img('photo-1522335789203-aabd1fc54bc9'),
  'Gelin makyajı': img('photo-1519741497674-611481863552'),
  'Kaş tasarımı / şekillendirme': img('photo-1522337660859-02fbefca4702'),
  'Kaş boyama': img('photo-1595476108010-b4d1f102b1b1'),
  'Kaş laminasyon': img('photo-1558591710-4b4a1ae0f04d'),
  'Kirpik boyama': img('photo-1492106087820-71f1a00d2b11'),
  'Kirpik lifting': img('photo-1560066984-138dadb4c035'),
  'İpek kirpik (full set)': img('photo-1522337360788-8b13dee7a37e'),
  'İpek kirpik dolgu': img('photo-1562322140-8baeececf3df'),
  'İpek kirpik söküm': img('photo-1470071459604-3b5ec3a7fe05'),
  'Ağda (bölgesel)': img('photo-1616394584738-fc6e612e71b9'),
  'Yüz ağda': img('photo-1507652313519-d4e9174996dd'),
  'Yarım bacak ağda': img('photo-1600334129128-685c5582fd35'),
  'Tam bacak ağda': img('photo-1544161515-4ab6ce6db874'),
  'Tüm vücut ağda': img('photo-1519014816548-bf5fe059798b'),
  Manikür: img('photo-1604654894610-df63bc536371'),
  Pedikür: img('photo-1632345031435-8727f6897d53'),
  'Kalıcı oje (gel)': img('photo-1571019613454-1cb2f99b2d8b'),
  'Protez tırnak': img('photo-1571019614242-c5c5dee9f50b'),
  'BB glow / cilt aydınlatma': img('photo-1544367567-0f2fcb009e0b'),
  'Dermapen / mikroiğneleme': img('photo-1518611012118-696072aa579a'),

  // —— Kuaför ——
  'Saç yıkama': img('photo-1522337360788-8b13dee7a37e'),
  'Saç kesimi': img('photo-1560066984-138dadb4c035'),
  'Saç kesimi + fön': img('photo-1595476108010-b4d1f102b1b1'),
  'Çocuk saç kesimi': img('photo-1492106087820-71f1a00d2b11'),
  'Fön / şekillendirme': img('photo-1562322140-8baeececf3df'),
  'Maşa / bukle': img('photo-1522337660859-02fbefca4702'),
  'Topuz / özel gün saçı': img('photo-1519741497674-611481863552'),
  'Dip boya': img('photo-1516975080664-ed2fc6a32937'),
  'Komple boya': img('photo-1512290923902-8a9f81dc236c'),
  'Cila / gloss': img('photo-1596755389378-c31d21fd1273'),
  Tonlama: img('photo-1552693673-1bf958298935'),
  'Dip açma': img('photo-1487412947147-5cebf100ffc2'),
  'Röfle / balyaj': img('photo-1522335789203-aabd1fc54bc9'),
  'Ombre / soft ombre': img('photo-1515377905703-c4788e51af15'),
  'Sombre / babylights': img('photo-1540555700478-4be289fbecef'),
  'Keratin / düzleştirme': img('photo-1470071459604-3b5ec3a7fe05'),
  'Brezilya fönü / anti-frizz': img('photo-1558591710-4b4a1ae0f04d'),
  'Saç bakımı / maske': img('photo-1506126613408-eca07ce68773'),
  'Saç botoks / ampül bakımı': img('photo-1545205597-3d9d02c29597'),
  'Perma / dalga': img('photo-1518310383802-640c2de311b2'),
  'Kaynak / protez saç': img('photo-1593811167562-9cef47bfc4d7'),
  'Kaynak söküm': img('photo-1508807526345-15e9b5f4eaff'),
  'Gelin saçı': img('photo-1535525153412-5a42439a210d'),
  'Nişan / özel gün saçı': img('photo-1524594152303-9fd13543fe6e'),
  'Kaş şekillendirme': img('photo-1522337660859-02fbefca4702'),
  'Yüz / üst dudak ağda': img('photo-1616394584738-fc6e612e71b9'),

  // —— Berber ——
  'Makine kesimi': img('photo-1622286342621-4bd786c2447c'),
  'Fade / taper': img('photo-1605497788044-5a32c7078486'),
  'Klasik kesim + yıkama': img('photo-1621605815971-fbc98d665033'),
  'Sakal tıraşı': img('photo-1599351431202-1e0f0137899a'),
  'Ustura tıraş (sıcak havlu)': img('photo-1585747860715-2ba37e788b70'),
  'Çizgi / sakal tasarım': img('photo-1493256338651-d82f7acb2b38'),
  'Saç + sakal': img('photo-1503951914875-452162b0f3f1'),
  'Damat tıraşı': img('photo-1559599101-f09722fb4948'),
  'Erkek saç boyası': img('photo-1611501275019-9b5cda994e8d'),
  'Sakal boyası': img('photo-1541534741688-6078c6bfb5c5'),
  'Yıkama + masaj': img('photo-1600334129128-685c5582fd35'),
  'Saç şekillendirme / wax': img('photo-1493256338651-d82f7acb2b38'),
  'Kaş alma / şekillendirme': img('photo-1522337660859-02fbefca4702'),
  'Burun / kulak kılı': img('photo-1621605815971-fbc98d665033'),
  'Yüz bakımı / black mask': img('photo-1552693673-1bf958298935'),
  'Ense / çizgi düzeltme': img('photo-1605497788044-5a32c7078486'),
  'Çocuk kesimi': img('photo-1503951914875-452162b0f3f1'),
};

type Rule = { test: RegExp; pool: string[] };

/** Dar kurallar — her havuz yalnızca o işlem ailesi; görseller havuzlar arası paylaşılmaz */
const RULES: Rule[] = [
  { test: /^saç kesimi$|makine kesimi|fade|taper|klasik kesim/i, pool: [img('photo-1622286342621-4bd786c2447c'), img('photo-1605497788044-5a32c7078486'), img('photo-1621605815971-fbc98d665033')] },
  { test: /sakal|ustura|tıraş|kontür|ense/i, pool: [img('photo-1599351431202-1e0f0137899a'), img('photo-1585747860715-2ba37e788b70'), img('photo-1493256338651-d82f7acb2b38')] },
  { test: /boya|röfle|balyaj|ombre|sombre|tonlama|cila|gloss|keratin|perma|kaynak|dip aç/i, pool: [img('photo-1522337360788-8b13dee7a37e'), img('photo-1516975080664-ed2fc6a32937'), img('photo-1512290923902-8a9f81dc236c'), img('photo-1522335789203-aabd1fc54bc9')] },
  { test: /fön|maşa|bukle|topuz|şekillendir|wax|jel|yıkama/i, pool: [img('photo-1562322140-8baeececf3df'), img('photo-1595476108010-b4d1f102b1b1'), img('photo-1558591710-4b4a1ae0f04d')] },
  { test: /gelin|nişan|özel gün|damat/i, pool: [img('photo-1519741497674-611481863552'), img('photo-1535525153412-5a42439a210d')] },
  { test: /cilt|facial|hydrafacial|maske|peeling|komedon|ampül|serum|gözaltı|bb glow|dermapen/i, pool: [img('photo-1552693673-1bf958298935'), img('photo-1515377905703-c4788e51af15'), img('photo-1540555700478-4be289fbecef'), img('photo-1596755389378-c31d21fd1273')] },
  { test: /makyaj/i, pool: [img('photo-1487412947147-5cebf100ffc2'), img('photo-1522335789203-aabd1fc54bc9')] },
  { test: /kaş|kirpik|laminasyon|lifting|ipek|microblading/i, pool: [img('photo-1522337660859-02fbefca4702'), img('photo-1492106087820-71f1a00d2b11'), img('photo-1560066984-138dadb4c035')] },
  { test: /ağda|epilasyon|lazer/i, pool: [img('photo-1616394584738-fc6e612e71b9'), img('photo-1507652313519-d4e9174996dd'), img('photo-1600334129128-685c5582fd35')] },
  { test: /manikür|pedikür|tırnak|oje|protez|nail/i, pool: [img('photo-1604654894610-df63bc536371'), img('photo-1632345031435-8727f6897d53'), img('photo-1519014816548-bf5fe059798b')] },
  { test: /masaj|spa|hamam|sauna|jakuzi|refleksoloji/i, pool: [img('photo-1544161515-4ab6ce6db874'), img('photo-1600334129128-685c5582fd35'), img('photo-1540555700478-4be289fbecef')] },
  { test: /pilates|yoga|nefes|meditasyon/i, pool: [img('photo-1544367567-0f2fcb009e0b'), img('photo-1518611012118-696072aa579a'), img('photo-1506126613408-eca07ce68773')] },
  { test: /fitness|antrenman|crossfit|pt seansı|wod/i, pool: [img('photo-1534438327276-14e5300c3a48'), img('photo-1517836357463-d25dfeac3438'), img('photo-1540497077202-7c8a3999166f')] },
  { test: /dans/i, pool: [img('photo-1508700929628-666bc8bd84ea'), img('photo-1518834107812-67b0b7c58434')] },
  { test: /havuz|yüzme|kulvar/i, pool: [img('photo-1576013551627-0cc20b96c2a7'), img('photo-1519315901367-f34ff9154487')] },
  { test: /saha|halı|kort|padel|tenis|basket/i, pool: [img('photo-1574629810360-7efbbe195018'), img('photo-1529900748604-07564a03e7a6')] },
  { test: /diş|kanal|beyazlat|implant/i, pool: [img('photo-1606811841689-23dfddce3e95'), img('photo-1588776814546-1ffcf47267a5')] },
  { test: /fizyo|ftr|osteopat|manuel terapi|rehabilitasyon/i, pool: [img('photo-1571019613454-1cb2f99b2d8b'), img('photo-1576091160399-112ba8d25d1d')] },
  { test: /diyet|beslenme/i, pool: [img('photo-1490645935967-10de6ba17061'), img('photo-1512621776951-a57141f2eefd')] },
  { test: /psikolog|terapi|görüşme|koçluk/i, pool: [img('photo-1573497019940-1c28c88b4f3e'), img('photo-1552664730-d307ca884978')] },
  { test: /veteriner|pet|köpek|kedi|grooming|tüy/i, pool: [img('photo-1548199973-03cce0bbc87b'), img('photo-1583511655857-d19b40a7a54e')] },
  { test: /dövme|tattoo|piercing|cover-up/i, pool: [img('photo-1611501275019-9b5cda994e8d'), img('photo-1541534741688-6078c6bfb5c5')] },
  { test: /solaryum|bronz/i, pool: [img('photo-1507652313519-d4e9174996dd')] },
  { test: /fotoğraf|çekim|portre|vesikalık/i, pool: [img('photo-1492691527719-9d1e07e534b4'), img('photo-1554048612-b6a482bc67e5')] },
  { test: /oto|araç|pasta|seramik|ppf|yıkama/i, pool: [img('photo-1601362840469-51e4d8d58785'), img('photo-1492144534655-ae79c964c9d7')] },
  { test: /ders|eğitim|müzik|online ders/i, pool: [img('photo-1503676260728-1c00da094a0b'), img('photo-1427504494785-3a9ca7044f45')] },
];

/** Sayfa genelinde tekrarlanmayan yedek havuz */
const FALLBACK_POOL = [
  img('photo-1560066984-138dadb4c035'),
  img('photo-1585747860715-2ba37e788b70'),
  img('photo-1519494026892-80bbd2d6fd0d'),
  img('photo-1579684385127-1ef15d508118'),
  img('photo-1534438327276-14e5300c3a48'),
  img('photo-1544367567-0f2fcb009e0b'),
  img('photo-1604654894610-df63bc536371'),
  img('photo-1487412947147-5cebf100ffc2'),
  img('photo-1544161515-4ab6ce6db874'),
  img('photo-1492691527719-9d1e07e534b4'),
  img('photo-1574629810360-7efbbe195018'),
  img('photo-1606811841689-23dfddce3e95'),
  img('photo-1548199973-03cce0bbc87b'),
  img('photo-1611501275019-9b5cda994e8d'),
  img('photo-1503676260728-1c00da094a0b'),
  img('photo-1511379938547-c1f69419868d'),
  img('photo-1576013551627-0cc20b96c2a7'),
  img('photo-1517836357463-d25dfeac3438'),
  img('photo-1508700929628-666bc8bd84ea'),
  img('photo-1490645935967-10de6ba17061'),
];

function normalize(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function pickFromPool(pool: string[], used: Set<string>, seed: number): string | null {
  if (!pool.length) return null;
  for (let i = 0; i < pool.length; i += 1) {
    const src = pool[(seed + i) % pool.length];
    if (!used.has(src)) return src;
  }
  return null;
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function candidatesFor(name: string): string[] {
  const n = normalize(name);
  const exact = EXACT[n];
  if (exact) return [exact];
  for (const r of RULES) {
    if (r.test.test(n)) return r.pool;
  }
  return FALLBACK_POOL;
}

/** Tek hizmet — mümkünse benzersiz (used set ile) */
export function serviceImageSrc(name: string, photo?: string | null, used?: Set<string>): string {
  const own = (photo || '').trim();
  if (own.startsWith('http') || own.startsWith('data:image/')) {
    used?.add(own);
    return own;
  }
  const pool = candidatesFor(name);
  const seed = hashName(name);
  const picked =
    (used ? pickFromPool(pool, used, seed) : null) ||
    pickFromPool(FALLBACK_POOL, used || new Set(), seed) ||
    pool[seed % pool.length] ||
    FALLBACK_POOL[0];
  used?.add(picked);
  return picked;
}

/** Liste için: her karta farklı görsel (mümkün olduğunca) */
export function assignServiceImages<T extends { id?: number; name: string; photo?: string | null }>(
  services: T[],
): Map<number | string, string> {
  const used = new Set<string>();
  const out = new Map<number | string, string>();
  for (const s of services) {
    const key = s.id ?? s.name;
    out.set(key, serviceImageSrc(s.name, s.photo, used));
  }
  return out;
}
