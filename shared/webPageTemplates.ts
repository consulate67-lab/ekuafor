/**
 * Her sektör için 10 hazır web sayfası şablonu.
 * Tablet parametrelerinde firmanın sektörüne göre listelenir; seçilen id sunucuya yazılır.
 */

export type WebTemplateTheme = {
  heroFrom: string;
  heroTo: string;
  accent: string;
  accentSoft: string;
  cta: string;
  surface: string;
};

export type WebTemplateNews = { tag: string; title: string; summary: string };

export type WebPageTemplate = {
  id: string;
  sectorSlug: string;
  name: string;
  styleName: string;
  theme: WebTemplateTheme;
  tagline: string;
  about: string;
  gallery: { src: string; alt: string }[];
  news: WebTemplateNews[];
};

type SectorSeed = {
  slug: string;
  label: string;
  photos: string[];
  taglines: string[];
  abouts: string[];
  news: WebTemplateNews[];
};

const STYLES: { key: string; name: string; theme: WebTemplateTheme }[] = [
  {
    key: '01',
    name: 'Klasik',
    theme: {
      heroFrom: '#1e293b',
      heroTo: '#0f172a',
      accent: '#334155',
      accentSoft: '#f1f5f9',
      cta: 'bg-slate-800',
      surface: '#ffffff',
    },
  },
  {
    key: '02',
    name: 'Modern',
    theme: {
      heroFrom: '#4f46e5',
      heroTo: '#0f172a',
      accent: '#4f46e5',
      accentSoft: '#eef2ff',
      cta: 'bg-indigo-600',
      surface: '#ffffff',
    },
  },
  {
    key: '03',
    name: 'Yumuşak',
    theme: {
      heroFrom: '#9d174d',
      heroTo: '#4c0519',
      accent: '#be185d',
      accentSoft: '#fdf2f8',
      cta: 'bg-rose-600',
      surface: '#fff7fb',
    },
  },
  {
    key: '04',
    name: 'Canlı',
    theme: {
      heroFrom: '#047857',
      heroTo: '#064e3b',
      accent: '#059669',
      accentSoft: '#ecfdf5',
      cta: 'bg-emerald-600',
      surface: '#ffffff',
    },
  },
  {
    key: '05',
    name: 'Minimal',
    theme: {
      heroFrom: '#78716c',
      heroTo: '#292524',
      accent: '#57534e',
      accentSoft: '#f5f5f4',
      cta: 'bg-stone-700',
      surface: '#fafaf9',
    },
  },
  {
    key: '06',
    name: 'Lüks',
    theme: {
      heroFrom: '#a16207',
      heroTo: '#1c1917',
      accent: '#ca8a04',
      accentSoft: '#fefce8',
      cta: 'bg-amber-700',
      surface: '#fffbeb',
    },
  },
  {
    key: '07',
    name: 'Taze',
    theme: {
      heroFrom: '#0e7490',
      heroTo: '#083344',
      accent: '#0891b2',
      accentSoft: '#ecfeff',
      cta: 'bg-cyan-600',
      surface: '#ffffff',
    },
  },
  {
    key: '08',
    name: 'Koyu',
    theme: {
      heroFrom: '#111827',
      heroTo: '#030712',
      accent: '#e5e7eb',
      accentSoft: '#1f2937',
      cta: 'bg-gray-900',
      surface: '#111827',
    },
  },
  {
    key: '09',
    name: 'Sıcak',
    theme: {
      heroFrom: '#c2410c',
      heroTo: '#7c2d12',
      accent: '#ea580c',
      accentSoft: '#fff7ed',
      cta: 'bg-orange-600',
      surface: '#fffaf5',
    },
  },
  {
    key: '10',
    name: 'Stüdyo',
    theme: {
      heroFrom: '#0369a1',
      heroTo: '#0c4a6e',
      accent: '#0284c7',
      accentSoft: '#f0f9ff',
      cta: 'bg-sky-600',
      surface: '#ffffff',
    },
  },
];

const img = (id: string, alt: string) => ({
  src: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`,
  alt,
});

function rotate<T>(arr: T[], offset: number): T[] {
  if (!arr.length) return arr;
  const n = ((offset % arr.length) + arr.length) % arr.length;
  return [...arr.slice(n), ...arr.slice(0, n)];
}

function newsSlice(news: WebTemplateNews[], i: number): WebTemplateNews[] {
  const a = news[i % news.length];
  const b = news[(i + 1) % news.length];
  const c = news[(i + 2) % news.length];
  return [a, b, c];
}

function seed(
  slug: string,
  label: string,
  photos: string[],
  taglines: string[],
  abouts: string[],
  news: WebTemplateNews[],
): SectorSeed {
  // Ensure ≥10 entries by cycling
  const pad = <T,>(xs: T[], n = 10): T[] => {
    const out: T[] = [];
    for (let i = 0; i < n; i += 1) out.push(xs[i % xs.length]);
    return out;
  };
  return {
    slug,
    label,
    photos: pad(photos, 12),
    taglines: pad(taglines, 10),
    abouts: pad(abouts, 10),
    news: pad(news, 12),
  };
}

const SEEDS: SectorSeed[] = [
  seed(
    'hair',
    'Kuaför',
    [
      'photo-1560066984-138dadb4c035',
      'photo-1522337660859-02fbefca4702',
      'photo-1595476108010-b4d1f102b1b1',
      'photo-1634449573010-33df40a4151e',
      'photo-1522337360788-8b13dee7a37e',
      'photo-1562322140-8baeececf3df',
      'photo-1516975080664-ed2fc6a32937',
      'photo-1492106087820-71f1a00d2b11',
    ],
    [
      'Saç tasarımı ve bakımda güvenilir adres',
      'Kişisel stil, profesyonel dokunuş',
      'Renk, kesim ve bakımı bir arada',
      'Doğal güzelliğinizi öne çıkarın',
      'Salon konforu, ustalıkla buluşuyor',
      'Her saça özel çözüm',
      'Trend kesimler, kalıcı bakım',
      'Işıltılı saçlar için doğru adres',
      'Zamansız stiller, modern teknikler',
      'Randevulu, özenli hizmet',
    ],
    [
      'Kuaför salonumuzda kesim, boya ve bakımı hijyenik ortamda, deneyimli ekiple sunuyoruz.',
      'Size özel stil danışmanlığı ile saç tipinize uygun uygulamalar planlıyoruz.',
      'Balyaj, röfle ve keratin gibi işlemlerde kaliteli ürün ve doğru teknik kullanıyoruz.',
      'Misafirlerimizin konforu için sakin bir salon atmosferi ve net randevu düzeni sağlıyoruz.',
      'Çocuk ve yetişkin kesimlerinde sabırlı, titiz bir yaklaşım benimsiyoruz.',
      'Renk koruma ve bakım önerileriyle salondaki sonucu evde de sürdürmenize yardımcı oluyoruz.',
      'Kısa süreli fön ve uzun süreli bakım paketlerini ihtiyacınıza göre şekillendiriyoruz.',
      'Modern ekipman ve güncel trendlerle her ziyarette tutarlı kalite hedefliyoruz.',
      'İlk ziyarette saç analizi yaparak uzun vadeli bir bakım planı çıkarıyoruz.',
      'Online randevu ile bekletmeden, planlı hizmet almanızı kolaylaştırıyoruz.',
    ],
    [
      { tag: 'Trend', title: 'Yumuşak balyaj', summary: 'Doğal geçişli balyaj bu sezon öne çıkıyor.' },
      { tag: 'Bakım', title: 'Keratin sonrası', summary: 'Sülfatsız şampuan kalıcılığı artırır.' },
      { tag: 'Kesim', title: 'Yüz şekline göre stil', summary: 'Doğru kesim yüz hatlarını dengeler.' },
      { tag: 'Renk', title: 'Renk koruma ipucu', summary: 'Ilk 48 saat suya dikkat edin.' },
      { tag: 'İpuçu', title: 'Isı koruyucu', summary: 'Fön öncesi mutlaka koruyucu kullanın.' },
      { tag: 'Duyuru', title: 'Bakım günleri', summary: 'Hafta içi bakım paketlerinde esneklik.' },
      { tag: 'Ürün', title: 'Doğru şampuan', summary: 'Saç tipine uygun ürün seçimi kritik.' },
      { tag: 'Stil', title: 'Kısa kesim trendi', summary: 'Hafif katlı kesimler pratik ve şık.' },
      { tag: 'Sağlık', title: 'Saç derisi bakımı', summary: 'Düzenli arındırma kepek riskini azaltır.' },
      { tag: 'Randevu', title: 'Erken gelin', summary: '5–10 dk erken gelmek planı korur.' },
      { tag: 'Mevsim', title: 'Kış bakımı', summary: 'Nemlendirici maskeler kışın şart.' },
      { tag: 'Paket', title: 'Kesim + bakım', summary: 'Kombine paketler daha avantajlı.' },
    ],
  ),
  seed(
    'barber',
    'Berber',
    [
      'photo-1503951914875-452162b0f3f1',
      'photo-1621605815971-fbc98d665033',
      'photo-1599351431202-1e0f0137899a',
      'photo-1622286342621-4bd786c2447c',
      'photo-1585747860715-2ba37e788b70',
      'photo-1507003211169-0a1dd7228f2d',
      'photo-1493256338651-d82f7acb2b38',
      'photo-1620336655055-bfdf9860eb14',
    ],
    [
      'Klasik berberlik, modern dokunuş',
      'Keskin çizgiler, temiz bitiş',
      'Sakal ve saçta ustalık',
      'Erkek bakımında güvenilir adres',
      'Hızlı, özenli, hijyenik',
      'Her yüze özel kesim',
      'Geleneksel tıraş deneyimi',
      'Net fade, net stil',
      'Haftalık bakım rutininiz',
      'Randevulu berber konforu',
    ],
    [
      'Berberimizde saç, sakal ve bakım hizmetlerini steril ekipmanla sunuyoruz.',
      'Klasik ustura tıraşı ve modern fade kesimleri aynı özenle uyguluyoruz.',
      'Misafirlerimize kısa bekleyiş ve net randevu sistemi sunuyoruz.',
      'Yüz hatlarına uygun kesim önerisiyle stil danışmanlığı yapıyoruz.',
      'Çocuk kesimlerinde sabırlı ve güvenli yaklaşımı önceliyoruz.',
      'Sakal şekillendirme ve kontür işlemlerinde detaya önem veriyoruz.',
      'Hijyen protokollerimiz her kullanımda tek kullanımlık malzemeyi kapsar.',
      'Haftalık bakım paketleriyle düzenli görünümü kolaylaştırıyoruz.',
      'Aftershave ve cilt yatıştırıcı ürünlerle konforlu bir bitiş sağlıyoruz.',
      'Online randevu ile sizi bekletmeden planlı hizmet veriyoruz.',
    ],
    [
      { tag: 'Stil', title: 'Fade seçimi', summary: 'Saç tipine göre soft veya sharp fade.' },
      { tag: 'Sakal', title: 'Kontür ipucu', summary: 'Düzenli kontür yüzü toparlar.' },
      { tag: 'Bakım', title: 'Tıraş sonrası', summary: 'Alkolsüz aftershave tahrişi azaltır.' },
      { tag: 'Trend', title: 'Kısa üst', summary: 'Temiz üst + dokulu dokunuş popüler.' },
      { tag: 'Hijyen', title: 'Steril ekipman', summary: 'Her müşteride dezenfeksiyon şart.' },
      { tag: 'İpuçu', title: 'Ev bakımı', summary: 'Sakal yağı kuruluğu önler.' },
      { tag: 'Duyuru', title: 'Öğle dilimi', summary: 'Öğle saatlerinde hızlı kesim.' },
      { tag: 'Paket', title: 'Saç + sakal', summary: 'Kombo randevu daha verimli.' },
      { tag: 'Çocuk', title: 'İlk kesim', summary: 'Sabırlı ekiple stres azalır.' },
      { tag: 'Randevu', title: 'Dakiklik', summary: 'Zamanında gelmek sırayı korur.' },
      { tag: 'Ürün', title: 'Doğru wax', summary: 'İnce tutuşlu wax doğal durur.' },
      { tag: 'Mevsim', title: 'Yaz tıraşı', summary: 'Daha sıkı kesim serinlik verir.' },
    ],
  ),
  seed(
    'beauty',
    'Güzellik',
    [
      'photo-1487412947147-5cebf100ffc2',
      'photo-1516975080664-ed2fc6a32937',
      'photo-1570172619604-894f5d4d2d1d',
      'photo-1512290923902-8a9f81dc236c',
      'photo-1596755389378-c31d21fd1273',
      'photo-1522335789203-aabd1fc54bc9',
      'photo-1560750588-73207b1ef5b2',
      'photo-1616394584738-fc6e612e71b9',
    ],
    [
      'Cilt ve güzellikte özenli dokunuş',
      'Parlak cilt, doğal makyaj',
      'Size özel bakım rutinleri',
      'Güzellik salonunda güven ve hijyen',
      'Bakımla gelen özgüven',
      'Profesyonel cilt analizi',
      'Günün her anı için bakım',
      'Zarif, modern güzellik deneyimi',
      'Cildinize saygılı uygulamalar',
      'Randevulu güzellik konforu',
    ],
    [
      'Güzellik salonumuzda cilt bakımı, makyaj ve epilasyon hizmetlerini steril ortamda sunuyoruz.',
      'Cilt tipinize uygun ürün ve protokollerle kişiselleştirilmiş bakımlar uyguluyoruz.',
      'Misafirlerimizin rahatı için sakin bir ortam ve net randevu planı sağlıyoruz.',
      'Kalıcı sonuç için ev bakım önerilerini de paylaşıyoruz.',
      'Özel gün makyajlarında uzun süreli ve doğal görünüm hedefliyoruz.',
      'Hassas ciltlerde yama testi ve kademeli uygulama prensibini benimsiyoruz.',
      'Hijyen standartlarımız tek kullanımlık malzeme ve cihaz sterilizasyonunu kapsar.',
      'Paket bakımlarla düzenli rutini sürdürülebilir kılıyoruz.',
      'İlk seansta cilt analizi yaparak doğru bakım yol haritası çıkarıyoruz.',
      'Online randevu ile uygun saati kolayca seçebilirsiniz.',
    ],
    [
      { tag: 'Cilt', title: 'Nem dengesi', summary: 'Düzenli nemlendirme bariyeri güçlendirir.' },
      { tag: 'Makyaj', title: 'Doğal bitiş', summary: 'Hafif katmanlar daha kalıcı durur.' },
      { tag: 'Bakım', title: 'Haftalık rutin', summary: 'Haftada 1 bakım görünümü sabitler.' },
      { tag: 'İpuçu', title: 'Güneş koruma', summary: 'SPF bakım sonucunu korur.' },
      { tag: 'Trend', title: 'Glass skin', summary: 'Işıltılı ama dengeli nem öne çıkıyor.' },
      { tag: 'Hijyen', title: 'Temiz fırçalar', summary: 'Makyaj hijyeni cilt sağlığıdır.' },
      { tag: 'Paket', title: 'Bakım serisi', summary: '4 seanslık paketler daha etkili.' },
      { tag: 'Duyuru', title: 'Akşam seansları', summary: 'Mesai sonrası randevu seçenekleri.' },
      { tag: 'Ürün', title: 'Aktif içerik', summary: 'Cilt tipine göre aktif seçin.' },
      { tag: 'Randevu', title: 'Hazırlık', summary: 'Makyaj öncesi nemli cilt avantaj.' },
      { tag: 'Mevsim', title: 'Kış bakımı', summary: 'Besleyici maskeler kışın şart.' },
      { tag: 'Özel gün', title: 'Deneme makyajı', summary: 'Önceden denemek sonucu netleştirir.' },
    ],
  ),
  seed(
    'nails',
    'Nail',
    [
      'photo-1604654894610-df63bc536371',
      'photo-1519014816548-bf5fe059798b',
      'photo-1632345031435-8727f6897d53',
      'photo-1607779097040-26e80aa78e09',
      'photo-1604654894610-df63bc536371',
      'photo-1522335789203-aabd1fc54bc9',
      'photo-1596462502278-27bfdc403348',
      'photo-1519415518172-75d1d2c0c0c0',
    ],
    [
      'Tırnak tasarımı ve bakım',
      'Temiz manikür, uzun ömür',
      'Nail art’ta yaratıcı dokunuş',
      'Pedikürde rahatlık ve hijyen',
      'Şık tırnaklar, net randevu',
      'Protez ve bakımı bir arada',
      'Minimal veya iddialı tasarım',
      'Ellerinize özel bakım',
      'Kalıcı oje, güçlü taban',
      'Nail stüdyosu deneyimi',
    ],
    [
      'Nail stüdyomuzda manikür, pedikür ve protez tırnak hizmetlerini steril ortamda sunuyoruz.',
      'Tırnak sağlığını bozmadan şekil ve tasarım uygulamalarına özen gösteriyoruz.',
      'Kalıcı oje ve nail art seçeneklerini tarzınıza göre kişiselleştiriyoruz.',
      'Hijyen protokolümüz her seansta tek kullanımlık ekipman kullanımını içerir.',
      'Ayak bakımı ve pedikürde konforlu bir deneyim hedefliyoruz.',
      'Tırnak yeme ve kırılma sorunlarında güçlendirici protokoller öneriyoruz.',
      'Randevu sistemiyle beklemeden planlı hizmet almanızı sağlıyoruz.',
      'Tasarım denemelerinde önceden referans görsel getirmenizi öneririz.',
      'Bakım aralıklarını tırnak büyüme hızınıza göre planlıyoruz.',
      'Online randevu ile size uygun saati kolayca seçebilirsiniz.',
    ],
    [
      { tag: 'Bakım', title: 'Kütikül yağı', summary: 'Günlük yağ tırnağı esnetir.' },
      { tag: 'Trend', title: 'Minimal art', summary: 'İnce çizgiler ve tek renk moda.' },
      { tag: 'İpuçu', title: 'Eldiven', summary: 'Temizlik işlerinde eldiven kullanın.' },
      { tag: 'Hijyen', title: 'Steril set', summary: 'Her müşteriye ayrı set şart.' },
      { tag: 'Protez', title: 'İnce form', summary: 'Doğal uzunluk daha sağlıklıdır.' },
      { tag: 'Paket', title: 'El + ayak', summary: 'Kombo bakım daha ekonomik.' },
      { tag: 'Duyuru', title: 'Öğleden sonra', summary: 'Sakin saatler için öğleden sonra.' },
      { tag: 'Ürün', title: 'Baz kat', summary: 'İyi baz kat ömrü uzatır.' },
      { tag: 'Randevu', title: 'Süre planı', summary: 'Art işlemlerde ekstra süre ayırın.' },
      { tag: 'Mevsim', title: 'Yaz renkleri', summary: 'Pastel tonlar yazın öne çıkıyor.' },
      { tag: 'Sağlık', title: 'Mola verin', summary: 'Protezler arası doğal mola iyi gelir.' },
      { tag: 'Stil', title: 'Kare form', summary: 'Kısa kare form dayanıklıdır.' },
    ],
  ),
  seed(
    'laser',
    'Lazer',
    [
      'photo-1616394584738-fc6e612e71b9',
      'photo-1570172619604-894f5d4d2d1d',
      'photo-1512290923902-8a9f81dc236c',
      'photo-1560750588-73207b1ef5b2',
      'photo-1552693673-1bf958298935',
      'photo-1515377905703-c4788e51af15',
      'photo-1540555700478-4be289fbecef',
      'photo-1487412947147-5cebf100ffc2',
    ],
    [
      'Lazer epilasyonda güvenli protokol',
      'Cilt tipine uygun cihaz ayarı',
      'Konforlu seanslar, planlı sonuç',
      'Uzman eşliğinde lazer bakım',
      'Hijyenik klinik ortam',
      'Seans planıyla kalıcı azalma',
      'Hassas bölgelerde özenli uygulama',
      'Şeffaf bilgilendirme, net süreç',
      'Modern cihaz, deneyimli ekip',
      'Randevulu lazer konforu',
    ],
    [
      'Lazer epilasyon merkezimizde cilt tipinize uygun protokollerle güvenli seanslar uyguluyoruz.',
      'İlk seansta değerlendirme yaparak seans aralıklarını planlıyoruz.',
      'Hijyen ve cihaz kalibrasyonu standartlarımızın temelidir.',
      'Güneş ve bakım önerilerini seans öncesi/sonrası net şekilde paylaşıyoruz.',
      'Hassas bölgelerde kademeli ve kontrollü uygulama tercih ediyoruz.',
      'Paket seanslarla süreci daha öngörülebilir hale getiriyoruz.',
      'Sorularınız için şeffaf bilgilendirme ve randevu sistemi sunuyoruz.',
      'Cihazlarımız düzenli bakımdan geçirilir, kayıt altına alınır.',
      'Konfor için soğutma ve uygun jel protokolleri kullanıyoruz.',
      'Online randevu ile size uygun saati seçebilirsiniz.',
    ],
    [
      { tag: 'Hazırlık', title: 'Güneşten kaçının', summary: 'Seans öncesi bronzlaşmayın.' },
      { tag: 'Bakım', title: 'Nemlendirin', summary: 'Seans sonrası nem kritik.' },
      { tag: 'Plan', title: 'Seans aralığı', summary: 'Kıl döngüsüne göre planlanır.' },
      { tag: 'İpuçu', title: 'Tıraş', summary: 'Seans günü tıraş önerilir.' },
      { tag: 'Güvenlik', title: 'Göz koruma', summary: 'Her seansta koruyucu şart.' },
      { tag: 'Paket', title: 'Seri seans', summary: 'Paketler sonucu hızlandırır.' },
      { tag: 'Duyuru', title: 'Akşam seansları', summary: 'Mesai sonrası slotlar açık.' },
      { tag: 'Cilt', title: 'Tip analizi', summary: 'Doğru ayar cilt tipine bağlı.' },
      { tag: 'Randevu', title: 'Düzenlilik', summary: 'Aksatmadan gelmek sonuç getirir.' },
      { tag: 'Ürün', title: 'SPF', summary: 'Seans sonrası güneş koruyucu.' },
      { tag: 'Soru', title: 'Acı hissi', summary: 'Modern cihazlarda konfor artar.' },
      { tag: 'Mevsim', title: 'Kış avantajı', summary: 'Kış seansları bronz riskini azaltır.' },
    ],
  ),
  seed(
    'pmu',
    'Kalıcı makyaj',
    [
      'photo-1487412947147-5cebf100ffc2',
      'photo-1522335789203-aabd1fc54bc9',
      'photo-1516975080664-ed2fc6a32937',
      'photo-1596462502278-27bfdc403348',
      'photo-1512290923902-8a9f81dc236c',
      'photo-1570172619604-894f5d4d2d1d',
      'photo-1616394584738-fc6e612e71b9',
      'photo-1560750588-73207b1ef5b2',
    ],
    [
      'Doğal kalıcı makyaj çizgileri',
      'Kaş, dudak ve eyeliner’da denge',
      'Yüz hatlarına uygun tasarım',
      'Steril ortam, özenli uygulama',
      'Kalıcı ama doğal görünüm',
      'Ön çizim ile net onay',
      'Pigment seçiminde uzmanlık',
      'İyileşme sürecinde yanınızdayız',
      'Zarif dokunuş, uzun süre',
      'Randevulu PMU stüdyosu',
    ],
    [
      'Kalıcı makyaj stüdyomuzda kaş, dudak ve eyeliner uygulamalarını steril koşullarda yapıyoruz.',
      'Ön çizim ve onay süreciyle yüzünüze en uygun formu birlikte belirliyoruz.',
      'Pigment seçiminde cilt tonu ve istenen doğallık seviyesini dikkate alıyoruz.',
      'İyileşme sürecinde bakım talimatlarını net şekilde paylaşıyoruz.',
      'Touch-up seanslarını sonucun kalıcılığı için planlıyoruz.',
      'Hijyen protokolümüz tek kullanımlık uç ve steril ekipmanı kapsar.',
      'Hassas ciltlerde yama testi ve kademeli yaklaşım uygularız.',
      'Doğal görünümü bozmayan, dengeli çizgileri hedefliyoruz.',
      'Danışmanlık randevusu ile beklentileri netleştiriyoruz.',
      'Online randevu sistemiyle süreci kolaylaştırıyoruz.',
    ],
    [
      { tag: 'Tasarım', title: 'Ön çizim', summary: 'Onaysız iğne yok; çizim şart.' },
      { tag: 'Bakım', title: 'İyileşme', summary: 'İlk günlerde nem ve temizlik önemli.' },
      { tag: 'İpuçu', title: 'Doğal form', summary: 'Yüz hatlarıyla uyum kalıcıdır.' },
      { tag: 'Hijyen', title: 'Tek kullanımlık', summary: 'Uçlar her seferinde yenilenir.' },
      { tag: 'Renk', title: 'Pigment seçimi', summary: 'Cilt altı tonuna göre seçilir.' },
      { tag: 'Paket', title: 'Touch-up', summary: 'Rötuş sonucu netleştirir.' },
      { tag: 'Duyuru', title: 'Danışmanlık', summary: 'Ücretsiz ön görüşme imkanı.' },
      { tag: 'Süreç', title: '2 seans', summary: 'Çoğu işlem 2 seansta tamamlanır.' },
      { tag: 'Randevu', title: 'Makyajsız gelin', summary: 'Doğal cilt daha iyi okunur.' },
      { tag: 'Mevsim', title: 'Yaz öncesi', summary: 'Yazdan önce iyileşmeyi bitirin.' },
      { tag: 'Güvenlik', title: 'Alerji', summary: 'Şüphede yama testi yapılır.' },
      { tag: 'Stil', title: 'Soft powder', summary: 'Powder kaş doğal durur.' },
    ],
  ),
  seed(
    'tattoo',
    'Dövme',
    [
      'photo-1611501275019-9b5cda994e8d',
      'photo-1562967035-7493c8d4d4e7',
      'photo-1590246814883-57c511ad5e49',
      'photo-1541534741688-6078c6bfb5c5',
      'photo-1611162617474-5b21e3e9e0e0',
      'photo-1605497788044-5a5a7e3e0a0a',
      'photo-1470071459604-3b5ec3a7fe05',
      'photo-1558591710-4b4a1ae0f04d',
    ],
    [
      'Özgün dövme tasarımı',
      'Steril stüdyo, net çizgi',
      'Küçük işten büyük parçaya',
      'Sanat ve hijyen bir arada',
      'Size özel konsept',
      'Cover-up ve rötuş',
      'Detaylı çizgi işçiliği',
      'Danışmanlıkla doğru karar',
      'Modern stüdyo atmosferi',
      'Randevulu tattoo deneyimi',
    ],
    [
      'Dövme stüdyomuzda özgün tasarımları steril ortamda uyguluyoruz.',
      'İlk görüşmede konsept, yerleşim ve boyutunu birlikte netleştiriyoruz.',
      'Hijyen protokollerimiz tek kullanımlık iğne ve bariyer sistemini kapsar.',
      'İyileşme sürecinde bakım talimatlarını yazılı olarak veriyoruz.',
      'Cover-up işlerinde mevcut dövmeyi analiz ederek plan çıkarıyoruz.',
      'Renk ve siyah-gri işlerde cilt tipine uygun teknik kullanıyoruz.',
      'Uzun oturumlarda molalarla konforu gözetiyoruz.',
      'Portfolyomuzdan stil seçerek süreci hızlandırabilirsiniz.',
      'Rötuş ihtiyacını iyileşme sonrası değerlendiriyoruz.',
      'Online randevu ile tasarım görüşmesi planlayabilirsiniz.',
    ],
    [
      { tag: 'Bakım', title: 'İyileşme', summary: 'İlk günlerde nazik yıkama ve nem.' },
      { tag: 'Tasarım', title: 'Referans', summary: 'Beğendiğiniz stilleri getirin.' },
      { tag: 'Hijyen', title: 'Tek iğne', summary: 'Her işte yeni iğne kullanılır.' },
      { tag: 'İpuçu', title: 'Yerleşim', summary: 'Hareketli bölgelerde çizgi incelir.' },
      { tag: 'Süreç', title: 'Seans planı', summary: 'Büyük işler çok seansa yayılır.' },
      { tag: 'Cover', title: 'Kapatma', summary: 'Eski iş analizi şarttır.' },
      { tag: 'Duyuru', title: 'Portfolyo günü', summary: 'Stil seçimi için görüşme açığız.' },
      { tag: 'Ürün', title: 'Aftercare', summary: 'Önerilen kremle iyileşin.' },
      { tag: 'Randevu', title: 'Tok gelin', summary: 'Uzun seans öncesi beslenin.' },
      { tag: 'Mevsim', title: 'Yaz uyarısı', summary: 'Deniz/güneş iyileşmeyi bozar.' },
      { tag: 'Stil', title: 'Fine line', summary: 'İnce çizgi zarif durur.' },
      { tag: 'Güvenlik', title: 'Alerji', summary: 'Mürekkep hassasiyetini bildirin.' },
    ],
  ),
  seed(
    'solarium',
    'Solaryum',
    [
      'photo-1540555700478-4be289fbecef',
      'photo-1515377905703-c4788e51af15',
      'photo-1552693673-1bf958298935',
      'photo-1570172619604-894f5d4d2d1d',
      'photo-1512290923902-8a9f81dc236c',
      'photo-1560750588-73207b1ef5b2',
      'photo-1487412947147-5cebf100ffc2',
      'photo-1544161515-4ab6ce6db874',
    ],
    [
      'Kontrollü bronzluk seansları',
      'Cilt tipine uygun süre',
      'Temiz kabin, net protokol',
      'Hızlı ve planlı bronzluk',
      'Nemlendirici bakımla destek',
      'Güvenli solaryum deneyimi',
      'Paket seanslarla düzen',
      'Öncesi-sonrası bakım önerisi',
      'Modern cihaz parkı',
      'Randevulu solaryum',
    ],
    [
      'Solaryum merkezimizde cilt tipinize uygun sürelerle kontrollü seanslar sunuyoruz.',
      'Kabin hijyeni ve cihaz bakımı düzenli olarak yapılır.',
      'Seans öncesi ve sonrası nemlendirme önerilerini paylaşıyoruz.',
      'Paket kullanımlarla bronzluğu kademeli ve dengeli ilerletiyoruz.',
      'Koruyucu gözlük kullanımı zorunludur.',
      'İlk ziyarette cilt tipi değerlendirmesi yapıyoruz.',
      'Aşırı maruziyeti önlemek için net süre limitleri uygularız.',
      'Randevu sistemiyle kabin yoğunluğunu yönetiyoruz.',
      'Bakım ürünleri hakkında danışmanlık veriyoruz.',
      'Online randevu ile hızlı slot seçebilirsiniz.',
    ],
    [
      { tag: 'Güvenlik', title: 'Gözlük', summary: 'Her seansta koruyucu gözlük.' },
      { tag: 'Bakım', title: 'Nem', summary: 'Seans sonrası nemlendirin.' },
      { tag: 'Plan', title: 'Kademeli', summary: 'Kısa seanslarla başlayın.' },
      { tag: 'İpuçu', title: 'Parfüm yok', summary: 'Seans öncesi koku sürmeyin.' },
      { tag: 'Paket', title: 'Seans kartı', summary: 'Kartlar daha ekonomik.' },
      { tag: 'Hijyen', title: 'Kabin', summary: 'Her kullanımdan sonra temizlenir.' },
      { tag: 'Duyuru', title: 'Sabah slot', summary: 'Sabah saatleri daha sakin.' },
      { tag: 'Cilt', title: 'Tip analizi', summary: 'Süre cilt tipine göre ayarlanır.' },
      { tag: 'Randevu', title: 'Dakiklik', summary: 'Slotlar dakikaya bağlıdır.' },
      { tag: 'Ürün', title: 'Hızlandırıcı', summary: 'Uygun losyon sonucu destekler.' },
      { tag: 'Mevsim', title: 'Kış bronzu', summary: 'Kışın kontrollü seans tercih edin.' },
      { tag: 'Uyarı', title: 'İlaç', summary: 'Fotosensitif ilaçları bildirin.' },
    ],
  ),
  seed(
    'massage',
    'Masaj',
    [
      'photo-1544161515-4ab6ce6db874',
      'photo-1519823551278-64ac92781db1',
      'photo-1600334129128-685c5582fd35',
      'photo-1540555700478-4be289fbecef',
      'photo-1515377905703-c4788e51af15',
      'photo-1570172619604-894f5d4d2d1d',
      'photo-1512290923902-8a9f81dc236c',
      'photo-1545205597-3d9d02c29597',
    ],
    [
      'Gevşeme ve toparlanma masajı',
      'Kas rahatlığı, zihin dinginliği',
      'Terapötik dokunuş',
      'Sakin oda, özenli seans',
      'Spor sonrası toparlanma',
      'Klasik ve aromaterapi',
      'Size özel baskı ayarı',
      'Haftalık rahatlama rutini',
      'Hijyenik masaj alanı',
      'Randevulu wellness',
    ],
    [
      'Masaj stüdyomuzda klasik, aromaterapi ve sporcu masajı seçenekleri sunuyoruz.',
      'Seans baskısını size göre ayarlayarak konforlu bir deneyim hedefliyoruz.',
      'Hijyenik oda ve temiz tekstil standartlarımız vardır.',
      'Spor sonrası toparlanma için özel protokoller uygularız.',
      'Stres ve boyun-sırt gerginliğinde odaklanmış çalışmalar yapıyoruz.',
      'Randevu sistemiyle sessiz ve planlı bir ortam sağlıyoruz.',
      'Yağ ve koku tercihinizi önceden belirtebilirsiniz.',
      'Hamilelik ve sağlık durumlarını seans öncesi mutlaka bildirin.',
      'Düzenli seanslarla kalıcı rahatlama hedeflenir.',
      'Online randevu ile uygun saati seçebilirsiniz.',
    ],
    [
      { tag: 'İpuçu', title: 'Su için', summary: 'Seans sonrası bol su için.' },
      { tag: 'Spor', title: 'Toparlanma', summary: 'Antrenman ertesi masaj iyi gelir.' },
      { tag: 'Rahatlama', title: 'Nefes', summary: 'Derin nefes etkiyi artırır.' },
      { tag: 'Hijyen', title: 'Temiz oda', summary: 'Her seans sonrası hazırlık yapılır.' },
      { tag: 'Paket', title: '4 seans', summary: 'Paketler düzeni kolaylaştırır.' },
      { tag: 'Duyuru', title: 'Akşam slot', summary: 'Mesai sonrası rahatlama saatleri.' },
      { tag: 'Sağlık', title: 'Bilgi verin', summary: 'Ağrı/yaralanmayı önceden söyleyin.' },
      { tag: 'Ürün', title: 'Yağ seçimi', summary: 'Koku hassasiyetini belirtin.' },
      { tag: 'Randevu', title: 'Erken gelin', summary: '5 dk erken sakinleşmeye yardım eder.' },
      { tag: 'Mevsim', title: 'Kış gerilimi', summary: 'Kışın boyun gerginliği artar.' },
      { tag: 'Stil', title: 'Derin doku', summary: 'Sporcularda derin doku tercih.' },
      { tag: 'Bakım', title: 'Isı', summary: 'Sıcak uygulama rahatlatır.' },
    ],
  ),
  seed(
    'spa',
    'Spa',
    [
      'photo-1540555700478-4be289fbecef',
      'photo-1544161515-4ab6ce6db874',
      'photo-1519823551278-64ac92781db1',
      'photo-1600334129128-685c5582fd35',
      'photo-1515377905703-c4788e51af15',
      'photo-1570172619604-894f5d4d2d1d',
      'photo-1545205597-3d9d02c29597',
      'photo-1507652313519-d4e9174996dd',
    ],
    [
      'Spa’da yenilenme molası',
      'Su, ısı ve bakım ritüeli',
      'Zihin ve beden dengesi',
      'Lüks sakinlik deneyimi',
      'Cilt ve vücut bakımı',
      'Günlük stresten uzak alan',
      'Paket ritüellerle bütüncül bakım',
      'Sessiz, hijyenik spa alanı',
      'Size özel tempo',
      'Randevulu spa konforu',
    ],
    [
      'Spa alanımızda masaj, vücut bakımı ve rahatlama ritüelleri sunuyoruz.',
      'Misafirlerimizin mahremiyeti ve sessizliği önceliğimizdir.',
      'Hijyen ve su sistemleri düzenli kontrol edilir.',
      'Paket ritüellerle yarım veya tam gün deneyimler planlanabilir.',
      'Cilt tipine uygun bakım ürünleri tercih ediyoruz.',
      'Seans öncesi sağlık bilgilerini paylaşmanız önemlidir.',
      'Çift ve bireysel seans seçenekleri mevcuttur.',
      'Isı ve su alanlarında güvenlik kuralları uygulanır.',
      'Hediye çekleri ve paketler için danışabilirsiniz.',
      'Online randevu ile spa saatinizi ayırtabilirsiniz.',
    ],
    [
      { tag: 'Ritüel', title: 'Yarım gün', summary: 'Masaj + bakım kombosu popüler.' },
      { tag: 'İpuçu', title: 'Erken gelin', summary: 'Soyunma için 10 dk ayırın.' },
      { tag: 'Bakım', title: 'Su için', summary: 'Spa sonrası hidrasyon önemli.' },
      { tag: 'Hijyen', title: 'Havlu seti', summary: 'Tek kullanımlık setler sunulur.' },
      { tag: 'Paket', title: 'Hediye', summary: 'Hediye kartı seçenekleri var.' },
      { tag: 'Duyuru', title: 'Hafta içi', summary: 'Hafta içi daha sakin.' },
      { tag: 'Sağlık', title: 'Bilgi', summary: 'Tansiyon/hamilelik bildirin.' },
      { tag: 'Ürün', title: 'Doğal yağ', summary: 'Hassas ciltte doğal tercihler.' },
      { tag: 'Randevu', title: 'İptal', summary: '24 saat kuralına uyun.' },
      { tag: 'Mevsim', title: 'Kış detoksu', summary: 'Kış ritüelleri yeniler.' },
      { tag: 'Stil', title: 'Sessizlik', summary: 'Sessiz alan deneyimi önerilir.' },
      { tag: 'Konfor', title: 'Isı', summary: 'Sauna sonrası serinleme unutulmasın.' },
    ],
  ),
  seed(
    'wellness',
    'Wellness',
    [
      'photo-1545205597-3d9d02c29597',
      'photo-1544367567-0f2fcb009e0b',
      'photo-1518611012118-696072aa579a',
      'photo-1544161515-4ab6ce6db874',
      'photo-1519823551278-64ac92781db1',
      'photo-1571019614242-c5c5dee9f50b',
      'photo-1506126613408-eca07ce68773',
      'photo-1515377905703-c4788e51af15',
    ],
    [
      'Bütüncül iyi oluş',
      'Hareket, nefes, denge',
      'Günlük enerjinizi toparlayın',
      'Wellness’ta sürdürülebilir rutin',
      'Zihin berraklığı, beden rahatlığı',
      'Kişisel iyi oluş planı',
      'Sakin alan, güçlü alışkanlık',
      'Küçük adımlarla büyük fark',
      'Profesyonel rehberlik',
      'Randevulu wellness',
    ],
    [
      'Wellness merkezimizde hareket, nefes ve rahatlama odaklı programlar sunuyoruz.',
      'Kişisel hedeflerinize göre sürdürülebilir bir rutin oluşturmanıza yardımcı oluyoruz.',
      'Grup ve bireysel seans seçenekleri mevcuttur.',
      'İlk görüşmede ihtiyaç analizi yaparak yol haritası çıkarıyoruz.',
      'Hijyenik stüdyo ve sakin bir atmosfer sağlıyoruz.',
      'Nefes ve esneklik çalışmalarını günlük hayata uyarlıyoruz.',
      'Stres yönetimi odaklı kısa seanslar planlanabilir.',
      'Paket programlarla düzenli katılımı kolaylaştırıyoruz.',
      'Sağlık durumunuzu paylaşarak güvenli ilerliyoruz.',
      'Online randevu ile seans seçebilirsiniz.',
    ],
    [
      { tag: 'Rutin', title: 'Küçük adım', summary: 'Haftada 2 seans bile fark yaratır.' },
      { tag: 'Nefes', title: '3 dakika', summary: 'Kısa nefes molası stresi keser.' },
      { tag: 'Hareket', title: 'Esneklik', summary: 'Günlük germe tutulmaları azaltır.' },
      { tag: 'İpuçu', title: 'Uyku', summary: 'İyi oluşun temeli uykudur.' },
      { tag: 'Paket', title: 'Aylık plan', summary: 'Aylık paket disiplini artırır.' },
      { tag: 'Duyuru', title: 'Sabah seansı', summary: 'Sabah grupları enerjik başlar.' },
      { tag: 'Sağlık', title: 'Sınırlar', summary: 'Ağrıda zorlamayın, bildirin.' },
      { tag: 'Ürün', title: 'Mat hijyeni', summary: 'Kişisel mat önerilir.' },
      { tag: 'Randevu', title: 'Düzen', summary: 'Aynı gün/saat alışkanlık yapar.' },
      { tag: 'Mevsim', title: 'İlkbahar', summary: 'Yeni rutin için iyi dönem.' },
      { tag: 'Stil', title: 'Yavaş tempo', summary: 'Yavaş pratik farkındalığı artırır.' },
      { tag: 'Beslenme', title: 'Su', summary: 'Hidrasyon enerjiyi taşır.' },
    ],
  ),
];

/** Kalan sektörler — kompakt üretim (yine 10 şablon) */
function quick(
  slug: string,
  label: string,
  photos: string[],
  focus: string,
): SectorSeed {
  const taglines = STYLES.map((s, i) =>
    i % 2 === 0 ? `${label} · ${s.name.toLowerCase()} yaklaşım` : `${focus} için ${s.name.toLowerCase()} şablon`,
  );
  const abouts = STYLES.map(
    (s, i) =>
      `${label} işletmemizde ${focus.toLowerCase()} odaklı hizmet sunuyoruz. “${s.name}” web şablonuyla marka dilimizi yansıtıyoruz; hijyen, randevu düzeni ve şeffaf iletişim önceliğimiz. (${i + 1}/10)`,
  );
  const news: WebTemplateNews[] = STYLES.map((s, i) => ({
    tag: s.name,
    title: `${label}: ${s.name} ipucu`,
    summary: `${focus} konusunda düzenli randevu ve doğru hazırlık sonucu iyileştirir. (#${i + 1})`,
  })).concat(
    STYLES.map(s => ({
      tag: 'Duyuru',
      title: `${label} ${s.name} notu`,
      summary: `Sektöre özel içerik ve görseller bu şablonda hazır gelir.`,
    })),
  );
  return seed(slug, label, photos, taglines, abouts, news);
}

SEEDS.push(
  quick('pilates_yoga', 'Pilates / Yoga', ['photo-1544367567-0f2fcb009e0b', 'photo-1518611012118-696072aa579a', 'photo-1571019614242-c5c5dee9f50b', 'photo-1599901860904-17e6ede5256c', 'photo-1506126613408-eca07ce68773', 'photo-1545205597-3d9d02c29597', 'photo-1518310383802-640c2de311b2', 'photo-1593811167562-9cef47bfc4d7'], 'Nefes, denge ve güç'),
  quick('fitness', 'Fitness', ['photo-1534438327276-14e5300c3a48', 'photo-1571902943202-507ec2618e8f', 'photo-1540497077202-7c8a3999166f', 'photo-1517836357463-d25dfeac3438', 'photo-1581009146145-b5ef638e54ff', 'photo-1434682881908-b43d0467b798', 'photo-1518611012118-696072aa579a', 'photo-1571019613454-1cb2f99b2d8b'], 'Güç ve kondisyon'),
  quick('dance', 'Dans', ['photo-1508700929628-666bc8bd84ea', 'photo-1518834107812-67b0b7c58434', 'photo-1547153760-18fc86302685', 'photo-1504609813442-a8924e83f76e', 'photo-1518611012118-696072aa579a', 'photo-1535525153412-5a42439a210d', 'photo-1508807526345-15e9b5f4eaff', 'photo-1524594152303-9fd13543fe6e'], 'Ritim ve ifade'),
  quick('martial', 'Dövüş sporları', ['photo-1555597673-b21f3b5d1e0e', 'photo-1549719386-90fe8c0b0b0a', 'photo-1599058917212-d750089bc07e', 'photo-1517438322456-0e4f0f0f0f0f', 'photo-1571019613454-1cb2f99b2d8b', 'photo-1517836357463-d25dfeac3438', 'photo-1540497077202-7c8a3999166f', 'photo-1534438327276-14e5300c3a48'], 'Disiplin ve teknik'),
  quick('pool', 'Havuz', ['photo-1576013551627-0cc20b96c2a7', 'photo-1519315901367-f34ff9154487', 'photo-1575429198097-0414ec08e8cd', 'photo-1560095632-28688788f81b', 'photo-1530549387789-4c1017266635', 'photo-1576610616655-1596e8e0b0a0', 'photo-1600965962102-9d260a71890d', 'photo-1571902943202-507ec2618e8f'], 'Yüzme ve su sporu'),
  quick('sports_facility', 'Spor tesisi', ['photo-1461896836934-ffe607ba6851', 'photo-1574629810360-7efbbe195018', 'photo-1529900748604-07564a03e7a6', 'photo-1552674605-db6ffd4facb5', 'photo-1431324155629-1a6deb1dec8d', 'photo-1571902943202-507ec2618e8f', 'photo-1540497077202-7c8a3999166f', 'photo-1534438327276-14e5300c3a48'], 'Saha ve tesis'),
  quick('dental', 'Diş', ['photo-1606811841689-23dfddce3e95', 'photo-1588776814546-1ffcf47267a5', 'photo-1629909613654-28e377c37b09', 'photo-1609840114035-3c981b782dfe', 'photo-1598256989800-fe5f95da9787', 'photo-1607613009820-a29f7bb45147', 'photo-1519494026892-80bbd2d6fd0d', 'photo-1579684385127-1ef15d508118'], 'Ağız ve diş sağlığı'),
  quick('physio', 'Fizyoterapi', ['photo-1576091160399-112ba8d25d1d', 'photo-1571019613454-1cb2f99b2d8b', 'photo-1519823551278-64ac92781db1', 'photo-1579684385127-1ef15d508118', 'photo-1576091160550-2173dba999ef', 'photo-1666214280557-f1b5022eb634', 'photo-1519494026892-80bbd2d6fd0d', 'photo-1581595220892-b2452a0e0b0a'], 'Hareket ve rehabilitasyon'),
  quick('podiatry', 'Ayak sağlığı', ['photo-1519494026892-80bbd2d6fd0d', 'photo-1579684385127-1ef15d508118', 'photo-1666214280557-f1b5022eb634', 'photo-1576091160399-112ba8d25d1d', 'photo-1581595220892-b2452a0e0b0a', 'photo-1576091160550-2173dba999ef', 'photo-1629909613654-28e377c37b09', 'photo-1606811841689-23dfddce3e95'], 'Ayak bakımı ve tedavi'),
  quick('dietitian', 'Diyetisyen', ['photo-1490645935967-10de6ba17061', 'photo-1512621776951-a57141f2eefd', 'photo-1498837167922-ddd27525d352', 'photo-1546069901-ba9599a7e63c', 'photo-1511690656952-34342bb7c2f2', 'photo-1466636134816-3a3c1c0c0c0c', 'photo-1505576633757-0ac1084af824', 'photo-1493770348161-369560ae357d'], 'Beslenme danışmanlığı'),
  quick('psychology', 'Psikoloji', ['photo-1573497019940-1c28c88b4f3e', 'photo-1527613426441-4da1747100b1', 'photo-1516302752623-ebb182653a0a', 'photo-1497366216548-37526070297c', 'photo-1497366754035-f200968a6e72', 'photo-1486312338219-ce68d2c6f44d', 'photo-1454165804606-c3d57bc86b40', 'photo-1516321318423-f06f85e504b3'], 'Görüşme ve destek'),
  quick('dermatology', 'Dermatoloji', ['photo-1552693673-1bf958298935', 'photo-1570172619604-894f5d4d2d1d', 'photo-1512290923902-8a9f81dc236c', 'photo-1616394584738-fc6e612e71b9', 'photo-1560750588-73207b1ef5b2', 'photo-1519494026892-80bbd2d6fd0d', 'photo-1579684385127-1ef15d508118', 'photo-1666214280557-f1b5022eb634'], 'Cilt sağlığı'),
  quick('medical', 'Klinik', ['photo-1519494026892-80bbd2d6fd0d', 'photo-1579684385127-1ef15d508118', 'photo-1666214280557-f1b5022eb634', 'photo-1581595220892-b2452a0e0b0a', 'photo-1576091160399-112ba8d25d1d', 'photo-1576091160550-2173dba999ef', 'photo-1538108865647-ec6a291b0f0a', 'photo-1582750433449-648ed127bb54'], 'Muayene ve takip'),
  quick('plastic_surgery', 'Estetik', ['photo-1512290923902-8a9f81dc236c', 'photo-1570172619604-894f5d4d2d1d', 'photo-1616394584738-fc6e612e71b9', 'photo-1552693673-1bf958298935', 'photo-1519494026892-80bbd2d6fd0d', 'photo-1579684385127-1ef15d508118', 'photo-1487412947147-5cebf100ffc2', 'photo-1522335789203-aabd1fc54bc9'], 'Estetik danışmanlık'),
  quick('veterinary', 'Veteriner', ['photo-1628009367841-40313a0b0c0c', 'photo-1548199973-03cce0bbc87b', 'photo-1583511655857-d19b40a7a54e', 'photo-1450778869180-41d0601e046e', 'photo-1583337130417-3346a1be7dee', 'photo-1544568100-847a948585b9', 'photo-1530281700549-e82e7bf110d6', 'photo-1516734212186-a967f81ad0d7'], 'Evcil hayvan sağlığı'),
  quick('optic', 'Optik', ['photo-1574258495973-f010dfbb7141', 'photo-1509695507497-903c140c43f0', 'photo-1473496169904-658ba7c44d8a', 'photo-1511499767150-a48a237f0083', 'photo-1577803645773-f96470509666', 'photo-1556306535-0f09a5378a45', 'photo-1591079400694-0f0b0b0b0b0b', 'photo-1483412033650-1015ddeb83d1'], 'Gözlük ve göz bakımı'),
  quick('photo', 'Fotoğraf', ['photo-1452587925148-ce544e77e282', 'photo-1492691527719-9d1e07e534b4', 'photo-1554048612-b6a482bc67e5', 'photo-1516035069371-29a1b244cc32', 'photo-1542038784456-1ea8e935640e', 'photo-1471341971476-ae15ff8dd5e0', 'photo-1493863641943-9b68992a8d07', 'photo-1454165804606-c3d57bc86b40'], 'Çekim ve stüdyo'),
  quick('pet_grooming', 'Pet kuaför', ['photo-1548199973-03cce0bbc87b', 'photo-1583511655857-d19b40a7a54e', 'photo-1450778869180-41d0601e046e', 'photo-1583337130417-3346a1be7dee', 'photo-1544568100-847a948585b9', 'photo-1530281700549-e82e7bf110d6', 'photo-1516734212186-a967f81ad0d7', 'photo-1601758228041-f3b2795255f1'], 'Tüy bakım ve yıkama'),
  quick('car_detail', 'Oto detay', ['photo-1601362840469-51e4d8d58785', 'photo-1492144534655-ae79c964c9d7', 'photo-1503376780353-7e6692767b70', 'photo-1552519507-da3b142c6e3d', 'photo-1542362567-b066e952541b', 'photo-1619642751034-765dfdf7c58e', 'photo-1609521263047-f8f205293f24', 'photo-1485291571150-772bcfc10da5'], 'Araç temizlik ve bakım'),
  quick('coaching', 'Koçluk', ['photo-1552664730-d307ca884978', 'photo-1516321318423-f06f85e504b3', 'photo-1454165804606-c3d57bc86b40', 'photo-1486312338219-ce68d2c6f44d', 'photo-1497366216548-37526070297c', 'photo-1522202176988-66273c2fd55f', 'photo-1600880292203-757bb62b4baf', 'photo-1519389950473-47ba0277781c'], 'Hedef ve gelişim'),
  quick('tutoring', 'Özel ders', ['photo-1503676260728-1c00da094a0b', 'photo-1427504494785-3a9ca7044f45', 'photo-1509062522246-3755977927d7', 'photo-1456513080800-7d93acfdaec9', 'photo-1434030216411-0b793f4b4173', 'photo-1523240795612-9a054b0db644', 'photo-1524178232363-1fb2b075b655', 'photo-1497633762265-9d179a990aa6'], 'Ders ve sınav hazırlığı'),
);

function buildTemplates(seedRow: SectorSeed): WebPageTemplate[] {
  return STYLES.map((style, i) => {
    const photos = rotate(seedRow.photos, i);
    const gallery = photos.slice(0, 4).map((id, gi) => img(id, `${seedRow.label} ${gi + 1}`));
    return {
      id: `${seedRow.slug}-${style.key}`,
      sectorSlug: seedRow.slug,
      name: `${seedRow.label} · ${style.name}`,
      styleName: style.name,
      theme: style.theme,
      tagline: seedRow.taglines[i],
      about: seedRow.abouts[i],
      gallery,
      news: newsSlice(seedRow.news, i),
    };
  });
}

const ALL_TEMPLATES: WebPageTemplate[] = SEEDS.flatMap(buildTemplates);
const BY_ID = new Map(ALL_TEMPLATES.map(t => [t.id, t]));

export function listWebTemplatesForSectors(slugs: string[]): WebPageTemplate[] {
  const set = new Set(slugs.filter(Boolean));
  if (!set.size) return [];
  return ALL_TEMPLATES.filter(t => set.has(t.sectorSlug));
}

export function listWebTemplatesForSector(slug?: string | null): WebPageTemplate[] {
  if (!slug) return [];
  return ALL_TEMPLATES.filter(t => t.sectorSlug === slug);
}

export function getWebTemplate(id?: string | null): WebPageTemplate | undefined {
  if (!id) return undefined;
  return BY_ID.get(id);
}

export function defaultWebTemplateId(slug?: string | null): string | undefined {
  if (!slug) return undefined;
  return `${slug}-01`;
}

export function allWebTemplateCount(): number {
  return ALL_TEMPLATES.length;
}
