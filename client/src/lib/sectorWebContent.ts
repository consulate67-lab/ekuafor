import { sectorLayoutGroup, type SectorLayoutGroup } from './sectorLayout';

export type SectorNewsItem = { title: string; summary: string; tag: string };
export type SectorWebPack = {
    tagline: string;
    aboutFallback: string;
    gallery: { src: string; alt: string }[];
    news: SectorNewsItem[];
};

const img = (id: string, alt: string) => ({
    src: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`,
    alt,
});

const BY_GROUP: Record<SectorLayoutGroup, SectorWebPack> = {
    beauty: {
        tagline: 'Güzellik ve bakımda güvenilir adres',
        aboutFallback:
            'Profesyonel ekibimizle saç, cilt ve bakım hizmetlerinde size özel çözümler sunuyoruz. Hijyen, kalite ve samimi hizmet önceliğimiz.',
        gallery: [
            img('photo-1560066984-138dadb4c035', 'Salon atmosferi'),
            img('photo-1522337360788-8b13dee7a37e', 'Saç bakımı'),
            img('photo-1516975080664-ed2fc6a32937', 'Güzellik detayı'),
            img('photo-1487412947147-5cebf100ffc2', 'Makyaj'),
        ],
        news: [
            {
                tag: 'Trend',
                title: 'Doğal görünümlü balyaj sezonu',
                summary: 'Bu sezon yumuşak geçişli balyaj ve bakım odaklı uygulamalar öne çıkıyor.',
            },
            {
                tag: 'Bakım',
                title: 'Keratin sonrası bakım ipuçları',
                summary: 'Sülfatsız şampuan ve ısı koruyucu kullanarak sonucun kalıcılığını artırabilirsiniz.',
            },
            {
                tag: 'İpuçu',
                title: 'Cilt bakımında rutin neden önemli?',
                summary: 'Düzenli temizlik ve nemlendirme, salon bakımının etkisini uzatır.',
            },
        ],
    },
    sport: {
        tagline: 'Hareket, güç ve dengeli antrenman',
        aboutFallback:
            'Alanımızda bireysel ve grup antrenmanlarıyla hedeflerinize ulaşmanıza yardımcı oluyoruz. Güvenli ekipman ve deneyimli eğitmen kadrosu.',
        gallery: [
            img('photo-1534438327276-14e5300c3a48', 'Fitness salonu'),
            img('photo-1518611012118-696072aa579a', 'Yoga / pilates'),
            img('photo-1571902943202-507ec2618e8f', 'Antrenman'),
            img('photo-1540497077202-7c8a3999166f', 'Spor ekipmanı'),
        ],
        news: [
            {
                tag: 'Antrenman',
                title: 'Haftada 3 gün yeterli mi?',
                summary: 'Düzenli ve planlı 3 seans, birçok hedef için sürdürülebilir bir başlangıçtır.',
            },
            {
                tag: 'Beslenme',
                title: 'Antrenman öncesi hafif enerji',
                summary: 'Karbonhidrat ağırlıklı küçük bir öğün performansı destekler.',
            },
            {
                tag: 'Toparlanma',
                title: 'Esneklik çalışmasını unutmayın',
                summary: 'Seans sonu germe, sakatlanma riskini azaltır ve hareket kalitesini artırır.',
            },
        ],
    },
    clinic: {
        tagline: 'Güvenilir klinik yaklaşım',
        aboutFallback:
            'Uzman kadromuzla muayene ve tedavi süreçlerinde şeffaf, dikkatli ve hasta odaklı hizmet sunuyoruz.',
        gallery: [
            img('photo-1519494026892-80bbd2d6fd0d', 'Klinik alan'),
            img('photo-1579684385127-1ef15d508118', 'Muayene'),
            img('photo-1588776814546-1ffcf47267a5', 'Diş / klinik'),
            img('photo-1666214280557-f1b5022eb634', 'Sağlık ekibi'),
        ],
        news: [
            {
                tag: 'Sağlık',
                title: 'Erken kontrol fark yaratır',
                summary: 'Düzenli kontroller, küçük sorunların büyümeden çözülmesine yardımcı olur.',
            },
            {
                tag: 'Hijyen',
                title: 'Klinik hijyen standartları',
                summary: 'Sterilizasyon ve tek kullanımlık malzemeler hasta güvenliğinin temelidir.',
            },
            {
                tag: 'İpuçu',
                title: 'Randevu öncesi hazırlık',
                summary: 'Şikâyetlerinizi ve kullandığınız ilaçları not almak görüşmeyi hızlandırır.',
            },
        ],
    },
    default: {
        // Ofis görseli yok — varsayılan erkek kuaför / berber atmosferi
        tagline: 'Zamansız stil, kusursuz bakım',
        aboutFallback:
            'Erkek bakımında saç kesimi, sakal ve klasik tıraş hizmetlerini hijyenik ortamda sunuyoruz. Online randevu ile size uygun saati seçin.',
        gallery: [
            img('photo-1585747860715-2ba37e788b70', 'Berber koltukları'),
            img('photo-1503951914875-452162b0f3f1', 'Berber salonu'),
            img('photo-1621605815971-fbc98d665033', 'Saç kesimi'),
            img('photo-1599351431202-1e0f0137899a', 'Sakal bakımı'),
        ],
        news: [
            {
                tag: 'Stil',
                title: 'Fade nasıl seçilir?',
                summary: 'Saç tipine göre soft veya sharp fade ile yüz hatlarınızı dengeleyin.',
            },
            {
                tag: 'Bakım',
                title: 'Tıraş sonrası rahatlık',
                summary: 'Alkolsüz aftershave tahrişi azaltır; cildiniz ferah kalır.',
            },
            {
                tag: 'Randevu',
                title: 'Beklemeden gelin',
                summary: 'Online randevu ile koltuk sizi bekler — yoğunluğa takılmazsınız.',
            },
        ],
    },
};

/** Slug’a özel ince ayar (yoksa grup paketi) */
const BY_SLUG: Partial<Record<string, Partial<SectorWebPack>>> = {
    hair: {
        tagline: 'Saç tasarımı ve bakım',
        gallery: [
            img('photo-1560066984-138dadb4c035', 'Kuaför salonu'),
            img('photo-1522337660859-02fbefca4702', 'Saç kesimi'),
            img('photo-1595476108010-b4d1f102b1b1', 'Fön'),
            img('photo-1634449573010-33df40a4151e', 'Renk'),
        ],
    },
    barber: {
        tagline: 'Zamansız stil, kusursuz bakım',
        aboutFallback:
            'Erkek kuaförümüzde saç kesimi, sakal tasarımı ve klasik ustura tıraşını steril ekipmanla sunuyoruz. Online randevu ile beklemeden gelin.',
        gallery: [
            img('photo-1585747860715-2ba37e788b70', 'Berber salonu'),
            img('photo-1503951914875-452162b0f3f1', 'Erkek kuaförü'),
            img('photo-1621605815971-fbc98d665033', 'Saç kesimi'),
            img('photo-1605497788044-5a32c7078486', 'Fade kesim'),
        ],
        news: [
            {
                tag: 'Stil',
                title: 'Fade seçimi',
                summary: 'Saç tipine göre soft veya sharp fade öneriyoruz.',
            },
            {
                tag: 'Sakal',
                title: 'Kontür farkı',
                summary: 'Düzenli sakal kontürü yüzü toparlar.',
            },
            {
                tag: 'Randevu',
                title: '2 dakikada yer ayırtın',
                summary: 'Online randevu ile size uygun saati seçin, gelin.',
            },
        ],
    },
    nails: {
        tagline: 'Tırnak tasarımı ve bakım',
        gallery: [
            img('photo-1604654894610-df63bc536371', 'Nail art'),
            img('photo-1519014816548-bf5fe059798b', 'Manikür'),
            img('photo-1632345031435-8727f6897d53', 'Pedikür'),
            img('photo-1607779097040-26e80aa78e09', 'Tırnak'),
        ],
    },
    dental: {
        tagline: 'Gülüşünüz için klinik bakım',
        gallery: [
            img('photo-1606811841689-23dfddce3e95', 'Diş kliniği'),
            img('photo-1588776814546-1ffcf47267a5', 'Tedavi'),
            img('photo-1629909613654-28e377c37b09', 'Muayene'),
            img('photo-1609840114035-3c981b782dfe', 'Diş sağlığı'),
        ],
    },
    pilates_yoga: {
        tagline: 'Nefes, denge ve güç',
        gallery: [
            img('photo-1544367567-0f2fcb009e0b', 'Yoga'),
            img('photo-1518611012118-696072aa579a', 'Pilates'),
            img('photo-1571019614242-c5c5dee9f50b', 'Stüdyo'),
            img('photo-1599901860904-17e6ede5256c', 'Mat'),
        ],
    },
};

export function sectorWebPack(slug?: string | null): SectorWebPack {
    const group = sectorLayoutGroup(slug);
    const base = BY_GROUP[group];
    const overlay = slug ? BY_SLUG[slug] : undefined;
    if (!overlay) return base;
    return {
        ...base,
        ...overlay,
        gallery: overlay.gallery || base.gallery,
        news: overlay.news || base.news,
    };
}
