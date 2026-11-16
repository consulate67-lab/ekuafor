/**
 * Hizmet kartı görselleri — her katalog adı için tekil Unsplash id.
 * assignServiceImages sayfa içinde tekrar kullanımını engeller.
 */

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;

/** Birebir eşleşme — değerler birbirinden farklı olmalı */
const EXACT: Record<string, string> = {
  'Klasik cilt bakımı': img('photo-1552693673-1bf958298935'),
  'Derin temizlik / komedon': img('photo-1515377905703-c4788e51af15'),
  'Hydrafacial / aqua peeling': img('photo-1540555700478-4be289fbecef'),
  'Vitamin / ampül bakımı': img('photo-1596755389378-c31d21fd1273'),
  'Altın / kollajen maske': img('photo-1512290923902-8a9f81dc236c'),
  'Gözaltı bakımı': img('photo-1516975080664-ed2fc6a32937'),
  'BB glow / cilt aydınlatma': img('photo-1576091160399-112ba8d25d1d'),
  'Dermapen / mikroiğneleme': img('photo-1666214280557-f1b5022eb634'),
  'Günlük makyaj': img('photo-1487412947147-5cebf100ffc2'),
  'Profesyonel / gece makyajı': img('photo-1522335789203-aabd1fc54bc9'),
  'Gelin makyajı': img('photo-1519741497674-611481863552'),
  'Kaş tasarımı / şekillendirme': img('photo-1522337660859-02fbefca4702'),
  'Kaş boyama': img('photo-1595476108010-b4d1f102b1b1'),
  'Kaş laminasyon': img('photo-1558591710-4b4a1ae0f04d'),
  'Kirpik boyama': img('photo-1492106087820-71f1a00d2b11'),
  'Kirpik lifting': img('photo-1470071459604-3b5ec3a7fe05'),
  'İpek kirpik (full set)': img('photo-1560066984-138dadb4c035'),
  'İpek kirpik dolgu': img('photo-1522337360788-8b13dee7a37e'),
  'İpek kirpik söküm': img('photo-1518611012118-696072aa579a'),
  'Ağda (bölgesel)': img('photo-1616394584738-fc6e612e71b9'),
  'Yüz ağda': img('photo-1507652313519-d4e9174996dd'),
  'Yarım bacak ağda': img('photo-1600334129128-685c5582fd35'),
  'Tam bacak ağda': img('photo-1544161515-4ab6ce6db874'),
  'Tüm vücut ağda': img('photo-1545205597-3d9d02c29597'),
  'Yüz / üst dudak ağda': img('photo-1518310383802-640c2de311b2'),
  Manikür: img('photo-1604654894610-df63bc536371'),
  Pedikür: img('photo-1632345031435-8727f6897d53'),
  'Kalıcı oje (gel)': img('photo-1519014816548-bf5fe059798b'),
  'Protez tırnak': img('photo-1571019614242-c5c5dee9f50b'),
  'Saç yıkama': img('photo-1562322140-8baeececf3df'),
  'Saç kesimi': img('photo-1593811167562-9cef47bfc4d7'),
  'Saç kesimi + fön': img('photo-1506126613408-eca07ce68773'),
  'Çocuk saç kesimi': img('photo-1508807526345-15e9b5f4eaff'),
  'Fön / şekillendirme': img('photo-1535525153412-5a42439a210d'),
  'Maşa / bukle': img('photo-1524594152303-9fd13543fe6e'),
  'Topuz / özel gün saçı': img('photo-1508700929628-666bc8bd84ea'),
  'Dip boya': img('photo-1517836357463-d25dfeac3438'),
  'Komple boya': img('photo-1540497077202-7c8a3999166f'),
  'Cila / gloss': img('photo-1434682881908-b43d0467b798'),
  Tonlama: img('photo-1571902943202-507ec2618e8f'),
  'Dip açma': img('photo-1571019613454-1cb2f99b2d8b'),
  'Röfle / balyaj': img('photo-1518834107812-67b0b7c58434'),
  'Ombre / soft ombre': img('photo-1504609813442-a8924e83f76e'),
  'Sombre / babylights': img('photo-1544367567-0f2fcb009e0b'),
  'Keratin / düzleştirme': img('photo-1576013551627-0cc20b96c2a7'),
  'Brezilya fönü / anti-frizz': img('photo-1519315901367-f34ff9154487'),
  'Saç bakımı / maske': img('photo-1575429198097-0414ec08e8cd'),
  'Saç botoks / ampül bakımı': img('photo-1530549387789-4c1017266635'),
  'Perma / dalga': img('photo-1600965962102-9d260a71890d'),
  'Kaynak / protez saç': img('photo-1574629810360-7efbbe195018'),
  'Kaynak söküm': img('photo-1529900748604-07564a03e7a6'),
  'Gelin saçı': img('photo-1552674605-db6ffd4facb5'),
  'Nişan / özel gün saçı': img('photo-1431324155629-1a6deb1dec8d'),
  'Kaş şekillendirme': img('photo-1606811841689-23dfddce3e95'),
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
  'Yıkama + masaj': img('photo-1588776814546-1ffcf47267a5'),
  'Saç şekillendirme / wax': img('photo-1629909613654-28e377c37b09'),
  'Kaş alma / şekillendirme': img('photo-1609840114035-3c981b782dfe'),
  'Burun / kulak kılı': img('photo-1598256989800-fe5f95da9787'),
  'Yüz bakımı / black mask': img('photo-1519494026892-80bbd2d6fd0d'),
  'Ense / çizgi düzeltme': img('photo-1579684385127-1ef15d508118'),
  'Çocuk kesimi': img('photo-1582750433449-648ed127bb54'),
};

const FALLBACK_POOL = [
  img('photo-1492691527719-9d1e07e534b4'),
  img('photo-1554048612-b6a482bc67e5'),
  img('photo-1516035069371-29a1b244cc32'),
  img('photo-1542038784456-1ea8e935640e'),
  img('photo-1493863641943-9b68992a8d07'),
  img('photo-1601362840469-51e4d8d58785'),
  img('photo-1492144534655-ae79c964c9d7'),
  img('photo-1503376780353-7e6692767b70'),
  img('photo-1552519507-da3b142c6e3d'),
  img('photo-1619642751034-765dfdf7c58e'),
  img('photo-1609521263047-f8f205293f24'),
  img('photo-1485291571150-772bcfc10da5'),
  img('photo-1552664730-d307ca884978'),
  img('photo-1522202176988-66273c2fd55f'),
  img('photo-1600880292203-757bb62b4baf'),
  img('photo-1519389950473-47ba0277781c'),
  img('photo-1503676260728-1c00da094a0b'),
  img('photo-1427504494785-3a9ca7044f45'),
  img('photo-1509062522246-3755977927d7'),
  img('photo-1434030216411-0b793f4b4173'),
  img('photo-1523240795612-9a054b0db644'),
  img('photo-1524178232363-1fb2b075b655'),
  img('photo-1497633762265-9d179a990aa6'),
  img('photo-1511379938547-c1f69419868d'),
  img('photo-1507838153414-b4b713384a76'),
  img('photo-1510915361894-db8b60106cb1'),
  img('photo-1493225457124-a3eb161ffa5f'),
  img('photo-1577803645773-f96470509666'),
  img('photo-1473496169904-658ba7c44d8a'),
  img('photo-1511499767150-a48a237f0083'),
  img('photo-1483412033650-1015ddeb83d1'),
  img('photo-1450778869180-41d0601e046e'),
  img('photo-1548199973-03cce0bbc87b'),
  img('photo-1583511655857-d19b40a7a54e'),
  img('photo-1454165804606-c3d57bc86b40'),
  img('photo-1516321318423-f06f85e504b3'),
];

type Rule = { test: RegExp; pool: string[] };

const RULES: Rule[] = [
  {
    test: /sakal|ustura|tıraş|fade|taper|makine|ense/i,
    pool: [
      img('photo-1622286342621-4bd786c2447c'),
      img('photo-1605497788044-5a32c7078486'),
      img('photo-1599351431202-1e0f0137899a'),
      img('photo-1585747860715-2ba37e788b70'),
    ],
  },
  {
    test: /cilt|facial|hydrafacial|maske|peeling|dermapen|bb glow|ampül|gözaltı|komedon/i,
    pool: [
      img('photo-1552693673-1bf958298935'),
      img('photo-1515377905703-c4788e51af15'),
      img('photo-1540555700478-4be289fbecef'),
      img('photo-1666214280557-f1b5022eb634'),
      img('photo-1576091160399-112ba8d25d1d'),
    ],
  },
  {
    test: /makyaj/i,
    pool: [img('photo-1487412947147-5cebf100ffc2'), img('photo-1519741497674-611481863552'), img('photo-1522335789203-aabd1fc54bc9')],
  },
  {
    test: /kaş|kirpik|ipek|laminasyon|lifting/i,
    pool: [
      img('photo-1522337660859-02fbefca4702'),
      img('photo-1560066984-138dadb4c035'),
      img('photo-1522337360788-8b13dee7a37e'),
      img('photo-1492106087820-71f1a00d2b11'),
    ],
  },
  {
    test: /ağda|epilasyon|lazer/i,
    pool: [img('photo-1616394584738-fc6e612e71b9'), img('photo-1507652313519-d4e9174996dd'), img('photo-1600334129128-685c5582fd35')],
  },
  {
    test: /manikür|pedikür|tırnak|oje|protez|nail/i,
    pool: [img('photo-1604654894610-df63bc536371'), img('photo-1632345031435-8727f6897d53'), img('photo-1519014816548-bf5fe059798b')],
  },
  {
    test: /boya|röfle|balyaj|ombre|keratin|perma|kaynak|tonlama|cila/i,
    pool: [
      img('photo-1516975080664-ed2fc6a32937'),
      img('photo-1512290923902-8a9f81dc236c'),
      img('photo-1596755389378-c31d21fd1273'),
      img('photo-1518834107812-67b0b7c58434'),
    ],
  },
  {
    test: /fön|maşa|yıkama|şekillendir|wax|bukle|topuz/i,
    pool: [img('photo-1562322140-8baeececf3df'), img('photo-1595476108010-b4d1f102b1b1'), img('photo-1535525153412-5a42439a210d')],
  },
  {
    test: /kesim|saç/i,
    pool: [img('photo-1593811167562-9cef47bfc4d7'), img('photo-1621605815971-fbc98d665033'), img('photo-1503951914875-452162b0f3f1')],
  },
];

function normalize(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function pickUnused(pool: string[], used: Set<string>, seed: number): string | null {
  for (let i = 0; i < pool.length; i += 1) {
    const src = pool[(seed + i) % pool.length];
    if (!used.has(src)) return src;
  }
  return null;
}

function candidatesFor(name: string): string[] {
  const n = normalize(name);
  const exact = EXACT[n];
  if (exact) return [exact];
  for (const r of RULES) {
    if (r.test.test(n)) return [...r.pool];
  }
  return [...FALLBACK_POOL];
}

export function serviceImageSrc(name: string, photo?: string | null, used?: Set<string>): string {
  const own = (photo || '').trim();
  if (own.startsWith('http') || own.startsWith('data:image/')) {
    used?.add(own);
    return own;
  }
  const seed = hashName(name);
  const primary = candidatesFor(name);
  const picked =
    pickUnused(primary, used || new Set(), seed) ||
    pickUnused(FALLBACK_POOL, used || new Set(), seed) ||
    `${primary[0] || FALLBACK_POOL[0]}&uniq=${seed}`;
  used?.add(picked.split('&uniq=')[0]);
  used?.add(picked);
  return picked;
}

export function assignServiceImages<T extends { id?: number; name: string; photo?: string | null }>(
  services: T[],
): Map<number | string, string> {
  const used = new Set<string>();
  const out = new Map<number | string, string>();
  const ranked = [...services].sort((a, b) => {
    const ae = EXACT[normalize(a.name)] ? 0 : 1;
    const be = EXACT[normalize(b.name)] ? 0 : 1;
    return ae - be || a.name.localeCompare(b.name, 'tr');
  });
  for (const s of ranked) {
    out.set(s.id ?? s.name, serviceImageSrc(s.name, s.photo, used));
  }
  // Son kontrol: aynı görsel kaldıysa fallback ile zorla ayır
  const seen = new Set<string>();
  for (const s of ranked) {
    const key = s.id ?? s.name;
    let src = out.get(key)!;
    const base = src.split('&uniq=')[0];
    if (seen.has(base)) {
      const alt =
        pickUnused(FALLBACK_POOL, seen, hashName(s.name + key)) ||
        `${FALLBACK_POOL[hashName(String(key)) % FALLBACK_POOL.length]}&uniq=${hashName(String(key))}`;
      out.set(key, alt);
      seen.add(alt.split('&uniq=')[0]);
    } else {
      seen.add(base);
    }
  }
  return out;
}
