import pool from '../config/database';

export interface LocalParsedResult {
    customerName: string | null;
    date: string | null; // YYYY-MM-DD
    time: string | null; // HH:MM
    serviceName: string | null;
    note: string | null;
    confidence: number;
}

export class LocalNLPEngine {
    private static days = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'];
    
    // Yardımcı: Metindeki saat ifadelerini bul (Örn: "saat 3", "15:00", "akşam 5", "3 buçuk")
    private static extractTime(text: string): string | null {
        const lowerText = text.toLowerCase();
        
        // Direk formatlı saatler (14:30, 09.00)
        const timeRegex = /([01]?\d|2[0-3])[:.]([0-5]\d)/;
        const timeMatch = lowerText.match(timeRegex);
        if (timeMatch) {
            return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
        }

        // Metinsel saatler (saat 3, 5 buçuk, akşam 18) - Regex sırası 2 hanelileri önce yakalamalı!
        const wordHourRegex = /(sabah|öğle|akşam|saat)?\s*(2[0-3]|1[0-9]|0?[1-9])\s*(buçuk|yarım)?/i;
        const wordMatch = lowerText.match(wordHourRegex);
        
        if (wordMatch) {
            const context = wordMatch[1] || '';
            let hour = parseInt(wordMatch[2]);
            const isHalf = wordMatch[3] !== undefined;
            
            // Eğer akşam diyorsa ve saat 1-11 arasıysa öğleden sonra yap (12 ekle)
            if ((context.includes('akşam') || context.includes('öğle')) && hour < 12) {
                hour += 12;
            } else if (hour < 8) {
                // Kuaför bağlamında saat 1, 2, 3, 4, 5 genelde öğleden sonradır (13, 14, 15)
                hour += 12;
            }

            const minute = isHalf ? '30' : '00';
            return `${String(hour).padStart(2, '0')}:${minute}`;
        }

        return null;
    }

    // Yardımcı: Metindeki tarih ifadelerini bul (bugün, yarın, cuma, haftaya)
    private static extractDate(text: string): string | null {
        const lowerText = text.toLowerCase();
        const now = new Date();
        let targetDate = new Date();

        if (lowerText.includes('yarın')) {
            targetDate.setDate(now.getDate() + 1);
        } else if (lowerText.includes('öbür gün') || lowerText.includes('ertesi gün')) {
            targetDate.setDate(now.getDate() + 2);
        } else if (lowerText.match(/(haftaya|önümüzdeki)/)) {
            // İlgili günü bul ve 7 gün sonrasına git
            let foundDay = false;
            for (let i = 0; i < this.days.length; i++) {
                if (lowerText.includes(this.days[i])) {
                    let currentDay = now.getDay();
                    let distance = i - currentDay;
                    if (distance <= 0) distance += 7;
                    targetDate.setDate(now.getDate() + distance + 7); // Haftaya dediği için +7 daha
                    foundDay = true;
                    break;
                }
            }
            if (!foundDay) targetDate.setDate(now.getDate() + 7);
        } else {
            // Sadece gün adı geçiyorsa (Cuma, Pazartesi)
            for (let i = 0; i < this.days.length; i++) {
                if (lowerText.includes(this.days[i])) {
                    let currentDay = now.getDay();
                    let distance = i - currentDay;
                    if (distance <= 0) distance += 7; // Geçmiş günse, haftaya o günü al
                    targetDate.setDate(now.getDate() + distance);
                    
                    const year = targetDate.getFullYear();
                    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
                    const day = String(targetDate.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            }
            if (lowerText.includes('bugün')) {
                // Bugün
            } else {
                return null; // Tarih bulunamadı
            }
        }

        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Yardımcı: Firma hizmetlerine göre eşleştirme yap (Levenshtein veya Regex benzeri)
    private static findService(text: string, companyServices: any[]): string | null {
        const lowerText = text.toLowerCase();
        
        // Çok bilindik genel kuaför/salon terimleri (Hizmet DB'de olmasa bile anla)
        const commonKeywords = ['kesim', 'boya', 'fön', 'röfle', 'ombre', 'sombre', 'manikür', 'pedikür', 'ağda', 'lazer', 'bakım', 'sakal', 'tıraş'];
        
        // 1. Şirketin kendi özel hizmet isimlerinde ara
        for (const srv of companyServices) {
            if (!srv?.name) continue;
            const nm = srv.name.toLowerCase();
            const words = nm.split(' ');
            
            // Eğer hizmet adındaki belirgin bir kelime cümlede geçiyorsa (Örn: "Keratin")
            for (const w of words) {
                if (w.length > 3 && lowerText.includes(w)) {
                    return srv.name;
                }
            }
        }

        // 2. Şirketin listesinde yoksa genel terimlerden yakalamaya çalış
        for (const kw of commonKeywords) {
            if (lowerText.includes(kw)) {
                return kw;
            }
        }

        return null;
    }

    // Yardımcı: Kişi ismi çıkarma (Çok zor bir NLP problemi, basit heuristikler kullanacağız)
    private static extractName(text: string): string | null {
        // "ben ahmet", "ismim ayşe", "adım mehmet"
        const nameRegex = /(?:ben|ismim|adım|benim adım|isim)\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]+)/i;
        const match = text.match(nameRegex);
        if (match && match[1]) {
            const name = match[1];
            // Eğer yakalanan kelime yasaklı değilse
            const blacklist = ['randevu', 'almak', 'istiyorum', 'yarın', 'bugün', 'saat'];
            if (!blacklist.includes(name.toLowerCase())) {
                return name.charAt(0).toUpperCase() + name.substring(1).toLowerCase();
            }
        }
        return null;
    }

    /**
     * Ana Fonksiyon: GPT-4 yerine kendi sunucumuzda tamamen ücretsiz çalışan Doğal Dil Anlama (NLP) motoru
     */
    public static async processText(companyId: number, transcript: string): Promise<LocalParsedResult> {
        let services = [];
        try {
            const srvRes = await pool.query('SELECT id, name, price, duration_minutes FROM services WHERE company_id = $1', [companyId]);
            services = srvRes.rows;
        } catch (e) {
            console.warn('[LocalNLP] Hizmetler çekilemedi', e);
        }

        // 1. Saat Çıkar
        let extTime = this.extractTime(transcript);
        
        // 2. Tarih Çıkar (Eğer yoksa varsayılan olarak Bugün'ü baz alma stratejisi)
        let extDate = this.extractDate(transcript);
        
        // Tarih yoksa ama saat varsa, saatin geçip geçmediğine göre "bugün" veya "yarın" karar ver
        if (!extDate && extTime) {
            const now = new Date();
            const [h, m] = extTime.split(':').map(Number);
            const currentH = now.getHours();
            const currentM = now.getMinutes();
            
            if (h < currentH || (h === currentH && m <= currentM)) {
                // Söylenen saat çoktan geçmiş, o zaman "yarın" kastetmiş olmalı
                now.setDate(now.getDate() + 1);
            }
            const y = now.getFullYear();
            const mo = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            extDate = `${y}-${mo}-${d}`;
        } else if (!extDate) {
            // Hiç tarih ipucu yok, varsayılan BUGÜN.
            const now = new Date();
            const y = now.getFullYear();
            const mo = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            extDate = `${y}-${mo}-${d}`;
        }

        // 3. Hizmet Çıkar
        const extService = this.findService(transcript, services);

        // 4. İsim Çıkar
        const extName = this.extractName(transcript);

        // Güven Skoru Hesaplama (Veri ne kadar doluysa o kadar güvenilir)
        let confidence = 0;
        if (extTime) confidence += 40;
        if (extDate) confidence += 30;
        if (extService) confidence += 30;

        return {
            customerName: extName,
            date: extDate,
            time: extTime,
            serviceName: extService,
            note: "Yerel NLP (Ücretsiz Kendi Motorumuz) ile Anlaşıldı.",
            confidence: confidence
        };
    }
}
