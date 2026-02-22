export interface ParsedInfo {
    date: string;
    startTime: string;
    endTime: string;
    serviceId: number | null;
    customerName: string;
    notes: string;
    price: number;
}

const normalizeTurkish = (str: string) => {
    return str.toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
};

export const parseVoiceCommand = (
    transcript: string,
    services: any[],
    rules: string = ''
): ParsedInfo => {
    const originalTranscript = transcript.toLowerCase();
    const normalizedTranscript = normalizeTurkish(originalTranscript);
    const rulesLower = rules.toLowerCase();

    // Use local time for 'today' instead of UTC
    const now = new Date();
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    let date = localDate;

    console.log('AI Rules Active:', rulesLower.length > 0);

    // --- DATE PARSING ---
    if (normalizedTranscript.includes('yarin')) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        date = d.toISOString().split('T')[0];
    } else if (normalizedTranscript.includes('bugun')) {
        date = localDate;
    } else if (normalizedTranscript.includes('pazartesi')) {
        date = getNextDay(1);
    } else if (normalizedTranscript.includes('sali')) {
        date = getNextDay(2);
    } else if (normalizedTranscript.includes('carsamba') || normalizedTranscript.includes('carşamba')) {
        date = getNextDay(3);
    } else if (normalizedTranscript.includes('persembe') || normalizedTranscript.includes('perşembe')) {
        date = getNextDay(4);
    } else if (normalizedTranscript.includes('cuma')) {
        date = getNextDay(5);
    } else if (normalizedTranscript.includes('cumartesi')) {
        date = getNextDay(6);
    } else if (normalizedTranscript.includes('pazar')) {
        date = getNextDay(0);
    }

    // --- TIME PARSING ---
    let h = 9;
    let m = 0;

    const timeMatch = originalTranscript.match(/saat\s?(\d{1,2})([:.\s](\d{2}))?/);
    const simpleHourMatch = normalizedTranscript.match(/(\d{1,2})\s?(gibi|sularinda|de|da)/);

    if (timeMatch) {
        h = parseInt(timeMatch[1]);
        if (timeMatch[3]) m = parseInt(timeMatch[3]);

        if ((normalizedTranscript.includes('aksam') || normalizedTranscript.includes('ogle')) && h < 12) {
            if (!(normalizedTranscript.includes('ogle') && h < 1)) h += 12;
        } else if (h < 8) {
            h += 12;
        }
    } else if (simpleHourMatch) {
        h = parseInt(simpleHourMatch[1]);
        if (h < 8) h += 12;
    } else {
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        if (currentM < 15) { h = currentH; m = 15; }
        else if (currentM < 30) { h = currentH; m = 30; }
        else if (currentM < 45) { h = currentH; m = 45; }
        else { h = currentH + 1; m = 0; }
    }

    if (h >= 24) h = 0;

    const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    // --- SERVICE PARSING ---
    let matchedService = services.find(s =>
        normalizedTranscript.includes(normalizeTurkish(s.name)) ||
        originalTranscript.includes(s.name.toLowerCase())
    );

    if (!matchedService) {
        const keywords: Record<string, string[]> = {
            'kesim': ['kesim', 'tiras', 'tıraş', 'makina', 'ustura', 'sac'],
            'boya': ['boya', 'dip', 'renk', 'balyaj', 'ombre', 'isilti'],
            'bakim': ['bakim', 'maske', 'keratin', 'protein', 'botoks'],
            'manikur': ['manikur', 'manikür', 'el', 'oje', 'kalici'],
            'pedikur': ['pedikur', 'pedikür', 'ayak', 'topuk'],
            'agda': ['agda', 'ağda', 'sir', 'epilasyon', 'lazer'],
            'kas': ['kaş', 'biyik', 'bıyık', 'alm'],
            'fon': ['fon', 'fön', 'fule', 'masa', 'maşa']
        };

        for (const [key, aliases] of Object.entries(keywords)) {
            if (aliases.some(a => normalizedTranscript.includes(a) || originalTranscript.includes(a))) {
                matchedService = services.find(s =>
                    normalizeTurkish(s.name).includes(key) ||
                    s.name.toLowerCase().includes(key)
                );
                if (matchedService) break;
            }
        }
    }

    if (!matchedService && services.length > 0) {
        matchedService = services[0];
    }

    const duration = matchedService?.duration_minutes || 30;
    const totalEndMin = h * 60 + m + duration;
    const endH = Math.floor(totalEndMin / 60) % 24;
    const endM = totalEndMin % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // --- NAME EXTRACTION ---
    let name = 'Misafir';
    const nameKeywords = ['icin', 'adina', 'ismini', 'musteri'];
    for (const kw of nameKeywords) {
        if (normalizedTranscript.includes(kw)) {
            const parts = normalizedTranscript.split(kw);
            if (parts.length > 1) {
                const potentialName = parts[1].trim().split(' ')[0];
                if (potentialName && potentialName.length > 2) {
                    name = potentialName.charAt(0).toUpperCase() + potentialName.slice(1);
                    break;
                }
            }
        }
    }

    return {
        date,
        startTime,
        endTime,
        serviceId: matchedService?.id || null,
        customerName: name,
        notes: `Sesli Komut: ${originalTranscript}`,
        price: matchedService?.price || 0
    };
};

function getNextDay(dayOfWeek: number) {
    const now = new Date();
    const resultDate = new Date();
    const diff = (dayOfWeek + 7 - now.getDay()) % 7;
    resultDate.setDate(now.getDate() + diff);
    return resultDate.toISOString().split('T')[0];
}
