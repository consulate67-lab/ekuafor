/** Mevcut CompanyPanel / SalonBoard alanlarıyla uyumlu kavramsal model. */

/** Sektöre göre değişir — key string (usta, egitmen, doktor…) */
export type StaffTitle = string;

/** Geriye uyum: berber varsayılanları; ekranda staffTitlesForSectors kullanın */
export const STAFF_TITLES: { key: string; label: string }[] = [
  { key: 'usta', label: 'Usta' },
  { key: 'kalfa', label: 'Kalfa' },
  { key: 'is_yeri_ortagi', label: 'İş yeri ortağı' },
  { key: 'personel', label: 'Personel' },
];

/** Dashboard / ProfileTab ile aynı seçenekler */
export const SLOT_OPTIONS = [15, 20, 30, 45, 60, 90, 120] as const;

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  photo?: string;
  title: StaffTitle;
  departmentId: string;
  workStart: string; // HH:mm — hafta içi
  workEnd: string;
  /** Hafta sonu mesai — yoksa workStart/workEnd kullanılır */
  weekendWorkStart?: string;
  weekendWorkEnd?: string;
  /** Bu personelin verebileceği hizmet id listesi */
  serviceIds?: string[];
}

/** Hizmet altında kullanılan ekipman veya sarf malzeme */
export interface ServiceResource {
  id: string;
  name: string;
  kind: 'equipment' | 'material';
  unit?: string;
  defaultQty?: number;
}

export type ServiceBookingMode = 'staff' | 'class' | 'resource';

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  /** staff: bireysel; class: grup; resource: alan/cihaz (kabin, saha, kulvar…) */
  bookingMode?: ServiceBookingMode;
  /** class / resource kapasite — varsayılan 8 (class) veya 1 (resource) */
  capacity?: number;
  /**
   * Boya / maske / lifting vb. ortadaki bekleme (dk).
   * Bu sürede personel başka müşteri alabilir; randevu panosu ve yerleştirme buna göre açılır.
   */
  processingMinutes?: number;
  /** Lazer / dövme / estetik — onam gerekli */
  requiresConsent?: boolean;
  /** Kurulumda sektör şablonundan geldiyse */
  fromSectorSlug?: string;
  resources?: ServiceResource[];
}

export type AppointmentStatus = 'planned' | 'done' | 'cancelled';
export type DayEventKind = 'appointment' | 'leave';

export interface DayEvent {
  id: string;
  kind: DayEventKind;
  staffId: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  customerName?: string;
  customerPhone?: string;
  serviceId?: string;
  /** İşleme ait liste fiyatı (hizmetten) */
  price?: number;
  /** Tamamlanınca tahsil edilen tutar */
  collectedPrice?: number;
  /** Tahsilat yöntemi */
  paymentMethod?: 'cash' | 'card';
  subscriberId?: string;
  campaignId?: string;
  note?: string;
  /** Web’den onaylanan randevunun sunucu id’si */
  serverAppointmentId?: number;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

export interface StaffExpense {
  id: string;
  staffId: string;
  date: string;
  amount: number;
  description: string;
  createdAt: string;
}

/** Kampanya: tarih aralığı + fiyat + hizmet seti (sektör paket şablonundan gelebilir) */
export interface Campaign {
  id: string;
  name: string;
  price: number;
  startDate: string;
  endDate: string;
  serviceIds: string[];
  /** Her hizmet için başlangıç hakkı (yoksa 1) */
  usesPerService?: number;
  /** Şablon slug — örn. laser_6 */
  templateKey?: string;
  active: boolean;
  createdAt: string;
}

export type SubscriberGender = 'Kadın' | 'Erkek' | 'Kız çocuk' | 'Erkek çocuk' | 'Diğer';

export interface SubscriberPayment {
  id: string;
  amount: number;
  method: 'cash' | 'card';
  at: string;
  note?: string;
}

/**
 * Abone (müşteri kartı / paket): önden alınan hizmet hakkı.
 * remainingByService: her hizmet için kalan kullanım.
 * totalPrice − pricePaid = borç.
 */
/** Pet / öğrenci gibi hizmet alan profil (sahip abone kartına bağlı) */
export interface DependentProfile {
  id: string;
  kind: 'pet' | 'student' | 'other';
  name: string;
  /** Köpek / kedi / kuş… veya sınıf */
  speciesOrDetail?: string;
  birthDate?: string;
  note?: string;
}

export interface Subscriber {
  id: string;
  /** Geriye uyum: firstName + lastName */
  name: string;
  firstName?: string;
  lastName?: string;
  gender?: SubscriberGender;
  /** YYYY-MM-DD — yüzme / ders / yaş grubu sektörlerinde */
  birthDate?: string;
  phone: string;
  campaignId?: string;
  serviceIds: string[];
  remainingByService: Record<string, number>;
  startDate: string;
  endDate: string;
  /** Paket toplam tutarı */
  totalPrice?: number;
  /** Bugüne kadar ödenen (ödemeler toplamı ile senkron) */
  pricePaid: number;
  paymentMethod?: 'cash' | 'card';
  payments?: SubscriberPayment[];
  /** Önden tanımlanan tekrarlı randevu planı */
  programPlan?: SubscriberProgramPlan;
  /** Abone kaydında eşlenen grup seans id’leri */
  enrolledGroupSessionIds?: string[];
  /** Veteriner / pet / özel ders */
  dependents?: DependentProfile[];
  note?: string;
  createdAt: string;
}

/** Kayıtlı abone program planı — randevular bu plana göre tarih aralığında üretilir */
export interface SubscriberProgramPlan {
  startDate: string;
  endDate: string;
  months: number;
  weekdays: number[];
  timeStart: string;
  timeEnd: string;
  createdAt: string;
  /** Son uygulamada oluşan event id’leri */
  eventIds?: string[];
  appliedAt?: string;
}

/** QR ile açılan firma web sayfası alanları */
export interface WebPageProfile {
  /** Sektör şablonu id — örn. hair-03 */
  templateId?: string;
  about?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  contactNote?: string;
  website?: string;
  /** true ise müşteri web sayfasında fiyatlar gizlenir */
  hidePrices?: boolean;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  /** false ise müşteri sayfasında telefon gizlenir (varsayılan: göster) */
  showPhone?: boolean;
  /** false ise müşteri sayfasında adres gizlenir (varsayılan: göster) */
  showAddress?: boolean;
  /**
   * Sayfada yayınlanacak görseller (kapak + galeri).
   * data:image/... veya https URL; boş slot şablon görseline düşer.
   */
  gallery?: string[];
  /** Üst slogan — boşsa şablon tagline kullanılır */
  tagline?: string;
}

export interface CompanySetup {
  name: string;
  /** Hafta içi (Pzt–Cum) açılış / kapanış */
  workStart: string;
  workEnd: string;
  /** Hafta sonu (Cmt–Paz) — yoksa hafta içi saatleri kullanılır */
  weekendWorkStart?: string;
  weekendWorkEnd?: string;
  /** true ise Cumartesi–Pazar kapalı */
  weekendClosed?: boolean;
  /** Günün kaç dakikalık parçalara bölüneceği — companies.slot_interval */
  slotInterval: number;
  location: GeoLocation | null;
  /** Çoklu sektör desteği */
  sectorSlugs?: string[];
  sectorNames?: string[];
  /** Geriye uyum */
  sectorSlug?: string;
  sectorName?: string;
  activationKey?: string;
  /** Sunucuya otomatik kayıttan dönen id */
  serverCompanyId?: number;
  /** Müşteri web sayfası (hakkında / iletişim) */
  webPage?: WebPageProfile;
  setupCompletedAt: string;
}

/**
 * Grup dersi tanımı — tarih/saat/çalışan + katılımcı öğrenciler.
 * Birden fazla bağımsız seans olabilir; her seansın kendi öğrencileri vardır.
 */
export interface GroupSession {
  id: string;
  /** Opsiyonel etiket — örn. "Salı Yoga A grubu" */
  name?: string;
  staffId: string;
  serviceId: string;
  date: string;
  startTime: string;
  /** Tanım anındaki kapasite */
  capacity: number;
  /** Yaş alt sınırı (dahil) — örn. çocuk yüzme 5 */
  minAge?: number;
  /** Yaş üst sınırı (dahil) — örn. 12 */
  maxAge?: number;
  /** Bu seansa kayıtlı abone id’leri */
  subscriberIds: string[];
  /** Kapasite dolunca bekleme listesi */
  waitlistSubscriberIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface TabletState {
  deviceId: string;
  company: CompanySetup | null;
  departments: Department[];
  staff: Staff[];
  services: Service[];
  events: DayEvent[];
  expenses: StaffExpense[];
  campaigns: Campaign[];
  subscribers: Subscriber[];
  /** Çalışan + saat + grup hizmeti atamaları */
  groupSessions: GroupSession[];
  syncQueue: SyncPayload[];
  lastSyncAt?: string;
}

export interface SyncPayload {
  id: string;
  createdAt: string;
  type: 'snapshot' | 'event';
  body: unknown;
}

export type Screen =
  | 'setup'
  | 'board'
  | 'settings'
  | 'reports'
  | 'campaigns'
  | 'subscribers'
  | 'groupClasses'
  | 'qr';
