/**
 * Hizmet görselleri — kategori + cinsiyet/sektör kilitli.
 * hair = kadın kuaför; barber = erkek berber (kadın saç görseli yok).
 * Anahtar: "Hizmet" veya "sektor::Hizmet" (ortak isimler için).
 */

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;

export type ServiceImageCategory = keyof typeof CATEGORY_POOLS;

export const CATEGORY_POOLS = {
  nails: [img("photo-1519014816548-bf5fe059798b"), img("photo-1604654894610-df63bc536371"), img("photo-1632345031435-8727f6897d53"), img("photo-1522337660859-02fbefca4702")],
  skin: [img("photo-1552693673-1bf958298935"), img("photo-1616394584738-fc6e612e71b9"), img("photo-1512290923902-8a9f81dc236c"), img("photo-1596755389378-c31d21fd1273"), img("photo-1598440947619-2c35fc9aa908")],
  makeup: [img("photo-1487412947147-5cebf100ffc2"), img("photo-1522335789203-aabd1fc54bc9"), img("photo-1516975080664-ed2fc6a32937"), img("photo-1519741497674-611481863552")],
  lash: [img("photo-1487412947147-5cebf100ffc2"), img("photo-1522335789203-aabd1fc54bc9"), img("photo-1516975080664-ed2fc6a32937"), img("photo-1616394584738-fc6e612e71b9")],
  wax: [img("photo-1519823551278-64ac92734fb1"), img("photo-1600334129128-685c5582fd35"), img("photo-1544161515-4ab6ce6db874"), img("photo-1616394584738-fc6e612e71b9"), img("photo-1552693673-1bf958298935")],
  hair: [img("photo-1595476108010-b4d1f102b1b1"), img("photo-1522337360788-8b13dee7a37e"), img("photo-1492106087820-71f1a00d2b11"), img("photo-1560066984-138dadb4c035"), img("photo-1522338140262-f46f5913618a")],
  barber: [img("photo-1585747860715-2ba37e788b70"), img("photo-1503951914875-452162b0f3f1"), img("photo-1621605815971-fbc98d665033"), img("photo-1599351431202-1e0f0137899a"), img("photo-1622286342621-4bd786c2447c"), img("photo-1493256338651-d82f7acb2b38"), img("photo-1605497788044-5a32c7078486")],
  spa: [img("photo-1519823551278-64ac92734fb1"), img("photo-1600334129128-685c5582fd35"), img("photo-1544161515-4ab6ce6db874"), img("photo-1507652313519-d4e9174996dd")],
  fitness: [img("photo-1534438327276-14e5300c3a48"), img("photo-1517836357463-d25dfeac3438"), img("photo-1540497077202-7c8a3999166f"), img("photo-1571019614242-c5c5dee9f50b"), img("photo-1571902943202-507ec2618e8f")],
  yoga: [img("photo-1544367567-0f2fcb009e0b"), img("photo-1518611012118-696072aa579a"), img("photo-1506126613408-eca07ce68773"), img("photo-1545205597-3d9d02c29597")],
  dance: [img("photo-1508700929628-666bc8bd84ea"), img("photo-1518834107812-67b0b7c58434"), img("photo-1535525153412-5a42439a210d")],
  pool: [img("photo-1576013551627-0cc20b96c2a7"), img("photo-1519315901367-f34ff9154487"), img("photo-1575429198097-0414ec08e8cd")],
  field: [img("photo-1574629810360-7efbbe195018"), img("photo-1529900748604-07564a03e7a6"), img("photo-1552674605-db6ffd4facb5")],
  dental: [img("photo-1606811841689-23dfddce3e95"), img("photo-1588776814546-1ffcf47267a5"), img("photo-1629909613654-28e377c37b09"), img("photo-1609840114035-3c981b782dfe")],
  clinic: [img("photo-1519494026892-80bbd2d6fd0d"), img("photo-1579684385127-1ef15d508118"), img("photo-1576091160399-112ba8d25d1d"), img("photo-1666214280557-f1b5022eb634"), img("photo-1582750433449-648ed127bb54")],
  diet: [img("photo-1490645935967-10de6ba17061"), img("photo-1512621776951-a57141f2eefd"), img("photo-1498837167922-ddd27525d352"), img("photo-1546069901-ba9599a7e63c")],
  therapy: [img("photo-1573497019940-1c28c88b4f3e"), img("photo-1552664730-d307ca884978"), img("photo-1497366216548-37526070297c")],
  pet: [img("photo-1548199973-03cce0bbc87b"), img("photo-1583511655857-d19b40a7a54e"), img("photo-1450778869180-41d0601e046e"), img("photo-1583337130417-3346a1be7dee")],
  photo: [img("photo-1492691527719-9d1e07e534b4"), img("photo-1554048612-b6a482bc67e5"), img("photo-1516035069371-29a1b244cc32"), img("photo-1542038784456-1ea8e935640e")],
  car: [img("photo-1601362840469-51e4d8d58785"), img("photo-1492144534655-ae79c964c9d7"), img("photo-1503376780353-7e6692767b70")],
  music: [img("photo-1511379938547-c1f69419868d"), img("photo-1507838153414-b4b713384a76"), img("photo-1510915361894-db8b60106cb1")],
  education: [img("photo-1503676260728-1c00da094a0b"), img("photo-1427504494785-3a9ca7044f45"), img("photo-1509062522246-3755977927d7")],
  tattoo: [img("photo-1611501275019-9b5cda994e8d"), img("photo-1541534741688-6078c6bfb5c5"), img("photo-1599351431202-1e0f0137899a")],
  solarium: [img("photo-1616394584738-fc6e612e71b9"), img("photo-1552693673-1bf958298935"), img("photo-1596755389378-c31d21fd1273")],
  optic: [img("photo-1577803645773-f96470509666"), img("photo-1473496169904-658ba7c44d8a"), img("photo-1511499767150-a48a237f0083")],
} as const;

export const SERVICE_IMAGE_EXACT: Record<string, string> = {
  "Ağda (bölgesel)": "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=700&q=80",
  "Ağda tam bacak": "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=700&q=80&svc=A%C4%9Fda%20tam%20bacak",
  "Altın / kollajen maske": "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=700&q=80&svc=Alt%C4%B1n%20%2F%20kollajen%20maske",
  "Aromaterapi masajı": "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=700&q=80",
  "Aşı uygulaması": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=700&q=80",
  "Ayak bakımı": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=80&svc=Ayak%20bak%C4%B1m%C4%B1",
  "barber::Damat tıraşı": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=700&q=80",
  "barber::Fade / taper": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=700&q=80",
  "barber::Makine kesimi": "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?auto=format&fit=crop&w=700&q=80",
  "barber::Saç + sakal": "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=700&q=80",
  "barber::Saç kesimi": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=700&q=80&svc=barber%3ASa%C3%A7%20kesimi",
  "barber::Sakal tıraşı": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=700&q=80",
  "barber::Ustura tıraş (sıcak havlu)": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=700&q=80",
  "Basket saha 1 saat": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=700&q=80&svc=Basket%20saha%201%20saat",
  "Başlangıç grubu": "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=80&svc=Ba%C5%9Flang%C4%B1%C3%A7%20grubu",
  "BB glow / cilt aydınlatma": "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=700&q=80&svc=BB%20glow%20%2F%20cilt%20ayd%C4%B1nlatma",
  "beauty::İpek kirpik (full set)": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=700&q=80&svc=beauty%3A%C4%B0pek%20kirpik%20(full%20set)",
  "beauty::İpek kirpik dolgu": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=80&svc=beauty%3A%C4%B0pek%20kirpik%20dolgu",
  "beauty::Kalıcı oje (gel)": "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=700&q=80&svc=beauty%3AKal%C4%B1c%C4%B1%20oje%20(gel)",
  "beauty::Kaş laminasyon": "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=700&q=80&svc=beauty%3AKa%C5%9F%20laminasyon",
  "beauty::Kirpik lifting": "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=700&q=80&svc=beauty%3AKirpik%20lifting",
  "beauty::Manikür": "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=700&q=80&svc=beauty%3AManik%C3%BCr",
  "beauty::Pedikür": "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=700&q=80&svc=beauty%3APedik%C3%BCr",
  "beauty::Protez tırnak": "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=700&q=80&svc=beauty%3AProtez%20t%C4%B1rnak",
  "Bebek / aile çekimi": "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=700&q=80&svc=Bebek%20%2F%20aile%20%C3%A7ekimi",
  "Beyazlatma": "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=700&q=80",
  "Birebir seans": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=700&q=80&svc=Birebir%20seans",
  "Bireysel ders 45 dk": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=700&q=80",
  "Bireysel ders 60 dk": "https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=700&q=80",
  "Bireysel terapi": "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=700&q=80",
  "Botoks": "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=700&q=80&svc=Botoks",
  "Brezilya fönü / anti-frizz": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80&svc=Brezilya%20f%C3%B6n%C3%BC%20%2F%20anti-frizz",
  "Burun / kulak kılı": "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=700&q=80&svc=Burun%20%2F%20kulak%20k%C4%B1l%C4%B1",
  "Check-up danışmanlığı": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=700&q=80",
  "Chip / kimlik": "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=700&q=80",
  "Cila / gloss": "https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=700&q=80&svc=Cila%20%2F%20gloss",
  "Cilt bakımı medikal": "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=700&q=80&svc=Cilt%20bak%C4%B1m%C4%B1%20medikal",
  "Cover-up seansı": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=700&q=80",
  "crossfit::Grup dersi": "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=700&q=80&svc=crossfit%3AGrup%20dersi",
  "Çerçeve ayarı": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=700&q=80",
  "Çift / aile seansı": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=700&q=80",
  "Çizgi / sakal tasarım": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=700&q=80&svc=%C3%87izgi%20%2F%20sakal%20tasar%C4%B1m",
  "Çocuk dans": "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?auto=format&fit=crop&w=700&q=80&svc=%C3%87ocuk%20dans",
  "Çocuk kesimi": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=700&q=80&svc=%C3%87ocuk%20kesimi",
  "Çocuk saç kesimi": "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=700&q=80",
  "Çocuk yüzme": "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?auto=format&fit=crop&w=700&q=80",
  "Damat tıraşı": "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?auto=format&fit=crop&w=700&q=80&svc=Damat%20t%C4%B1ra%C5%9F%C4%B1",
  "dance::Grup dersi": "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=700&q=80",
  "Değerlendirme": "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=700&q=80",
  "Deneme dersi": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=700&q=80",
  "Deneme WOD": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=700&q=80&svc=Deneme%20WOD",
  "dental::Dolgu": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=700&q=80",
  "dental::Muayene": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=80",
  "Derin temizlik / komedon": "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=700&q=80",
  "Dermapen / mikroiğneleme": "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=700&q=80&svc=Dermapen%20%2F%20mikroi%C4%9Fneleme",
  "dermatology::Kontrol": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=700&q=80&svc=dermatology%3AKontrol",
  "Dermatolojik muayene": "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=700&q=80&svc=Dermatolojik%20muayene",
  "Detoks seansı": "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=700&q=80&svc=Detoks%20seans%C4%B1",
  "Dış çekim (saat)": "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=700&q=80",
  "Dış yıkama": "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=700&q=80&svc=D%C4%B1%C5%9F%20y%C4%B1kama",
  "Dip açma": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80&svc=Dip%20a%C3%A7ma",
  "Dip boya": "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=700&q=80&svc=Dip%20boya",
  "Diş taşı temizliği": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=700&q=80",
  "Diyabetik ayak bakımı": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=700&q=80&svc=Diyabetik%20ayak%20bak%C4%B1m%C4%B1",
  "Dolgu": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=700&q=80",
  "Dövme seansı (saatlik)": "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&w=700&q=80",
  "Dudak pigmentasyonu": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=700&q=80&svc=Dudak%20pigmentasyonu",
  "Düğün / etkinlik (saat)": "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=700&q=80&svc=D%C3%BC%C4%9F%C3%BCn%20%2F%20etkinlik%20(saat)",
  "Düğün dansı prova": "https://images.unsplash.com/photo-1535525153412-5a42439a210d?auto=format&fit=crop&w=700&q=80",
  "Egzersiz seansı": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=700&q=80&svc=Egzersiz%20seans%C4%B1",
  "Enjeksiyon": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=80&svc=Enjeksiyon",
  "Ense / çizgi düzeltme": "https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=700&q=80&svc=Ense%20%2F%20%C3%A7izgi%20d%C3%BCzeltme",
  "Erkek saç boyası": "https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=700&q=80&svc=Erkek%20sa%C3%A7%20boyas%C4%B1",
  "Estetik danışmanlık": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=700&q=80&svc=Estetik%20dan%C4%B1%C5%9Fmanl%C4%B1k",
  "Fade / taper": "https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=700&q=80",
  "fitness::Deneme dersi": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=700&q=80",
  "fitness::Grup dersi": "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=700&q=80",
  "Fön / şekillendirme": "https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=700&q=80",
  "FTR seansı": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=700&q=80",
  "FUE / DHI işlem günü": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=700&q=80&svc=FUE%20%2F%20DHI%20i%C5%9Flem%20g%C3%BCn%C3%BC",
  "Full grooming": "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=700&q=80",
  "Gelin makyajı": "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=700&q=80",
  "Gelin saçı": "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=700&q=80&svc=Gelin%20sa%C3%A7%C4%B1",
  "Göz muayenesi": "https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=700&q=80",
  "Gözaltı bakımı": "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=700&q=80&svc=G%C3%B6zalt%C4%B1%20bak%C4%B1m%C4%B1",
  "Grup antrenman": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=700&q=80&svc=Grup%20antrenman",
  "Grup dersi": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=700&q=80&svc=pilates_yoga%3AGrup%20dersi",
  "Grup wellness dersi": "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=700&q=80&svc=Grup%20wellness%20dersi",
  "Grup WOD": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=700&q=80&svc=Grup%20WOD",
  "Grup workshop": "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=700&q=80&svc=Grup%20workshop",
  "Grup yüzme": "https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&w=700&q=80",
  "Günlük makyaj": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=700&q=80",
  "hair_transplant::Konsültasyon": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=700&q=80&svc=hair_transplant%3AKons%C3%BCltasyon",
  "hair_transplant::Kontrol muayenesi": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=700&q=80&svc=hair_transplant%3AKontrol%20muayenesi",
  "hair::Saç kesimi": "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=700&q=80&svc=hair%3ASa%C3%A7%20kesimi",
  "Halı saha 1 saat": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=700&q=80",
  "Halı saha 1.5 saat": "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=700&q=80",
  "Havuz kullanımı (seans)": "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=700&q=80&svc=Havuz%20kullan%C4%B1m%C4%B1%20(seans)",
  "Hydrafacial / aqua peeling": "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=700&q=80",
  "IPL seansı": "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=700&q=80&svc=IPL%20seans%C4%B1",
  "İç temizleme": "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=700&q=80",
  "İğneli epilasyon": "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=700&q=80&svc=%C4%B0%C4%9Fneli%20epilasyon",
  "İlk değerlendirme": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=80&svc=%C4%B0lk%20de%C4%9Ferlendirme",
  "İlk görüşme + analiz": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=700&q=80",
  "İpek kirpik (full set)": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=700&q=80",
  "İpek kirpik dolgu": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=80",
  "İpek kirpik söküm": "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=700&q=80",
  "Jakuzi seansı": "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=700&q=80&svc=Jakuzi%20seans%C4%B1",
  "Kalıcı eyeliner": "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=700&q=80&svc=Kal%C4%B1c%C4%B1%20eyeliner",
  "Kalıcı oje (gel)": "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=700&q=80",
  "Kanal tedavisi (seans)": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=700&q=80",
  "Kaş alma / şekillendirme": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=700&q=80&svc=Ka%C5%9F%20alma%20%2F%20%C5%9Fekillendirme",
  "Kaş boyama": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=80&svc=Ka%C5%9F%20boyama",
  "Kaş laminasyon": "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=700&q=80&svc=beauty%3AKa%C5%9F%20laminasyon",
  "Kaş şekillendirme": "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=700&q=80",
  "Kaş tasarımı / boya": "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=700&q=80&svc=Ka%C5%9F%20tasar%C4%B1m%C4%B1%20%2F%20boya",
  "Kaş tasarımı / şekillendirme": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=700&q=80&svc=Ka%C5%9F%20tasar%C4%B1m%C4%B1%20%2F%20%C5%9Fekillendirme",
  "Kaynak / protez saç": "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=700&q=80&svc=Kaynak%20%2F%20protez%20sa%C3%A7",
  "Kaynak söküm": "https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=700&q=80&svc=Kaynak%20s%C3%B6k%C3%BCm",
  "Keratin / düzleştirme": "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=700&q=80&svc=Keratin%20%2F%20d%C3%BCzle%C5%9Ftirme",
  "Kese-köpük": "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=700&q=80&svc=Kese-k%C3%B6p%C3%BCk",
  "Kirpik boyama": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=80",
  "Kirpik lifting": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=700&q=80",
  "Klasik cilt bakımı": "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=700&q=80",
  "Klasik kesim + yıkama": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=700&q=80&svc=Klasik%20kesim%20%2B%20y%C4%B1kama",
  "Klasik masaj 30 dk": "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=700&q=80",
  "Klasik masaj 60 dk": "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=700&q=80",
  "Komple boya": "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=700&q=80&svc=Komple%20boya",
  "Konsültasyon": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=700&q=80",
  "Kontrol": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=700&q=80&svc=dermatology%3AKontrol",
  "Kontrol görüşmesi": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=700&q=80&svc=Kontrol%20g%C3%B6r%C3%BC%C5%9Fmesi",
  "Kontrol muayenesi": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=700&q=80&svc=plastic_surgery%3AKontrol%20muayenesi",
  "Küçük dövme": "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=700&q=80",
  "lash_brow::İpek kirpik (full set)": "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=700&q=80&svc=lash_brow%3A%C4%B0pek%20kirpik%20(full%20set)",
  "lash_brow::İpek kirpik dolgu": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=700&q=80&svc=lash_brow%3A%C4%B0pek%20kirpik%20dolgu",
  "lash_brow::Kaş laminasyon": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=80&svc=lash_brow%3AKa%C5%9F%20laminasyon",
  "lash_brow::Kirpik lifting": "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=700&q=80&svc=lash_brow%3AKirpik%20lifting",
  "Lazer epilasyon (bölge)": "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=700&q=80&svc=Lazer%20epilasyon%20(b%C3%B6lge)",
  "Lazer kol / bacak": "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=700&q=80&svc=Lazer%20kol%20%2F%20bacak",
  "Lazer yüz": "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=700&q=80&svc=Lazer%20y%C3%BCz",
  "Leke / akne seansı": "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=700&q=80&svc=Leke%20%2F%20akne%20seans%C4%B1",
  "Lens uygulama eğitimi": "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?auto=format&fit=crop&w=700&q=80",
  "Makine kesimi": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=700&q=80",
  "Manikür": "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=700&q=80",
  "Manuel terapi": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=700&q=80&svc=Manuel%20terapi",
  "martial::Deneme dersi": "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=700&q=80&svc=martial%3ADeneme%20dersi",
  "Maşa / bukle": "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=700&q=80&svc=Ma%C5%9Fa%20%2F%20bukle",
  "Mat pilates (özel)": "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=80",
  "medical::Kontrol": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=700&q=80&svc=medical%3AKontrol",
  "medical::Muayene": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=700&q=80&svc=medical%3AMuayene",
  "Meditasyon / nefes seansı": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=700&q=80",
  "Microblading kaş": "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=700&q=80&svc=Microblading%20ka%C5%9F",
  "Muayene": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=80",
  "music::Deneme dersi": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=700&q=80&svc=music%3ADeneme%20dersi",
  "music::Grup dersi": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=700&q=80",
  "Nail art": "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=700&q=80&svc=Nail%20art",
  "nails::Kalıcı oje (gel)": "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=700&q=80&svc=nails%3AKal%C4%B1c%C4%B1%20oje%20(gel)",
  "nails::Manikür": "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=700&q=80&svc=nails%3AManik%C3%BCr",
  "nails::Pedikür": "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=700&q=80&svc=nails%3APedik%C3%BCr",
  "nails::Protez tırnak": "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=700&q=80&svc=nails%3AProtez%20t%C4%B1rnak",
  "Nasır / tırnak tedavisi": "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=700&q=80&svc=Nas%C4%B1r%20%2F%20t%C4%B1rnak%20tedavisi",
  "Nişan / özel gün saçı": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80&svc=Ni%C5%9Fan%20%2F%20%C3%B6zel%20g%C3%BCn%20sa%C3%A7%C4%B1",
  "Ombre / soft ombre": "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=700&q=80&svc=Ombre%20%2F%20soft%20ombre",
  "Online ders": "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=700&q=80&svc=Online%20ders",
  "Online kontrol": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=80&svc=Online%20kontrol",
  "Online seans": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=700&q=80&svc=Online%20seans",
  "Online terapi": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=700&q=80&svc=Online%20terapi",
  "optic::Kontrol": "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=700&q=80&svc=optic%3AKontrol",
  "Ortez değerlendirme": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=700&q=80&svc=Ortez%20de%C4%9Ferlendirme",
  "osteopathy::Kontrol": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=700&q=80&svc=osteopathy%3AKontrol",
  "Osteopati seansı": "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=700&q=80&svc=Osteopati%20seans%C4%B1",
  "Ölçüm / program": "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=700&q=80",
  "Ön görüşme": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=700&q=80",
  "Özel antrenman": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=700&q=80&svc=%C3%96zel%20antrenman",
  "Özel dans dersi": "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?auto=format&fit=crop&w=700&q=80",
  "Özel ders 45 dk": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=700&q=80",
  "Özel ders 60 dk": "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=700&q=80",
  "Özel koçluk": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=700&q=80&svc=%C3%96zel%20ko%C3%A7luk",
  "Özel yüzme dersi": "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=700&q=80",
  "Padel kortu 1 saat": "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=700&q=80&svc=Padel%20kortu%201%20saat",
  "Paket değerlendirme": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=700&q=80&svc=Paket%20de%C4%9Ferlendirme",
  "Panseuman": "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=700&q=80&svc=Panseuman",
  "Pasaport / vesikalık": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=700&q=80",
  "Pasta cila": "https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=700&q=80&svc=Pasta%20cila",
  "Patch test": "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=700&q=80&svc=Patch%20test",
  "Pedikür": "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=700&q=80",
  "Perma / dalga": "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=700&q=80&svc=Perma%20%2F%20dalga",
  "pet_grooming::Tırnak kesimi": "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=700&q=80&svc=pet_grooming%3AT%C4%B1rnak%20kesimi",
  "Piercing": "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&w=700&q=80&svc=Piercing",
  "pilates_yoga::Grup dersi": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=700&q=80&svc=pilates_yoga%3AGrup%20dersi",
  "plastic_surgery::Dolgu": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=700&q=80&svc=plastic_surgery%3ADolgu",
  "plastic_surgery::Kontrol muayenesi": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=700&q=80&svc=plastic_surgery%3AKontrol%20muayenesi",
  "Portre çekimi": "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=700&q=80",
  "PPF / film kaplama (panel)": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=700&q=80",
  "Profesyonel / gece makyajı": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=80",
  "Program hazırlama": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80",
  "Protez / gel söküm": "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=700&q=80",
  "Protez tırnak": "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=700&q=80",
  "PRP seansı": "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=700&q=80&svc=PRP%20seans%C4%B1",
  "PT seansı 45 dk": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=700&q=80",
  "PT seansı 60 dk": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=700&q=80",
  "Refleksoloji": "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=700&q=80&svc=Refleksoloji",
  "Reformer pilates": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=700&q=80",
  "Retuş seansı": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=80&svc=Retu%C5%9F%20seans%C4%B1",
  "Röfle / balyaj": "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=700&q=80&svc=R%C3%B6fle%20%2F%20balyaj",
  "Saç + sakal": "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=700&q=80&svc=Sa%C3%A7%20%2B%20sakal",
  "Saç bakımı / maske": "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=700&q=80",
  "Saç botoks / ampül bakımı": "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=700&q=80",
  "Saç kesimi": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80",
  "Saç kesimi + fön": "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=700&q=80",
  "Saç şekillendirme / wax": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=700&q=80&svc=Sa%C3%A7%20%C5%9Fekillendirme%20%2F%20wax",
  "Saç yıkama": "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=700&q=80",
  "Sakal boyası": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=700&q=80&svc=Sakal%20boyas%C4%B1",
  "Sakal tıraşı": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=700&q=80&svc=Sakal%20t%C4%B1ra%C5%9F%C4%B1",
  "Sauna seansı": "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=700&q=80&svc=Sauna%20seans%C4%B1",
  "Seramik kaplama (araç)": "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=700&q=80",
  "Solaryum 10 dk": "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=700&q=80",
  "Solaryum 15 dk": "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=700&q=80",
  "Solaryum 20 dk": "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=700&q=80",
  "Sombre / babylights": "https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=700&q=80&svc=Sombre%20%2F%20babylights",
  "Spa paketi (masaj + sauna)": "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=700&q=80&svc=Spa%20paketi%20(masaj%20%2B%20sauna)",
  "Sparring seansı": "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=700&q=80&svc=Sparring%20seans%C4%B1",
  "Spor / derin doku": "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=700&q=80",
  "Tam bacak ağda": "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=700&q=80",
  "Tanışma görüşmesi": "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=700&q=80&svc=Tan%C4%B1%C5%9Fma%20g%C3%B6r%C3%BC%C5%9Fmesi",
  "tattoo::Konsültasyon": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=700&q=80",
  "Tenis kortu 1 saat": "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=700&q=80",
  "Tıraş / şekil": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=700&q=80&svc=T%C4%B1ra%C5%9F%20%2F%20%C5%9Fekil",
  "Tıraş / tıbbi bakım": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=700&q=80&svc=T%C4%B1ra%C5%9F%20%2F%20t%C4%B1bbi%20bak%C4%B1m",
  "Tırnak kesimi": "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=700&q=80&svc=veterinary%3AT%C4%B1rnak%20kesimi",
  "Tonlama": "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=700&q=80&svc=Tonlama",
  "Topuz / özel gün saçı": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80&svc=Topuz%20%2F%20%C3%B6zel%20g%C3%BCn%20sa%C3%A7%C4%B1",
  "tutoring::Deneme dersi": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=700&q=80&svc=tutoring%3ADeneme%20dersi",
  "tutoring::Grup dersi": "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=700&q=80",
  "Tüm vücut ağda": "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=700&q=80",
  "Ustura tıraş (sıcak havlu)": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=700&q=80&svc=Ustura%20t%C4%B1ra%C5%9F%20(s%C4%B1cak%20havlu)",
  "Ürün çekimi": "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=700&q=80",
  "veterinary::Kontrol": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=80&svc=veterinary%3AKontrol",
  "veterinary::Muayene": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=700&q=80&svc=veterinary%3AMuayene",
  "veterinary::Tırnak kesimi": "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=700&q=80&svc=veterinary%3AT%C4%B1rnak%20kesimi",
  "Vitamin / ampül bakımı": "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=700&q=80&svc=Vitamin%20%2F%20amp%C3%BCl%20bak%C4%B1m%C4%B1",
  "Yarım bacak ağda": "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=700&q=80",
  "Yıkama + masaj": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=700&q=80&svc=Y%C4%B1kama%20%2B%20masaj",
  "Yıkama + tarama": "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=700&q=80&svc=Y%C4%B1kama%20%2B%20tarama",
  "Yoga özel ders": "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=700&q=80",
  "Yüz / üst dudak ağda": "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=700&q=80&svc=Y%C3%BCz%20%2F%20%C3%BCst%20dudak%20a%C4%9Fda",
  "Yüz ağda": "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=700&q=80",
  "Yüz bakımı / black mask": "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?auto=format&fit=crop&w=700&q=80&svc=Y%C3%BCz%20bak%C4%B1m%C4%B1%20%2F%20black%20mask",
  "Yüz maskesi + buhar": "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=700&q=80&svc=Y%C3%BCz%20maskesi%20%2B%20buhar",
};

const MALE_SECTORS = new Set(['barber']);
const FEMALE_HAIR_SECTORS = new Set(['hair']);

function normalize(name: string) {
  return name.trim().replace(/\s+/g, ' ');
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
  return `${pool[seed % pool.length]}&svc=${encodeURIComponent(label)}`;
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
    const keyed = SERVICE_IMAGE_EXACT[`${sector}::${n}`];
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
  const src = pickFromCategory(cat, used || new Set(), hashName(`${sectorSlug || ''}|${n}`), n);
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
