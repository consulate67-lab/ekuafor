/** Sektöre göre çalışan hitabı (unvan) ve bölüm adları */

export type StaffRoleOption = { key: string; label: string };

type SectorRoles = {
  titles: StaffRoleOption[];
  departments: string[];
};

const COMMON_PARTNER: StaffRoleOption = { key: 'is_yeri_ortagi', label: 'İş yeri ortağı' };
const COMMON_STAFF: StaffRoleOption = { key: 'personel', label: 'Personel' };

const ROLES: Record<string, SectorRoles> = {
  barber: {
    titles: [
      { key: 'usta', label: 'Usta' },
      { key: 'kalfa', label: 'Kalfa' },
      { key: 'cirak', label: 'Çırak' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Erkek kuaför', 'Sakal & tıraş', 'Resepsiyon'],
  },
  hair: {
    titles: [
      { key: 'stilist', label: 'Stilist' },
      { key: 'renk_uzmani', label: 'Renk uzmanı' },
      { key: 'foncu', label: 'Föncü' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Kesim', 'Boya / röfle', 'Bakım', 'Resepsiyon'],
  },
  beauty: {
    titles: [
      { key: 'guzellik_uzmani', label: 'Güzellik uzmanı' },
      { key: 'makyaj_uzmani', label: 'Makyaj uzmanı' },
      { key: 'cilt_bakim', label: 'Cilt bakım uzmanı' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Cilt bakımı', 'Makyaj', 'Kaş / kirpik', 'Ağda', 'Resepsiyon'],
  },
  nails: {
    titles: [
      { key: 'nail_artist', label: 'Nail artist' },
      { key: 'manikurcu', label: 'Manikürcü' },
      { key: 'pedikurcu', label: 'Pedikürcü' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Manikür', 'Pedikür', 'Protez tırnak', 'Resepsiyon'],
  },
  laser: {
    titles: [
      { key: 'lazer_uzmani', label: 'Lazer uzmanı' },
      { key: 'epilasyon_uzmani', label: 'Epilasyon uzmanı' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Lazer', 'IPL', 'Ağda', 'Resepsiyon'],
  },
  pmu: {
    titles: [
      { key: 'pmu_uzmani', label: 'Kalıcı makyaj uzmanı' },
      { key: 'microblading', label: 'Microblading uzmanı' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Kaş', 'Dudak / eyeliner', 'Retuş', 'Resepsiyon'],
  },
  tattoo: {
    titles: [
      { key: 'tatu_sanatcisi', label: 'Dövme sanatçısı' },
      { key: 'piercing', label: 'Piercing uzmanı' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Dövme', 'Piercing', 'Bakım', 'Resepsiyon'],
  },
  solarium: {
    titles: [
      { key: 'solaryum_gorevlisi', label: 'Solaryum görevlisi' },
      { key: 'danisman', label: 'Danışman' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Solaryum', 'Resepsiyon'],
  },
  massage: {
    titles: [
      { key: 'masoz', label: 'Masöz / Masör' },
      { key: 'terapist', label: 'Terapist' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Masaj', 'Aromaterapi', 'Resepsiyon'],
  },
  spa: {
    titles: [
      { key: 'spa_terapisti', label: 'Spa terapisti' },
      { key: 'masoz', label: 'Masöz / Masör' },
      { key: 'danisman', label: 'Danışman' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Spa', 'Hamam / sauna', 'Resepsiyon'],
  },
  wellness: {
    titles: [
      { key: 'terapist', label: 'Terapist' },
      { key: 'wellness_danismani', label: 'Wellness danışmanı' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Wellness', 'Terapi odaları', 'Resepsiyon'],
  },
  pilates_yoga: {
    titles: [
      { key: 'egitmen', label: 'Eğitmen' },
      { key: 'bas_egitmen', label: 'Baş eğitmen' },
      { key: 'asistan_egitmen', label: 'Asistan eğitmen' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Pilates', 'Yoga', 'Grup dersleri', 'Resepsiyon'],
  },
  fitness: {
    titles: [
      { key: 'egitmen', label: 'Eğitmen' },
      { key: 'kisisel_antrenor', label: 'Kişisel antrenör' },
      { key: 'salon_sorumlusu', label: 'Salon sorumlusu' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Fitness alanı', 'PT stüdyosu', 'Resepsiyon'],
  },
  dance: {
    titles: [
      { key: 'egitmen', label: 'Eğitmen' },
      { key: 'koreograf', label: 'Koreograf' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Dans stüdyosu', 'Grup dersleri', 'Resepsiyon'],
  },
  martial: {
    titles: [
      { key: 'hoca', label: 'Hoca / Sensei' },
      { key: 'egitmen', label: 'Eğitmen' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Antrenman salonu', 'Çocuk grubu', 'Resepsiyon'],
  },
  pool: {
    titles: [
      { key: 'egitmen', label: 'Yüzme eğitmeni' },
      { key: 'can_kurtaran', label: 'Can kurtaran' },
      { key: 'havuz_gorevlisi', label: 'Havuz görevlisi' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Havuz', 'Kulvarlar', 'Resepsiyon'],
  },
  sports_facility: {
    titles: [
      { key: 'saha_sorumlusu', label: 'Saha sorumlusu' },
      { key: 'gorevli', label: 'Görevli' },
      { key: 'teknik', label: 'Teknik personel' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Saha', 'Soyunma', 'Resepsiyon'],
  },
  dental: {
    titles: [
      { key: 'dis_hekimi', label: 'Diş hekimi' },
      { key: 'asistan', label: 'Diş asistanı' },
      { key: 'hijyenist', label: 'Hijyenist' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Muayene', 'Ortodonti', 'Protez', 'Resepsiyon'],
  },
  physio: {
    titles: [
      { key: 'fizyoterapist', label: 'Fizyoterapist' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Fizyoterapi', 'Egzersiz salonu', 'Resepsiyon'],
  },
  podiatry: {
    titles: [
      { key: 'podolog', label: 'Podolog' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Ayak bakımı', 'Tedavi', 'Resepsiyon'],
  },
  dietitian: {
    titles: [
      { key: 'diyetisyen', label: 'Diyetisyen' },
      { key: 'danisman', label: 'Danışman' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Beslenme danışmanlığı', 'Resepsiyon'],
  },
  psychology: {
    titles: [
      { key: 'psikolog', label: 'Psikolog' },
      { key: 'terapist', label: 'Terapist' },
      { key: 'danisman', label: 'Danışman' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Görüşme odası', 'Resepsiyon'],
  },
  dermatology: {
    titles: [
      { key: 'dermatolog', label: 'Dermatolog' },
      { key: 'hemsire', label: 'Hemşire' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Muayene', 'İşlem odası', 'Resepsiyon'],
  },
  medical: {
    titles: [
      { key: 'doktor', label: 'Doktor' },
      { key: 'hemsire', label: 'Hemşire' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Muayene', 'Tedavi', 'Resepsiyon'],
  },
  plastic_surgery: {
    titles: [
      { key: 'doktor', label: 'Doktor' },
      { key: 'hemsire', label: 'Hemşire' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Konsültasyon', 'İşlem', 'Resepsiyon'],
  },
  veterinary: {
    titles: [
      { key: 'veteriner', label: 'Veteriner hekim' },
      { key: 'tekniker', label: 'Veteriner tekniker' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Muayene', 'Ameliyathane', 'Resepsiyon'],
  },
  optic: {
    titles: [
      { key: 'optisyen', label: 'Optisyen' },
      { key: 'gozlukcu', label: 'Gözlükçü' },
      { key: 'danisman', label: 'Danışman' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Ölçüm', 'Satış', 'Montaj', 'Resepsiyon'],
  },
  photo: {
    titles: [
      { key: 'fotografci', label: 'Fotoğrafçı' },
      { key: 'isikci', label: 'Işıkçı / asistan' },
      { key: 'retus', label: 'Retüş uzmanı' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Stüdyo', 'Dış çekim', 'Post-prodüksiyon'],
  },
  pet_grooming: {
    titles: [
      { key: 'pet_kuaför', label: 'Pet kuaför' },
      { key: 'bakici', label: 'Bakıcı' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Yıkama', 'Tıraş / tarama', 'Resepsiyon'],
  },
  car_detail: {
    titles: [
      { key: 'detailer', label: 'Detailer' },
      { key: 'yikama_uzmani', label: 'Yıkama uzmanı' },
      { key: 'teknik', label: 'Teknik personel' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Yıkama', 'İç detay', 'Pasta / cila', 'Resepsiyon'],
  },
  coaching: {
    titles: [
      { key: 'koc', label: 'Koç' },
      { key: 'mentor', label: 'Mentor' },
      { key: 'danisman', label: 'Danışman' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Bireysel seans', 'Grup seansı', 'Resepsiyon'],
  },
  tutoring: {
    titles: [
      { key: 'ogretmen', label: 'Öğretmen' },
      { key: 'ozel_ders', label: 'Özel ders öğretmeni' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Matematik', 'Fen', 'Dil', 'Online ders', 'Resepsiyon'],
  },
  lash_brow: {
    titles: [
      { key: 'lash_uzmani', label: 'Kirpik uzmanı' },
      { key: 'kas_uzmani', label: 'Kaş uzmanı' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Kirpik', 'Kaş', 'Resepsiyon'],
  },
  hair_transplant: {
    titles: [
      { key: 'doktor', label: 'Doktor' },
      { key: 'hemsire', label: 'Hemşire' },
      { key: 'tekniker', label: 'Tekniker' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Konsültasyon', 'Operasyon', 'PRP', 'Resepsiyon'],
  },
  crossfit: {
    titles: [
      { key: 'coach', label: 'Coach' },
      { key: 'bas_coach', label: 'Baş coach' },
      { key: 'asistan', label: 'Asistan' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['WOD alanı', 'Açık alan', 'Resepsiyon'],
  },
  music: {
    titles: [
      { key: 'ogretmen', label: 'Öğretmen' },
      { key: 'piyano', label: 'Piyano öğretmeni' },
      { key: 'gitar', label: 'Gitar öğretmeni' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Piyano', 'Gitar', 'Şan', 'Grup dersi', 'Resepsiyon'],
  },
  osteopathy: {
    titles: [
      { key: 'osteopat', label: 'Osteopat' },
      { key: 'terapist', label: 'Terapist' },
      COMMON_PARTNER,
      COMMON_STAFF,
    ],
    departments: ['Tedavi odası', 'Resepsiyon'],
  },
};

const FALLBACK: SectorRoles = {
  titles: [
    { key: 'usta', label: 'Usta' },
    { key: 'kalfa', label: 'Kalfa' },
    COMMON_PARTNER,
    COMMON_STAFF,
  ],
  departments: ['Genel', 'Resepsiyon'],
};

function rolesForSlug(slug: string): SectorRoles {
  return ROLES[slug] || FALLBACK;
}

/** Seçili sektörlere göre birleşik unvan listesi (tekrarsız) */
export function staffTitlesForSectors(slugs: string[]): StaffRoleOption[] {
  const list = slugs.length ? slugs : ['barber'];
  const seen = new Set<string>();
  const out: StaffRoleOption[] = [];
  for (const slug of list) {
    for (const t of rolesForSlug(slug).titles) {
      if (seen.has(t.key)) continue;
      seen.add(t.key);
      out.push(t);
    }
  }
  return out.length ? out : FALLBACK.titles;
}

/** Seçili sektörlere göre bölüm adları */
export function departmentNamesForSectors(slugs: string[]): string[] {
  const list = slugs.length ? slugs : ['barber'];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slug of list) {
    for (const d of rolesForSlug(slug).departments) {
      const key = d.toLocaleLowerCase('tr-TR');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(d);
    }
  }
  return out.length ? out : FALLBACK.departments;
}

export function defaultStaffTitle(slugs: string[]): string {
  return staffTitlesForSectors(slugs)[0]?.key || 'personel';
}

export function titleLabel(key: string, slugs: string[] = []): string {
  const all = staffTitlesForSectors(slugs.length ? slugs : Object.keys(ROLES));
  return all.find(t => t.key === key)?.label || key;
}
