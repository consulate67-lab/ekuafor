/** Hizmet adına göre sektörel / işlem görseli (Unsplash — doğrulanmış id’ler) */

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;

type Rule = { test: RegExp; src: string };

const RULES: Rule[] = [
  { test: /kesim|fade|taper|makine|berber|tıraş|sakal|ustura|ense|kontür/i, src: img('photo-1622286342621-4bd786c2447c') },
  { test: /boya|röfle|balyaj|ombre|sombre|tonlama|cila|gloss|renk|keratin|düzleştir|brezilya|perma|kaynak/i, src: img('photo-1522337360788-8b13dee7a37e') },
  { test: /fön|maşa|bukle|topuz|şekillendir|wax|jel|yıkama/i, src: img('photo-1562322140-8baeececf3df') },
  { test: /gelin|nişan|özel gün|damat/i, src: img('photo-1519741497674-611481863552') },
  { test: /cilt|facial|hydrafacial|maske|peeling|komedon|nem|bb glow|ampül|serum|gözaltı/i, src: img('photo-1552693673-1bf958298935') },
  { test: /makyaj|fondöten|ruj/i, src: img('photo-1487412947147-5cebf100ffc2') },
  { test: /kaş|kirpik|laminasyon|lifting|ipek|microblading|kalıcı makyaj|pmu/i, src: img('photo-1522337660859-02fbefca4702') },
  { test: /ağda|epilasyon|lazer/i, src: img('photo-1616394584738-fc6e612e71b9') },
  { test: /manikür|pedikür|tırnak|oje|protez|nail/i, src: img('photo-1604654894610-df63bc536371') },
  { test: /masaj|spa|hamam|ritüel|vücut bakımı/i, src: img('photo-1544161515-4ab6ce6db874') },
  { test: /pilates|yoga|nefes|mat/i, src: img('photo-1544367567-0f2fcb009e0b') },
  { test: /fitness|antrenman|crossfit|güç|kondisyon/i, src: img('photo-1534438327276-14e5300c3a48') },
  { test: /dans|koreografi|ritim/i, src: img('photo-1508700929628-666bc8bd84ea') },
  { test: /havuz|yüzme|kulvar/i, src: img('photo-1576013551627-0cc20b96c2a7') },
  { test: /saha|halı|tesis|kiralama/i, src: img('photo-1574629810360-7efbbe195018') },
  { test: /diş|ortodonti|implant|kanal/i, src: img('photo-1606811841689-23dfddce3e95') },
  { test: /fizyo|rehabilitasyon|osteopat|manuel/i, src: img('photo-1571019613454-1cb2f99b2d8b') },
  { test: /diyet|beslenme/i, src: img('photo-1490645935967-10de6ba17061') },
  { test: /psikolog|terapi|görüşme/i, src: img('photo-1573497019940-1c28c88b4f3e') },
  { test: /veteriner|pet|köpek|kedi|tüy/i, src: img('photo-1548199973-03cce0bbc87b') },
  { test: /dövme|tattoo|piercing/i, src: img('photo-1611501275019-9b5cda994e8d') },
  { test: /solaryum|bronz/i, src: img('photo-1507652313519-d4e9174996dd') },
  { test: /fotoğraf|çekim|stüdyo/i, src: img('photo-1492691527719-9d1e07e534b4') },
  { test: /oto|araç|detail|polish/i, src: img('photo-1601362840469-51e4d8d58785') },
  { test: /ders|eğitim|koç|özel ders|müzik/i, src: img('photo-1503676260728-1c00da094a0b') },
];

const FALLBACKS = [
  img('photo-1560066984-138dadb4c035'),
  img('photo-1522335789203-aabd1fc54bc9'),
  img('photo-1516975080664-ed2fc6a32937'),
  img('photo-1512290923902-8a9f81dc236c'),
  img('photo-1585747860715-2ba37e788b70'),
  img('photo-1515377905703-c4788e51af15'),
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

/** Önce service.photo, yoksa isim kuralı, yoksa kararlı fallback */
export function serviceImageSrc(name: string, photo?: string | null): string {
  const own = (photo || '').trim();
  if (own.startsWith('http') || own.startsWith('data:image/')) return own;
  const n = name || '';
  for (const r of RULES) {
    if (r.test.test(n)) return r.src;
  }
  return FALLBACKS[hashName(n) % FALLBACKS.length];
}
