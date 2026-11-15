/** Sektöre özel kampanya / abone paket şablonları */

export type SectorPackageTemplate = {
  key: string;
  name: string;
  /** TRY varsayılan paket fiyatı */
  price: number;
  /** Geçerlilik (gün) */
  validityDays: number;
  /** Eşleşecek hizmet adları (katalogdaki isim) */
  serviceNames: string[];
  /** Her hizmet için hak sayısı */
  usesPerService: number;
};

export const SECTOR_PACKAGES: Record<string, SectorPackageTemplate[]> = {
  laser: [
    {
      key: 'laser_6',
      name: 'Lazer 6 seans paketi',
      price: 4200,
      validityDays: 180,
      serviceNames: ['Lazer epilasyon (bölge)'],
      usesPerService: 6,
    },
    {
      key: 'laser_8',
      name: 'Lazer 8 seans paketi',
      price: 5200,
      validityDays: 240,
      serviceNames: ['Lazer epilasyon (bölge)'],
      usesPerService: 8,
    },
  ],
  physio: [
    {
      key: 'physio_10',
      name: 'FTR 10 seans',
      price: 7500,
      validityDays: 90,
      serviceNames: ['FTR seansı'],
      usesPerService: 10,
    },
  ],
  pilates_yoga: [
    {
      key: 'pilates_8',
      name: '8 derslik pilates/yoga paketi',
      price: 2400,
      validityDays: 60,
      serviceNames: ['Grup dersi', 'Mat pilates (özel)'],
      usesPerService: 8,
    },
  ],
  fitness: [
    {
      key: 'pt_12',
      name: '12 PT seansı',
      price: 9000,
      validityDays: 90,
      serviceNames: ['PT seansı 45 dk', 'PT seansı 60 dk'],
      usesPerService: 12,
    },
    {
      key: 'fitness_group_8',
      name: '8 grup dersi',
      price: 1600,
      validityDays: 45,
      serviceNames: ['Grup dersi'],
      usesPerService: 8,
    },
  ],
  dietitian: [
    {
      key: 'diet_4',
      name: '4 kontrollük diyet paketi',
      price: 1800,
      validityDays: 60,
      serviceNames: ['Kontrol görüşmesi'],
      usesPerService: 4,
    },
  ],
  massage: [
    {
      key: 'massage_5',
      name: '5 masaj seansı',
      price: 4200,
      validityDays: 60,
      serviceNames: ['Klasik masaj 60 dk'],
      usesPerService: 5,
    },
  ],
  nails: [
    {
      key: 'nails_4',
      name: '4 kalıcı oje bakımı',
      price: 2200,
      validityDays: 90,
      serviceNames: ['Kalıcı oje (gel)'],
      usesPerService: 4,
    },
  ],
  beauty: [
    {
      key: 'lash_3',
      name: '3 kirpik dolgu/lifting',
      price: 1800,
      validityDays: 90,
      serviceNames: ['Kirpik lifting', 'İpek kirpik (full set)'],
      usesPerService: 3,
    },
  ],
  hair: [
    {
      key: 'hair_care_3',
      name: '3 bakım seansı',
      price: 2000,
      validityDays: 90,
      serviceNames: ['Saç bakımı / maske'],
      usesPerService: 3,
    },
  ],
  barber: [
    {
      key: 'barber_month',
      name: 'Aylık tıraş paketi (4)',
      price: 1000,
      validityDays: 35,
      serviceNames: ['Saç kesimi', 'Saç + sakal'],
      usesPerService: 4,
    },
  ],
  pool: [
    {
      key: 'swim_8',
      name: '8 yüzme dersi',
      price: 2800,
      validityDays: 60,
      serviceNames: ['Özel yüzme dersi', 'Grup yüzme'],
      usesPerService: 8,
    },
  ],
  dance: [
    {
      key: 'dance_8',
      name: '8 grup dans dersi',
      price: 2000,
      validityDays: 60,
      serviceNames: ['Grup dersi'],
      usesPerService: 8,
    },
  ],
  martial: [
    {
      key: 'martial_8',
      name: '8 grup antrenman',
      price: 2200,
      validityDays: 60,
      serviceNames: ['Grup antrenman'],
      usesPerService: 8,
    },
  ],
  tutoring: [
    {
      key: 'tutor_8',
      name: '8 özel ders',
      price: 3600,
      validityDays: 60,
      serviceNames: ['Özel ders 45 dk', 'Özel ders 60 dk'],
      usesPerService: 8,
    },
  ],
  coaching: [
    {
      key: 'coach_4',
      name: '4 koçluk seansı',
      price: 4800,
      validityDays: 90,
      serviceNames: ['Birebir seans'],
      usesPerService: 4,
    },
  ],
  crossfit: [
    {
      key: 'cf_12',
      name: '12 WOD / grup antrenman',
      price: 2400,
      validityDays: 45,
      serviceNames: ['Grup WOD', 'Grup dersi'],
      usesPerService: 12,
    },
  ],
  lash_brow: [
    {
      key: 'lash_refill_3',
      name: '3 dolgu / lifting',
      price: 2100,
      validityDays: 90,
      serviceNames: ['Kirpik lifting', 'İpek kirpik dolgu'],
      usesPerService: 3,
    },
  ],
  hair_transplant: [
    {
      key: 'ht_follow_3',
      name: '3 kontrol paketi',
      price: 1500,
      validityDays: 180,
      serviceNames: ['Kontrol muayenesi'],
      usesPerService: 3,
    },
  ],
  music: [
    {
      key: 'music_8',
      name: '8 enstrüman dersi',
      price: 4000,
      validityDays: 60,
      serviceNames: ['Bireysel ders 45 dk', 'Bireysel ders 60 dk'],
      usesPerService: 8,
    },
  ],
  veterinary: [
    {
      key: 'vet_vaccine_year',
      name: 'Yıllık aşı takip (3)',
      price: 1200,
      validityDays: 365,
      serviceNames: ['Aşı uygulaması'],
      usesPerService: 3,
    },
  ],
  pet_grooming: [
    {
      key: 'pet_4',
      name: '4 grooming',
      price: 3600,
      validityDays: 120,
      serviceNames: ['Full grooming', 'Yıkama + tarama'],
      usesPerService: 4,
    },
  ],
};

export function packagesForSectors(slugs: string[]): SectorPackageTemplate[] {
  const seen = new Set<string>();
  const out: SectorPackageTemplate[] = [];
  for (const slug of slugs) {
    for (const p of SECTOR_PACKAGES[slug] || []) {
      if (seen.has(p.key)) continue;
      seen.add(p.key);
      out.push(p);
    }
  }
  return out;
}
