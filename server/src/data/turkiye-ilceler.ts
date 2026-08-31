// Türkiye'nin önemli ilçeleri — proper name map.
// DB'de 30+ ilçe varyantı var (case-sensitive + slash'lı kirletilmiş).
// Format: lowercase anahtar (Türkçe karakterler proper case'de) → doğru proper name
//
// Slash'lı varyantlar ("Altındağ/ankara") normalize sırasında "/" öncesi kısım alınır.
//
// Kullanım: import { TURKIYE_ILCELERI } from '../data/turkiye-ilceler'
export const TURKIYE_ILCELERI: Record<string, string> = {
  // Ankara ilçeleri
  'altindag': 'Altındağ',
  'cankaya': 'Çankaya',
  'etimesgut': 'Etimesgut',
  'kecioren': 'Keçiören',
  'mamak': 'Mamak',
  'sincan': 'Sincan',
  'yenimahalle': 'Yenimahalle',
  // İstanbul ilçeleri
  'sisli': 'Şişli',
  'kadikoy': 'Kadıköy',
  'besiktas': 'Beşiktaş',
  'uskudar': 'Üsküdar',
  'bakirkoy': 'Bakırköy',
  'beyoglu': 'Beyoğlu',
  'fatih': 'Fatih',
  'eyup': 'Eyüp',
  'sariyer': 'Sarıyer',
  // İzmir ilçeleri
  'karsiyaka': 'Karşıyaka',
  'bornova': 'Bornova',
  'konak': 'Konak',
  'buca': 'Buca',
  'cesme': 'Çeşme',
  'tire': 'Tire',
  // Antalya ilçeleri
  'muratpasa': 'Muratpaşa',
  'konyaalti': 'Konyaaltı',
  'kepez': 'Kepez',
  'aksu': 'Aksu',
  // Konya ilçeleri
  'karatay': 'Karatay',
  'meram': 'Meram',
  'selcuklu': 'Selçuklu',
  // Diyarbakır ilçeleri
  'kayapinar': 'Kayapınar',
  'baglar': 'Bağlar',
  'sur': 'Sur',
  'gaziler': 'Gaziler',
  'yenishehir': 'Yenişehir',
  // Mersin ilçeleri
  'tarsus': 'Tarsus',
  'toroslar': 'Toroslar',
  'yenisehir': 'Yenişehir',
  // Bursa ilçeleri
  'osmangazi': 'Osmangazi',
  'nilufer': 'Nilüfer',
  'yildirim': 'Yıldırım',
  // Tekirdağ ilçeleri
  'sarkoy': 'Şarköy',
  'corlu': 'Çorlu',
  'suleymanpasa': 'Süleymanpaşa',
  // Diğer önemli ilçeler
  'kirsehir': 'Kırşehir',  // aslında il, ama OSM'den ilçe olarak gelebilir
  'bolu': 'Bolu',  // aslında il
  'duzce': 'Düzce',  // aslında il
  'aksaray': 'Aksaray',  // il
  'sirnak': 'Şırnak',  // il
  'kirikkale': 'Kırıkkale',  // il
  'kilis': 'Kilis',  // il
  'osmaniye': 'Osmaniye',  // il
  'yalova': 'Yalova',  // il
  'bartin': 'Bartın',  // il
  'karabuk': 'Karabük',  // il
  'kirklareli': 'Kırklareli',  // il
  'kastamonu': 'Kastamonu',  // il
  'hakkari': 'Hakkari',  // il
  'sinop': 'Sinop',  // il
  'giresun': 'Giresun',  // il
  'rize': 'Rize',  // il
  'trabzon': 'Trabzon',  // il
  'artvin': 'Artvin',  // il
  'zonguldak': 'Zonguldak',  // il
  'sakarya': 'Sakarya',  // il
  'ordu': 'Ordu',  // il
  'kayseri': 'Kayseri',  // il
  'sivas': 'Sivas',  // il
  'amasya': 'Amasya',  // il
  'corum': 'Çorum',  // il
  'amasra': 'Amasra',  // Bartın ilçesi
  'inebolu': 'İnebolu',  // Kastamonu ilçesi
  'bafra': 'Bafra',  // Samsun ilçesi
  'carsamba': 'Çarşamba',  // Samsun ilçesi
};
