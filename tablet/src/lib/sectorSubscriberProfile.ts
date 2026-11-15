import type { SubscriberGender } from '../types';

/** Abone kartında sektöre göre hangi alanlar görünür */
export type BirthDateMode = 'hidden' | 'optional' | 'required';

export type SectorSubscriberProfile = {
  /** Gösterilecek cinsiyet seçenekleri (sıra önemli) */
  genders: SubscriberGender[];
  birthDate: BirthDateMode;
  /** Pet / veteriner */
  showPet: boolean;
  /** Grup dersi / seans eşleme UI */
  showGroupSessions: boolean;
  /** Yaş sınırı (grup tanımı + abone kontrolü) */
  ageRelevant: boolean;
  /** Varsayılan cinsiyet */
  defaultGender: SubscriberGender;
  /** Kısa ipucu */
  hint?: string;
};

const ADULT: SubscriberGender[] = ['Kadın', 'Erkek', 'Diğer'];
const WITH_KIDS: SubscriberGender[] = ['Kadın', 'Erkek', 'Kız çocuk', 'Erkek çocuk', 'Diğer'];
const KIDS_FOCUS: SubscriberGender[] = ['Kız çocuk', 'Erkek çocuk', 'Kadın', 'Erkek', 'Diğer'];

const PROFILES: Record<string, SectorSubscriberProfile> = {
  hair: {
    genders: ADULT,
    birthDate: 'hidden',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  barber: {
    genders: ['Erkek', 'Erkek çocuk', 'Diğer'],
    birthDate: 'hidden',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Erkek',
  },
  beauty: {
    genders: ADULT,
    birthDate: 'hidden',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  nails: {
    genders: ADULT,
    birthDate: 'hidden',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  laser: {
    genders: ADULT,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
    hint: 'Lazer için onam ve yaş uygunluğu önemlidir',
  },
  lash_brow: {
    genders: ADULT,
    birthDate: 'hidden',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  pmu: {
    genders: ADULT,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  tattoo: {
    genders: ADULT,
    birthDate: 'required',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: true,
    defaultGender: 'Erkek',
    hint: '18 yaş altı için yasal kısıtlar geçerlidir',
  },
  solarium: {
    genders: ADULT,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  massage: {
    genders: ADULT,
    birthDate: 'hidden',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  spa: {
    genders: ADULT,
    birthDate: 'hidden',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  wellness: {
    genders: ADULT,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: true,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  pilates_yoga: {
    genders: WITH_KIDS,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: true,
    ageRelevant: true,
    defaultGender: 'Kadın',
    hint: 'Çocuk / genç grupları için doğum tarihi önerilir',
  },
  fitness: {
    genders: WITH_KIDS,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: true,
    ageRelevant: true,
    defaultGender: 'Erkek',
  },
  crossfit: {
    genders: ADULT,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: true,
    ageRelevant: true,
    defaultGender: 'Erkek',
  },
  dance: {
    genders: WITH_KIDS,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: true,
    ageRelevant: true,
    defaultGender: 'Kadın',
  },
  martial: {
    genders: WITH_KIDS,
    birthDate: 'required',
    showPet: false,
    showGroupSessions: true,
    ageRelevant: true,
    defaultGender: 'Erkek çocuk',
    hint: 'Yaş grubu ve kemer seviyesi için doğum tarihi gerekli',
  },
  pool: {
    genders: KIDS_FOCUS,
    birthDate: 'required',
    showPet: false,
    showGroupSessions: true,
    ageRelevant: true,
    defaultGender: 'Erkek çocuk',
    hint: 'Çocuk yüzme gruplarında yaş sınırı uygulanır',
  },
  sports_facility: {
    genders: WITH_KIDS,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Erkek',
  },
  physio: {
    genders: ADULT,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  dietitian: {
    genders: ADULT,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  dental: {
    genders: WITH_KIDS,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  aesthetic: {
    genders: ADULT,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  hair_transplant: {
    genders: ADULT,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Erkek',
  },
  osteopathy: {
    genders: ADULT,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  veterinary: {
    genders: ADULT,
    birthDate: 'hidden',
    showPet: true,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
    hint: 'Sahip bilgisi + pet kartı',
  },
  pet_grooming: {
    genders: ADULT,
    birthDate: 'hidden',
    showPet: true,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  photography: {
    genders: WITH_KIDS,
    birthDate: 'optional',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  car_detail: {
    genders: ADULT,
    birthDate: 'hidden',
    showPet: false,
    showGroupSessions: false,
    ageRelevant: false,
    defaultGender: 'Erkek',
  },
  coaching: {
    genders: ADULT,
    birthDate: 'hidden',
    showPet: false,
    showGroupSessions: true,
    ageRelevant: false,
    defaultGender: 'Kadın',
  },
  tutoring: {
    genders: KIDS_FOCUS,
    birthDate: 'required',
    showPet: false,
    showGroupSessions: true,
    ageRelevant: true,
    defaultGender: 'Erkek çocuk',
    hint: 'Öğrenci yaş / sınıf için doğum tarihi gerekli',
  },
  music: {
    genders: WITH_KIDS,
    birthDate: 'required',
    showPet: false,
    showGroupSessions: true,
    ageRelevant: true,
    defaultGender: 'Kız çocuk',
  },
};

const FALLBACK: SectorSubscriberProfile = {
  genders: ADULT,
  birthDate: 'optional',
  showPet: false,
  showGroupSessions: false,
  ageRelevant: false,
  defaultGender: 'Kadın',
};

/** Birden fazla sektör birleşince en geniş ihtiyaç kazanır */
export function subscriberProfileForSectors(slugs: string[]): SectorSubscriberProfile {
  if (!slugs.length) return FALLBACK;
  const list = slugs.map(s => PROFILES[s] || FALLBACK);

  const genderOrder: SubscriberGender[] = [
    'Kadın',
    'Erkek',
    'Kız çocuk',
    'Erkek çocuk',
    'Diğer',
  ];
  const genderSet = new Set<SubscriberGender>();
  for (const p of list) for (const g of p.genders) genderSet.add(g);
  const genders = genderOrder.filter(g => genderSet.has(g));

  const birthRank = { hidden: 0, optional: 1, required: 2 } as const;
  let birthDate: BirthDateMode = 'hidden';
  for (const p of list) {
    if (birthRank[p.birthDate] > birthRank[birthDate]) birthDate = p.birthDate;
  }

  const showPet = list.some(p => p.showPet);
  const showGroupSessions = list.some(p => p.showGroupSessions);
  const ageRelevant = list.some(p => p.ageRelevant);
  const defaultGender = list[0]?.defaultGender || 'Kadın';
  const hint = list.map(p => p.hint).filter(Boolean)[0];

  return {
    genders: genders.length ? genders : ADULT,
    birthDate,
    showPet,
    showGroupSessions,
    ageRelevant,
    defaultGender: genders.includes(defaultGender) ? defaultGender : genders[0],
    hint,
  };
}

export function sectorSupportsGroupSessions(slugs: string[]): boolean {
  return subscriberProfileForSectors(slugs).showGroupSessions;
}

/** YYYY-MM-DD → yaş (tam yıl) */
export function ageFromBirthDate(birthDate: string, onDate?: string): number | null {
  const raw = (birthDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split('-').map(Number);
  const ref = onDate && /^\d{4}-\d{2}-\d{2}$/.test(onDate)
    ? onDate.split('-').map(Number)
    : (() => {
        const n = new Date();
        return [n.getFullYear(), n.getMonth() + 1, n.getDate()];
      })();
  let age = ref[0] - y;
  if (ref[1] < m || (ref[1] === m && ref[2] < d)) age -= 1;
  return age < 0 || age > 130 ? null : age;
}

export function genderFitsAgeBand(
  gender: SubscriberGender | undefined,
  age: number | null,
): boolean {
  if (age == null) return true;
  if (gender === 'Kız çocuk' || gender === 'Erkek çocuk') return age < 18;
  return true;
}
