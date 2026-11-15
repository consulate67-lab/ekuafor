import { uid } from './id';
import type { Service, ServiceResource } from '../types';

export type ResourceKind = 'equipment' | 'material';

export interface CatalogResource {
  name: string;
  kind: ResourceKind;
  unit?: string;
  qty?: number;
}

export interface CatalogService {
  name: string;
  durationMinutes: number;
  /** TRY varsayılan piyasa/liste fiyatı — sonradan düzenlenebilir */
  price: number;
  resources: CatalogResource[];
  bookingMode?: 'staff' | 'class' | 'resource';
  capacity?: number;
  processingMinutes?: number;
  requiresConsent?: boolean;
}

export interface SectorDef {
  slug: string;
  name: string;
  group: string;
  services: CatalogService[];
}

const eq = (name: string, qty = 1, unit = 'adet'): CatalogResource => ({
  name,
  kind: 'equipment',
  qty,
  unit,
});
const mat = (name: string, qty = 1, unit = 'adet'): CatalogResource => ({
  name,
  kind: 'material',
  qty,
  unit,
});
const isGroupServiceName = (name: string) =>
  /^(grup|wod)\b/i.test(name.trim()) || /\b(grup dersi|grup antrenman|grup yüzme|grup wod)\b/i.test(name.trim());

type SvcOpts = {
  mode?: 'staff' | 'class' | 'resource';
  capacity?: number;
  processingMinutes?: number;
  requiresConsent?: boolean;
};

const svc = (
  name: string,
  durationMinutes: number,
  price: number,
  resources: CatalogResource[] = [],
  opts: SvcOpts = {},
): CatalogService => {
  const mode =
    opts.mode ||
    (isGroupServiceName(name) ? 'class' : 'staff');
  const capacity =
    opts.capacity ??
    (mode === 'class' ? 8 : mode === 'resource' ? 1 : undefined);
  return {
    name,
    durationMinutes,
    price,
    resources,
    bookingMode: mode,
    ...(capacity != null ? { capacity } : {}),
    ...(opts.processingMinutes ? { processingMinutes: opts.processingMinutes } : {}),
    ...(opts.requiresConsent ? { requiresConsent: true } : {}),
  };
};

export const SECTOR_CATALOG: SectorDef[] = [
  {
    slug: 'hair',
    name: 'Kuaför (kadın)',
    group: 'Güzellik / bakım',
    services: [
      svc('Saç yıkama', 15, 150, [eq('Lavabo'), mat('Şampuan', 1, 'kullanım'), mat('Saç kremi', 1, 'kullanım')]),
      svc('Saç kesimi', 45, 500, [eq('Makas'), eq('Tarak'), eq('Fön makinesi'), mat('Şampuan', 1, 'kullanım')]),
      svc('Saç kesimi + fön', 60, 700, [eq('Makas'), eq('Fön'), eq('Fırça'), mat('Şampuan', 1, 'kullanım'), mat('Sprey', 1, 'kullanım')]),
      svc('Çocuk saç kesimi', 30, 250, [eq('Makas'), eq('Tarak')]),
      svc('Fön / şekillendirme', 30, 350, [eq('Fön'), eq('Fırça'), mat('Sprey', 1, 'kullanım')]),
      svc('Maşa / bukle', 40, 450, [eq('Maşa'), eq('Fırça'), mat('Isı koruyucu', 1, 'kullanım')]),
      svc('Topuz / özel gün saçı', 60, 900, [eq('Fön'), eq('Maşa'), mat('Sprey', 1, 'kullanım'), mat('Toka / aparatı', 1, 'set')]),
      svc('Dip boya', 90, 1200, [eq('Boyama seti'), mat('Saç boyası', 1, 'tüp'), mat('Oksidan', 1, 'şişe'), mat('Eldiven', 2, 'çift')], { processingMinutes: 40 }),
      svc('Komple boya', 120, 1800, [eq('Boyama seti'), mat('Saç boyası', 2, 'tüp'), mat('Oksidan', 1, 'şişe'), mat('Eldiven', 2, 'çift')], { processingMinutes: 45 }),
      svc('Cila / gloss', 45, 700, [eq('Boyama seti'), mat('Cila', 1, 'uygulama'), mat('Eldiven', 1, 'çift')], { processingMinutes: 20 }),
      svc('Tonlama', 60, 900, [eq('Boyama seti'), mat('Toner', 1, 'uygulama'), mat('Oksidan', 1, 'şişe')], { processingMinutes: 25 }),
      svc('Dip açma', 90, 2000, [eq('Boyama seti'), mat('Açıcı', 1, 'paket'), mat('Oksidan', 1, 'şişe')], { processingMinutes: 40 }),
      svc('Röfle / balyaj', 150, 2800, [eq('Folyo'), eq('Fırça'), mat('Açıcı', 1, 'paket'), mat('Boyası', 1, 'tüp')], { processingMinutes: 45 }),
      svc('Ombre / soft ombre', 180, 3200, [eq('Folyo'), eq('Fırça'), mat('Açıcı', 1, 'paket'), mat('Toner', 1, 'uygulama')], { processingMinutes: 50 }),
      svc('Sombre / babylights', 150, 3000, [eq('Folyo'), mat('Açıcı', 1, 'paket'), mat('Boyası', 1, 'tüp')], { processingMinutes: 45 }),
      svc('Keratin / düzleştirme', 180, 3500, [eq('Düzleştirici'), mat('Keratin ürünü', 1, 'uygulama'), mat('Şampuan', 1, 'kullanım')], { processingMinutes: 40 }),
      svc('Brezilya fönü / anti-frizz', 150, 3200, [eq('Düzleştirici'), mat('Anti-frizz ürünü', 1, 'uygulama')], { processingMinutes: 35 }),
      svc('Saç bakımı / maske', 60, 800, [eq('Isı başlığı'), mat('Bakım maskesi', 1, 'uygulama')], { processingMinutes: 25 }),
      svc('Saç botoks / ampül bakımı', 75, 1200, [eq('Isı başlığı'), mat('Botoks / ampül', 1, 'uygulama')], { processingMinutes: 30 }),
      svc('Perma / dalga', 120, 2200, [eq('Bigudi seti'), mat('Perma solüsyonu', 1, 'set')], { processingMinutes: 40 }),
      svc('Kaynak / protez saç', 120, 3500, [eq('Kaynak seti'), mat('Kaynak teli', 1, 'paket')], { processingMinutes: 30 }),
      svc('Kaynak söküm', 60, 800, [eq('Kaynak pensesi'), mat('Sökücü', 1, 'kullanım')]),
      svc('Gelin saçı', 120, 3500, [eq('Fön'), eq('Maşa'), mat('Sprey', 1, 'kullanım'), mat('Aksesuar', 1, 'set')]),
      svc('Nişan / özel gün saçı', 90, 2500, [eq('Fön'), eq('Maşa'), mat('Sprey', 1, 'kullanım')]),
      svc('Kaş şekillendirme', 20, 200, [eq('Cımbız'), mat('Kalıp', 1, 'uygulama')]),
      svc('Yüz / üst dudak ağda', 20, 200, [eq('Ağda ısıtıcı'), mat('Ağda', 1, 'uygulama'), mat('Bez', 3, 'adet')]),
    ],
  },
  {
    slug: 'barber',
    name: 'Berber / erkek kuaför',
    group: 'Güzellik / bakım',
    services: [
      svc('Makine kesimi', 20, 200, [eq('Trimmer'), eq('Tarak')]),
      svc('Saç kesimi', 30, 300, [eq('Makas'), eq('Ustura / trimmer'), eq('Tarak'), mat('Jilet', 1), mat('Köpük', 1, 'kullanım')]),
      svc('Fade / taper', 40, 400, [eq('Trimmer'), eq('Makas'), eq('Tarak')]),
      svc('Klasik kesim + yıkama', 40, 350, [eq('Makas'), eq('Trimmer'), mat('Şampuan', 1, 'kullanım')]),
      svc('Sakal tıraşı', 25, 250, [eq('Ustura'), eq('Kaskara'), mat('Tıraş kremi', 1, 'kullanım'), mat('Jilet', 1)]),
      svc('Ustura tıraş (sıcak havlu)', 35, 350, [eq('Ustura'), eq('Kaskara'), mat('Köpük', 1, 'kullanım'), mat('Aftershave', 1, 'kullanım')]),
      svc('Çizgi / sakal tasarım', 20, 200, [eq('Trimmer'), mat('Jilet', 1)]),
      svc('Saç + sakal', 45, 500, [eq('Makas'), eq('Trimmer'), mat('Jilet', 1), mat('Aftershave', 1, 'kullanım')]),
      svc('Damat tıraşı', 90, 1200, [eq('Makas'), eq('Ustura'), eq('Fön'), mat('Köpük', 1, 'kullanım'), mat('Aftershave', 1, 'kullanım')]),
      svc('Erkek saç boyası', 50, 450, [mat('Boyası', 1, 'tüp'), mat('Eldiven', 1, 'çift')], { processingMinutes: 25 }),
      svc('Sakal boyası', 35, 300, [mat('Sakal boyası', 1, 'tüp'), mat('Eldiven', 1, 'çift')], { processingMinutes: 15 }),
      svc('Yıkama + masaj', 20, 200, [eq('Masaj yatağı / koltuk'), mat('Şampuan', 1, 'kullanım')]),
      svc('Saç şekillendirme / wax', 15, 150, [eq('Fön'), mat('Wax / jel', 1, 'kullanım')]),
      svc('Kaş alma / şekillendirme', 15, 150, [eq('Cımbız'), mat('Jilet', 1)]),
      svc('Burun / kulak kılı', 10, 100, [eq('Trimmer')]),
      svc('Yüz bakımı / black mask', 30, 350, [mat('Black mask', 1, 'uygulama'), mat('Tonik', 1, 'kullanım')], { processingMinutes: 15 }),
      svc('Ense / çizgi düzeltme', 15, 150, [eq('Trimmer'), mat('Jilet', 1)]),
      svc('Çocuk kesimi', 25, 200, [eq('Makas'), eq('Tarak')]),
    ],
  },
  {
    slug: 'beauty',
    name: 'Güzellik salonu',
    group: 'Güzellik / bakım',
    services: [
      svc('Klasik cilt bakımı', 60, 900, [eq('Buhar cihazı'), eq('Temizleme seti'), mat('Serum', 1, 'uygulama'), mat('Maske', 1)], { processingMinutes: 20 }),
      svc('Derin temizlik / komedon', 75, 1100, [eq('Buhar cihazı'), eq('Temizleme seti'), mat('Antiseptik', 1, 'kullanım'), mat('Maske', 1)], { processingMinutes: 15 }),
      svc('Hydrafacial / aqua peeling', 60, 1500, [eq('Hydrafacial cihazı'), mat('Serum', 1, 'uygulama')], { requiresConsent: true }),
      svc('Vitamin / ampül bakımı', 50, 1000, [eq('Buhar cihazı'), mat('Ampül', 1, 'uygulama'), mat('Maske', 1)], { processingMinutes: 20 }),
      svc('Altın / kollajen maske', 45, 850, [mat('Maske', 1, 'uygulama'), mat('Serum', 1, 'uygulama')], { processingMinutes: 25 }),
      svc('Gözaltı bakımı', 30, 600, [mat('Gözaltı kremi', 1, 'uygulama'), mat('Maske', 1, 'adet')]),
      svc('Günlük makyaj', 45, 750, [eq('Fırça seti'), mat('Fondöten', 1, 'kullanım'), mat('Allık / ruj', 1, 'kullanım')]),
      svc('Profesyonel / gece makyajı', 75, 1200, [eq('Fırça seti'), mat('Profesyonel makyaj seti', 1)]),
      svc('Gelin makyajı', 120, 2500, [eq('Fırça seti'), mat('Profesyonel makyaj seti', 1)]),
      svc('Kaş tasarımı / şekillendirme', 30, 350, [eq('Cımbız'), mat('Kalıp / boya', 1, 'uygulama')]),
      svc('Kaş boyama', 25, 250, [mat('Kaş boyası', 1, 'uygulama')], { processingMinutes: 10 }),
      svc('Kaş laminasyon', 60, 700, [mat('Laminasyon seti', 1), mat('Ped', 1, 'çift')], { processingMinutes: 20, requiresConsent: true }),
      svc('Kirpik boyama', 20, 200, [mat('Kirpik boyası', 1, 'uygulama')], { processingMinutes: 10 }),
      svc('Kirpik lifting', 75, 800, [mat('Lifting solüsyonu', 1, 'set'), mat('Ped', 1, 'çift'), eq('Fırça')], { processingMinutes: 25, requiresConsent: true }),
      svc('İpek kirpik (full set)', 90, 1200, [mat('İpek kirpik', 1, 'set'), mat('Yapıştırıcı', 1)], { requiresConsent: true }),
      svc('İpek kirpik dolgu', 45, 600, [mat('İpek kirpik', 1, 'set'), mat('Yapıştırıcı', 1)], { requiresConsent: true }),
      svc('İpek kirpik söküm', 30, 300, [mat('Sökücü', 1, 'kullanım')]),
      svc('Ağda (bölgesel)', 30, 400, [eq('Ağda ısıtıcı'), mat('Ağda', 1, 'uygulama'), mat('Bez', 5, 'adet')]),
      svc('Yüz ağda', 25, 300, [eq('Ağda ısıtıcı'), mat('Ağda', 1, 'uygulama'), mat('Bez', 4, 'adet')]),
      svc('Yarım bacak ağda', 30, 450, [eq('Ağda ısıtıcı'), mat('Ağda', 1, 'uygulama'), mat('Bez', 8, 'adet')]),
      svc('Tam bacak ağda', 45, 650, [eq('Ağda ısıtıcı'), mat('Ağda', 1, 'uygulama'), mat('Bez', 12, 'adet')]),
      svc('Tüm vücut ağda', 90, 1200, [eq('Ağda ısıtıcı'), mat('Ağda', 1, 'uygulama'), mat('Bez', 20, 'adet')]),
      svc('Manikür', 45, 400, [eq('Törpü'), mat('Aseton', 1, 'kullanım'), mat('Oje', 1, 'renk')]),
      svc('Pedikür', 60, 500, [eq('Ayak törpüsü'), mat('Aseton', 1, 'kullanım'), mat('Oje', 1, 'renk')]),
      svc('Kalıcı oje (gel)', 60, 650, [eq('UV/LED lamba'), mat('Gel oje', 1, 'renk'), mat('Baz / top coat', 1, 'set')]),
      svc('Protez tırnak', 90, 1000, [eq('Freze'), eq('UV lamba'), mat('Akrilik / tip', 1, 'set')], { processingMinutes: 15 }),
      svc('BB glow / cilt aydınlatma', 60, 1800, [eq('Dermapen / cihaz'), mat('BB serum', 1, 'uygulama')], { requiresConsent: true }),
      svc('Dermapen / mikroiğneleme', 60, 2000, [eq('Dermapen'), mat('Serum', 1, 'uygulama'), mat('Kartuş', 1)], { requiresConsent: true }),
    ],
  },
  {
    slug: 'nails',
    name: 'Tırnak stüdyosu',
    group: 'Güzellik / bakım',
    services: [
      svc('Manikür', 45, 400, [eq('Törpü'), eq('Keratin makası'), mat('Aseton', 1, 'kullanım'), mat('Oje', 1, 'renk')]),
      svc('Pedikür', 60, 500, [eq('Ayak törpüsü'), eq('Gözlük / lamba'), mat('Aseton', 1, 'kullanım'), mat('Oje', 1, 'renk')]),
      svc('Kalıcı oje (gel)', 60, 650, [eq('UV/LED lamba'), mat('Gel oje', 1, 'renk'), mat('Baz / top coat', 1, 'set')]),
      svc('Protez tırnak', 90, 1000, [eq('Freze'), eq('UV lamba'), mat('Akrilik / tip', 1, 'set'), mat('Primer', 1, 'kullanım')]),
      svc('Nail art', 30, 250, [mat('Süs / folyo', 1, 'set'), eq('Fırça')]),
      svc('Protez / gel söküm', 30, 300, [eq('Freze'), mat('Aseton', 1, 'kullanım')]),
    ],
  },
  {
    slug: 'laser',
    name: 'Epilasyon / lazer',
    group: 'Güzellik / bakım',
    services: [
      svc('Lazer epilasyon (bölge)', 30, 800, [eq('Lazer cihazı'), eq('Soğutma ucu'), mat('Jel', 1, 'uygulama'), mat('Koruyucu gözlük', 2, 'adet')], { mode: 'resource', capacity: 1, requiresConsent: true }),
      svc('Lazer yüz', 20, 600, [eq('Lazer cihazı'), mat('Jel', 1, 'uygulama')], { mode: 'resource', capacity: 1, requiresConsent: true }),
      svc('Lazer kol / bacak', 40, 1200, [eq('Lazer cihazı'), mat('Jel', 1, 'uygulama')], { mode: 'resource', capacity: 1, requiresConsent: true }),
      svc('IPL seansı', 30, 600, [eq('IPL cihazı'), mat('Jel', 1, 'uygulama')], { mode: 'resource', capacity: 1, requiresConsent: true }),
      svc('İğneli epilasyon', 45, 500, [eq('Epülasyon cihazı'), mat('İğne', 1), mat('Antiseptik', 1, 'kullanım')], { requiresConsent: true }),
      svc('Ağda tam bacak', 45, 550, [eq('Ağda ısıtıcı'), mat('Ağda', 1, 'uygulama'), mat('Bez', 10, 'adet')]),
      svc('Patch test', 15, 0, [eq('Lazer cihazı')], { requiresConsent: true }),
    ],
  },
  {
    slug: 'pmu',
    name: 'Kalıcı makyaj / microblading',
    group: 'Güzellik / bakım',
    services: [
      svc('Microblading kaş', 120, 2500, [eq('Kalem / blade tutucu'), mat('Pigment', 1, 'renk'), mat('İğne / blade', 1), mat('Anestezi krem', 1, 'kullanım')], { requiresConsent: true }),
      svc('Kalıcı eyeliner', 90, 2200, [eq('PMU cihazı'), mat('Pigment', 1), mat('Kartuş', 1)], { requiresConsent: true }),
      svc('Dudak pigmentasyonu', 120, 2800, [eq('PMU cihazı'), mat('Pigment', 1), mat('Kartuş', 1)], { requiresConsent: true }),
      svc('Retuş seansı', 60, 1200, [eq('PMU cihazı'), mat('Pigment', 1), mat('Kartuş', 1)], { requiresConsent: true }),
    ],
  },
  {
    slug: 'tattoo',
    name: 'Dövme & piercing',
    group: 'Güzellik / bakım',
    services: [
      svc('Dövme seansı (saatlik)', 60, 2000, [eq('Dövme makinesi'), eq('Pedal / güç kaynağı'), mat('İğne', 1), mat('Mürekkep', 1, 'renk'), mat('Folyo / film', 1)], { requiresConsent: true }),
      svc('Küçük dövme', 45, 1500, [eq('Dövme makinesi'), mat('İğne', 1), mat('Mürekkep', 1, 'renk')], { requiresConsent: true }),
      svc('Cover-up seansı', 90, 2800, [eq('Dövme makinesi'), mat('İğne', 1), mat('Mürekkep', 2, 'renk')], { requiresConsent: true }),
      svc('Piercing', 30, 800, [eq('Pens / forceps'), mat('İğne', 1), mat('Takı', 1), mat('Antiseptik', 1, 'kullanım')], { requiresConsent: true }),
      svc('Konsültasyon', 20, 0, []),
    ],
  },
  {
    slug: 'solarium',
    name: 'Solaryum',
    group: 'Güzellik / bakım',
    services: [
      svc('Solaryum 10 dk', 10, 150, [eq('Solaryum kabini'), mat('Koruyucu gözlük', 1), mat('Losyon', 1, 'opsiyonel')], { mode: 'resource', capacity: 1 }),
      svc('Solaryum 15 dk', 15, 200, [eq('Solaryum kabini'), mat('Koruyucu gözlük', 1)], { mode: 'resource', capacity: 1 }),
      svc('Solaryum 20 dk', 20, 250, [eq('Solaryum kabini'), mat('Koruyucu gözlük', 1)], { mode: 'resource', capacity: 1 }),
    ],
  },
  {
    slug: 'massage',
    name: 'Masaj salonu',
    group: 'Spa / wellness',
    services: [
      svc('Klasik masaj 30 dk', 30, 600, [eq('Masaj yatağı'), mat('Masaj yağı', 1, 'uygulama'), mat('Havlu', 2)]),
      svc('Klasik masaj 60 dk', 60, 1000, [eq('Masaj yatağı'), mat('Masaj yağı', 1, 'uygulama'), mat('Havlu', 3)]),
      svc('Aromaterapi masajı', 60, 1200, [eq('Masaj yatağı'), mat('Uçucu yağ karışımı', 1, 'uygulama'), mat('Havlu', 3)]),
      svc('Spor / derin doku', 60, 1300, [eq('Masaj yatağı'), mat('Yağ / krem', 1, 'uygulama')]),
    ],
  },
  {
    slug: 'spa',
    name: 'Spa / hamam',
    group: 'Spa / wellness',
    services: [
      svc('Kese-köpük', 45, 800, [eq('Hamam göbeği'), mat('Kese', 1), mat('Köpük sabunu', 1, 'uygulama'), mat('Peştemal', 1)]),
      svc('Spa paketi (masaj + sauna)', 90, 1800, [eq('Sauna'), eq('Masaj yatağı'), mat('Yağ', 1, 'uygulama'), mat('Havlu', 4)]),
      svc('Yüz maskesi + buhar', 45, 700, [eq('Buhar ünitesi'), mat('Maske', 1), mat('Havlu', 2)]),
      svc('Jakuzi seansı', 30, 500, [eq('Jakuzi'), mat('Havlu', 2)], { mode: 'resource', capacity: 1 }),
      svc('Sauna seansı', 30, 350, [eq('Sauna'), mat('Havlu', 2)], { mode: 'resource', capacity: 8 }),
    ],
  },
  {
    slug: 'wellness',
    name: 'Wellness merkezi',
    group: 'Spa / wellness',
    services: [
      svc('Detoks seansı', 60, 900, [eq('Terapi odası'), mat('Bitkisel karışım', 1, 'uygulama')]),
      svc('Refleksoloji', 45, 700, [eq('Refleksoloji koltuğu'), mat('Krem', 1, 'uygulama')]),
      svc('Meditasyon / nefes seansı', 45, 500, [eq('Mat / minder'), eq('Ses sistemi')], { mode: 'class', capacity: 12 }),
      svc('Grup wellness dersi', 50, 400, [eq('Salon'), eq('Mat')], { mode: 'class', capacity: 15 }),
      svc('Check-up danışmanlığı', 30, 400, []),
    ],
  },
  {
    slug: 'pilates_yoga',
    name: 'Pilates & yoga',
    group: 'Spor / stüdyo',
    services: [
      svc('Mat pilates (özel)', 50, 700, [eq('Mat'), eq('Magic circle', 1, 'opsiyonel')]),
      svc('Reformer pilates', 50, 900, [eq('Reformer aleti'), mat('Hijyen örtüsü', 1)], { mode: 'resource', capacity: 1 }),
      svc('Yoga özel ders', 60, 650, [eq('Yoga matı'), eq('Blok / kemer', 1, 'set')]),
      svc('Grup dersi', 50, 350, [eq('Mat'), eq('Salon ekipmanı')], { mode: 'class', capacity: 12 }),
      svc('Başlangıç grubu', 50, 300, [eq('Mat')], { mode: 'class', capacity: 10 }),
    ],
  },
  {
    slug: 'fitness',
    name: 'Fitness / kişisel antrenör',
    group: 'Spor / stüdyo',
    services: [
      svc('PT seansı 45 dk', 45, 800, [eq('Dambıl / bar'), eq('Kardiyo aleti'), mat('Havlu', 1)]),
      svc('PT seansı 60 dk', 60, 1000, [eq('Fonksiyonel ekipman'), eq('Mat'), mat('Havlu', 1)]),
      svc('Grup dersi', 45, 250, [eq('Salon'), eq('Ses sistemi')], { mode: 'class', capacity: 20 }),
      svc('Deneme dersi', 30, 400, [eq('Temel ekipman')]),
      svc('Ölçüm / program', 30, 300, [eq('Yağ ölçüm cihazı')]),
    ],
  },
  {
    slug: 'dance',
    name: 'Dans stüdyosu',
    group: 'Spor / stüdyo',
    services: [
      svc('Özel dans dersi', 60, 700, [eq('Ayna salonu'), eq('Ses sistemi')]),
      svc('Grup dersi', 60, 300, [eq('Ayna salonu'), eq('Ses sistemi')]),
      svc('Düğün dansı prova', 60, 900, [eq('Salon'), eq('Ses sistemi')]),
      svc('Çocuk dans', 45, 250, [eq('Salon'), eq('Ses sistemi')]),
    ],
  },
  {
    slug: 'martial',
    name: 'Dövüş sporları',
    group: 'Spor / stüdyo',
    services: [
      svc('Özel antrenman', 60, 750, [eq('Eldiven'), eq('Pad / kalkan'), eq('Mat / ring')]),
      svc('Grup antrenman', 60, 350, [eq('Pad'), eq('Mat'), mat('Bandaj', 1, 'çift')]),
      svc('Sparring seansı', 45, 500, [eq('Kask'), eq('Eldiven'), eq('Dişlik')]),
      svc('Deneme dersi', 45, 250, [eq('Eldiven'), eq('Mat')]),
    ],
  },
  {
    slug: 'pool',
    name: 'Yüzme / havuz dersi',
    group: 'Spor / stüdyo',
    services: [
      svc('Özel yüzme dersi', 45, 800, [eq('Kulvar'), mat('Bone', 1), mat('Gözlük', 1, 'opsiyonel')], { mode: 'resource', capacity: 1 }),
      svc('Grup yüzme', 45, 400, [eq('Kulvar'), mat('Bone', 1)], { mode: 'class', capacity: 6 }),
      svc('Çocuk yüzme', 40, 500, [eq('Kulvar'), eq('Simit / board'), mat('Bone', 1)], { mode: 'class', capacity: 6 }),
      svc('Havuz kullanımı (seans)', 60, 250, [eq('Havuz'), mat('Dolap / anahtar', 1)], { mode: 'resource', capacity: 1 }),
    ],
  },
  {
    slug: 'sports_facility',
    name: 'Halı saha & spor tesisi',
    group: 'Spor / stüdyo',
    services: [
      svc('Halı saha 1 saat', 60, 900, [eq('Saha'), eq('Kale filesi'), mat('Top', 1, 'opsiyonel')], { mode: 'resource', capacity: 1 }),
      svc('Halı saha 1.5 saat', 90, 1300, [eq('Saha'), eq('Aydınlatma')], { mode: 'resource', capacity: 1 }),
      svc('Tenis kortu 1 saat', 60, 700, [eq('Kort'), mat('Top tüpü', 1, 'opsiyonel')], { mode: 'resource', capacity: 1 }),
      svc('Basket saha 1 saat', 60, 600, [eq('Saha'), mat('Top', 1, 'opsiyonel')], { mode: 'resource', capacity: 1 }),
      svc('Padel kortu 1 saat', 60, 800, [eq('Padel kortu')], { mode: 'resource', capacity: 1 }),
    ],
  },
  {
    slug: 'dental',
    name: 'Diş kliniği',
    group: 'Sağlık',
    services: [
      svc('Muayene', 30, 500, [eq('Ünit'), eq('Ayna / sonda'), mat('Eldiven', 1, 'çift'), mat('Maske', 1)]),
      svc('Diş taşı temizliği', 45, 1500, [eq('Ultrasonik temizleyici'), mat('Flor / pasta', 1, 'uygulama'), mat('Eldiven', 1, 'çift')]),
      svc('Dolgu', 60, 2000, [eq('Ünit'), mat('Kompozit', 1, 'uygulama'), mat('Anestezi', 1, 'ampul')]),
      svc('Kanal tedavisi (seans)', 90, 4000, [eq('Endo motor'), mat('Eğe seti', 1), mat('Anestezi', 1, 'ampul')]),
      svc('Beyazlatma', 60, 5000, [eq('Işık / plak'), mat('Beyazlatma jeli', 1, 'uygulama')]),
    ],
  },
  {
    slug: 'physio',
    name: 'Fizyoterapi',
    group: 'Sağlık',
    services: [
      svc('Değerlendirme', 45, 800, [eq('Tedavi yatağı'), eq('Ölçüm aletleri')]),
      svc('FTR seansı', 45, 900, [eq('Tedavi yatağı'), eq('TENS / ultrason', 1, 'opsiyonel'), mat('Jel', 1, 'uygulama')]),
      svc('Manuel terapi', 45, 1000, [eq('Tedavi yatağı'), mat('Masaj kremi', 1, 'uygulama')]),
      svc('Egzersiz seansı', 45, 700, [eq('Theraband'), eq('Mat'), eq('Denge tahtası')]),
    ],
  },
  {
    slug: 'podiatry',
    name: 'Podiatri / ayak sağlığı',
    group: 'Sağlık',
    services: [
      svc('Ayak bakımı', 45, 700, [eq('Freze / törpü'), mat('Antiseptik', 1, 'kullanım'), mat('Pamuk / ped', 1, 'set')]),
      svc('Nasır / tırnak tedavisi', 40, 850, [eq('Podiatri frezesi'), mat('Bıçak / frez ucu', 1), mat('Antiseptik', 1, 'kullanım')]),
      svc('Diyabetik ayak bakımı', 50, 1000, [eq('Özel freze'), mat('Pansuman malzemesi', 1, 'set')]),
      svc('Ortez değerlendirme', 30, 600, [eq('Basınç platformu', 1, 'opsiyonel')]),
    ],
  },
  {
    slug: 'dietitian',
    name: 'Diyetisyen',
    group: 'Sağlık',
    services: [
      svc('İlk görüşme + analiz', 60, 900, [eq('Tartı / analiz cihazı'), eq('Ölçüm şeridi')]),
      svc('Kontrol görüşmesi', 30, 500, [eq('Tartı')]),
      svc('Online kontrol', 30, 400, []),
      svc('Program hazırlama', 45, 700, []),
    ],
  },
  {
    slug: 'psychology',
    name: 'Psikolog / terapi',
    group: 'Sağlık',
    services: [
      svc('Ön görüşme', 30, 600, []),
      svc('Bireysel terapi', 50, 1200, []),
      svc('Çift / aile seansı', 60, 1500, []),
      svc('Online terapi', 50, 1000, []),
    ],
  },
  {
    slug: 'dermatology',
    name: 'Dermatoloji / cilt',
    group: 'Sağlık',
    services: [
      svc('Dermatolojik muayene', 30, 900, [eq('Muayene masası'), eq('Dermatoskop')]),
      svc('Cilt bakımı medikal', 60, 1500, [eq('Buhar / cihaz'), mat('Peeling solüsyonu', 1, 'uygulama')]),
      svc('Leke / akne seansı', 45, 1200, [eq('Tedavi cihazı'), mat('Serum', 1, 'uygulama')]),
      svc('Kontrol', 20, 500, []),
    ],
  },
  {
    slug: 'medical',
    name: 'Genel tıp / poliklinik',
    group: 'Sağlık',
    services: [
      svc('Muayene', 20, 700, [eq('Muayene masası'), eq('Tansiyon aleti'), mat('Eldiven', 1, 'çift')]),
      svc('Kontrol', 15, 400, [eq('Tansiyon aleti')]),
      svc('Enjeksiyon', 15, 300, [mat('Enjektör', 1), mat('Antiseptik', 1, 'kullanım'), mat('Pamuk', 2)]),
      svc('Panseuman', 20, 350, [mat('Pansuman seti', 1), mat('Antiseptik', 1, 'kullanım')]),
    ],
  },
  {
    slug: 'plastic_surgery',
    name: 'Plastik cerrahi / estetik',
    group: 'Sağlık',
    services: [
      svc('Estetik danışmanlık', 45, 1000, []),
      svc('Botoks', 30, 8000, [mat('Botoks flakon', 1), mat('Enjektör', 1), mat('Antiseptik', 1, 'kullanım')], { requiresConsent: true }),
      svc('Dolgu', 45, 6000, [mat('Dolgu enjektörü', 1), mat('Kanül / iğne', 1), mat('Antiseptik', 1, 'kullanım')], { requiresConsent: true }),
      svc('Kontrol muayenesi', 20, 500, []),
    ],
  },
  {
    slug: 'veterinary',
    name: 'Veteriner / pet klinik',
    group: 'Sağlık',
    services: [
      svc('Muayene', 25, 600, [eq('Muayene masası'), mat('Eldiven', 1, 'çift')]),
      svc('Aşı uygulaması', 20, 450, [mat('Aşı', 1, 'doz'), mat('Enjektör', 1)]),
      svc('Chip / kimlik', 15, 400, [mat('Mikroçip', 1)]),
      svc('Tırnak kesimi', 15, 200, [eq('Tırnak makası')]),
      svc('Tıraş / tıbbi bakım', 40, 700, [eq('Tıraş makinesi'), mat('Antiseptik', 1, 'kullanım')]),
      svc('Kontrol', 15, 350, []),
    ],
  },
  {
    slug: 'optic',
    name: 'Optik / göz muayene',
    group: 'Sağlık',
    services: [
      svc('Göz muayenesi', 30, 500, [eq('Foropter / deneme seti'), eq('Otorefraktometre')]),
      svc('Lens uygulama eğitimi', 30, 400, [mat('Deneme lensi', 1, 'çift'), mat('Solüsyon', 1, 'kullanım')]),
      svc('Çerçeve ayarı', 15, 150, [eq('Tornavida / ısıtıcı')]),
      svc('Kontrol', 15, 250, [eq('Gözlük ölçüm cihazı')]),
    ],
  },
  {
    slug: 'photo',
    name: 'Fotoğraf stüdyosu',
    group: 'Diğer',
    services: [
      svc('Portre çekimi', 45, 1500, [eq('Kamera'), eq('Işık seti'), eq('Fon')], { mode: 'resource', capacity: 1 }),
      svc('Ürün çekimi', 60, 2000, [eq('Kamera'), eq('Softbox'), eq('Çekim masası')], { mode: 'resource', capacity: 1 }),
      svc('Pasaport / vesikalık', 15, 200, [eq('Kamera'), eq('Işık')]),
      svc('Dış çekim (saat)', 60, 2500, [eq('Kamera'), eq('Lens seti')]),
      svc('Düğün / etkinlik (saat)', 60, 3500, [eq('Kamera'), eq('Lens seti')]),
      svc('Bebek / aile çekimi', 60, 2200, [eq('Stüdyo'), eq('Işık')], { mode: 'resource', capacity: 1 }),
    ],
  },
  {
    slug: 'pet_grooming',
    name: 'Pet kuaför',
    group: 'Diğer',
    services: [
      svc('Yıkama + tarama', 45, 500, [eq('Yıkama küveti'), eq('Kurutma kafesi'), mat('Şampuan', 1, 'kullanım')]),
      svc('Tıraş / şekil', 60, 700, [eq('Tıraş makinesi'), eq('Makas'), mat('Bıçak / tarak', 1, 'set')]),
      svc('Tırnak kesimi', 20, 200, [eq('Tırnak makası'), mat('Pudra', 1, 'opsiyonel')]),
      svc('Full grooming', 90, 1100, [eq('Makine'), eq('Küvet'), mat('Şampuan', 1, 'kullanım'), mat('Koku spreyi', 1, 'kullanım')]),
    ],
  },
  {
    slug: 'car_detail',
    name: 'Oto yıkama / detailing',
    group: 'Diğer',
    services: [
      svc('Dış yıkama', 30, 250, [eq('Basınçlı yıkama'), mat('Şampuan', 1, 'kullanım'), mat('Mikrofiber', 3)]),
      svc('İç temizleme', 45, 400, [eq('Süpürge'), eq('Buharlı temizleyici'), mat('İç temizleyici', 1, 'kullanım')]),
      svc('Pasta cila', 90, 1200, [eq('Polisaj makinesi'), mat('Pasta', 1, 'uygulama'), mat('Cila', 1, 'uygulama')]),
      svc('Seramik kaplama (araç)', 180, 4500, [eq('Polisaj seti'), mat('Seramik ürün', 1, 'set'), mat('Mikrofiber', 5)]),
      svc('PPF / film kaplama (panel)', 120, 3500, [eq('Kesim masası'), mat('PPF film', 1, 'panel')]),
    ],
  },
  {
    slug: 'coaching',
    name: 'Danışmanlık / koçluk',
    group: 'Diğer',
    services: [
      svc('Tanışma görüşmesi', 30, 0, []),
      svc('Birebir seans', 60, 1500, []),
      svc('Online seans', 60, 1200, []),
      svc('Grup workshop', 90, 800, [eq('Salon'), eq('Projeksiyon')], { mode: 'class', capacity: 20 }),
      svc('Paket değerlendirme', 45, 1000, []),
    ],
  },
  {
    slug: 'tutoring',
    name: 'Dil / özel ders',
    group: 'Diğer',
    services: [
      svc('Özel ders 45 dk', 45, 500, [eq('Tahta / tablet'), mat('Ders materyali', 1, 'set')]),
      svc('Özel ders 60 dk', 60, 650, [eq('Tahta / tablet'), mat('Ders materyali', 1, 'set')]),
      svc('Grup dersi', 60, 350, [eq('Sınıf'), eq('Tahta')], { mode: 'class', capacity: 8 }),
      svc('Deneme dersi', 30, 250, []),
      svc('Online ders', 60, 550, []),
    ],
  },
  {
    slug: 'lash_brow',
    name: 'Kaş & kirpik stüdyosu',
    group: 'Güzellik / bakım',
    services: [
      svc('Kirpik lifting', 60, 750, [mat('Lifting solüsyonu', 1, 'set')], { requiresConsent: true }),
      svc('İpek kirpik (full set)', 100, 1400, [mat('İpek kirpik', 1, 'set')], { requiresConsent: true }),
      svc('İpek kirpik dolgu', 45, 600, [mat('İpek kirpik', 1, 'paket')], { requiresConsent: true }),
      svc('Kaş laminasyon', 45, 650, [mat('Laminasyon seti', 1)], { requiresConsent: true }),
      svc('Kaş tasarımı / boya', 30, 400, [eq('Cımbız'), mat('Boya', 1)]),
    ],
  },
  {
    slug: 'hair_transplant',
    name: 'Saç ekimi',
    group: 'Sağlık',
    services: [
      svc('Konsültasyon', 30, 0, []),
      svc('FUE / DHI işlem günü', 360, 45000, [eq('Operasyon odası'), mat('Greft seti', 1)], { requiresConsent: true }),
      svc('PRP seansı', 45, 3500, [mat('PRP kit', 1)], { requiresConsent: true }),
      svc('Kontrol muayenesi', 20, 500, []),
    ],
  },
  {
    slug: 'crossfit',
    name: 'CrossFit / fonksiyonel',
    group: 'Spor / stüdyo',
    services: [
      svc('Grup WOD', 60, 250, [eq('Box salonu'), eq('Barbell')], { mode: 'class', capacity: 16 }),
      svc('Grup dersi', 45, 200, [eq('Box salonu')], { mode: 'class', capacity: 16 }),
      svc('Özel koçluk', 60, 900, [eq('Barbell'), eq('Kettlebell')]),
      svc('Deneme WOD', 60, 150, [eq('Box salonu')], { mode: 'class', capacity: 12 }),
    ],
  },
  {
    slug: 'music',
    name: 'Müzik dersi',
    group: 'Diğer',
    services: [
      svc('Bireysel ders 45 dk', 45, 600, [eq('Enstrüman / oda')]),
      svc('Bireysel ders 60 dk', 60, 750, [eq('Enstrüman / oda')]),
      svc('Grup dersi', 60, 350, [eq('Derslik')], { mode: 'class', capacity: 6 }),
      svc('Deneme dersi', 30, 250, []),
    ],
  },
  {
    slug: 'osteopathy',
    name: 'Osteopati / manuel terapi',
    group: 'Sağlık',
    services: [
      svc('İlk değerlendirme', 60, 1200, [eq('Tedavi yatağı')]),
      svc('Osteopati seansı', 45, 1100, [eq('Tedavi yatağı')]),
      svc('Kontrol', 30, 700, [eq('Tedavi yatağı')]),
    ],
  },
];

export function getSector(slug: string): SectorDef | undefined {
  return SECTOR_CATALOG.find(s => s.slug === slug);
}

export function sectorsByGroup(): { group: string; sectors: SectorDef[] }[] {
  const map = new Map<string, SectorDef[]>();
  for (const s of SECTOR_CATALOG) {
    const list = map.get(s.group) || [];
    list.push(s);
    map.set(s.group, list);
  }
  return [...map.entries()].map(([group, sectors]) => ({ group, sectors }));
}

export function servicesFromSector(slug: string): Service[] {
  const sector = getSector(slug);
  if (!sector) return [];
  return sector.services.map(s => {
    const resources: ServiceResource[] = (s.resources || []).map(r => ({
      id: uid('res'),
      name: r.name,
      kind: r.kind,
      unit: r.unit,
      defaultQty: r.qty,
    }));
    const mode = s.bookingMode || 'staff';
    return {
      id: uid('svc'),
      name: s.name,
      durationMinutes: s.durationMinutes,
      price: s.price,
      fromSectorSlug: slug,
      resources,
      bookingMode: mode,
      ...(mode === 'class' || mode === 'resource'
        ? { capacity: s.capacity ?? (mode === 'resource' ? 1 : 8) }
        : {}),
      ...(s.processingMinutes ? { processingMinutes: s.processingMinutes } : {}),
      ...(s.requiresConsent ? { requiresConsent: true } : {}),
    };
  });
}

/** Birden fazla sektörün hizmetlerini birleştir (aynı isimde tek kayıt). */
export function servicesFromSectors(slugs: string[]): Service[] {
  const seen = new Set<string>();
  const out: Service[] = [];
  for (const slug of slugs) {
    for (const s of servicesFromSector(slug)) {
      const key = `${slug}::${s.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}

const nameKey = (name: string) => name.trim().toLocaleLowerCase('tr-TR');

/**
 * Sektör katalogundan eksik hizmetleri ekler; aynı isimde olanlara
 * bekleme süresi / onam gibi katalog alanlarını doldurur (fiyat/süreyi ezmez).
 */
export function mergeCatalogServices(
  existing: Service[],
  slugs: string[],
): { services: Service[]; added: number; updated: number } {
  const catalog = servicesFromSectors(slugs);
  const byName = new Map(existing.map(s => [nameKey(s.name), s]));
  let added = 0;
  let updated = 0;
  const next = [...existing];

  for (const cat of catalog) {
    const key = nameKey(cat.name);
    const cur = byName.get(key);
    if (!cur) {
      next.push(cat);
      byName.set(key, cat);
      added += 1;
      continue;
    }
    const patch: Partial<Service> = {};
    if (cat.processingMinutes && !cur.processingMinutes) {
      patch.processingMinutes = cat.processingMinutes;
    }
    if (cat.requiresConsent && !cur.requiresConsent) {
      patch.requiresConsent = true;
    }
    if (cat.bookingMode && !cur.bookingMode) {
      patch.bookingMode = cat.bookingMode;
      if (cat.capacity != null && cur.capacity == null) patch.capacity = cat.capacity;
    }
    if (Object.keys(patch).length) {
      const merged = { ...cur, ...patch };
      const idx = next.findIndex(s => s.id === cur.id);
      if (idx >= 0) next[idx] = merged;
      byName.set(key, merged);
      updated += 1;
    }
  }

  return { services: next, added, updated };
}
