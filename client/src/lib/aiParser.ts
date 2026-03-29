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

const TURKISH_MONTHS: Record<string, number> = {
    'ocak': 1, 'subat': 2, 'şubat': 2, 'mart': 3, 'nisan': 4,
    'mayis': 5, 'mayıs': 5, 'haziran': 6, 'temmuz': 7,
    'agustos': 8, 'ağustos': 8, 'eylul': 9, 'eylül': 9,
    'ekim': 10, 'kasim': 11, 'kasım': 11, 'aralik': 12, 'aralık': 12
};

function getLocalToday(): string {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
}

function addDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
}

function getNextWeekday(targetDay: number): string {
    const now = new Date();
    const today = now.getDay(); // 0=Sun
    let diff = (targetDay - today + 7) % 7;
    if (diff === 0) diff = 7; // always next week if today
    return addDays(diff);
}

export function parseDate(normalizedText: string, originalText: string): string {
    const today = getLocalToday();
    const n = normalizeTurkish(normalizedText);

    // "bugün"
    if (n.includes('bugun')) return today;

    // "yarın"
    if (n.includes('yarin')) return addDays(1);

    // "öbür gün" / "öbürgün"
    if (n.includes('obur gun') || n.includes('oburgün') || n.includes('obur gun')) return addDays(2);

    // Weekdays
    if (n.includes('pazartesi')) return getNextWeekday(1);
    if (n.includes('sali')) return getNextWeekday(2);
    if (n.includes('carsamba')) return getNextWeekday(3);
    if (n.includes('persembe')) return getNextWeekday(4);
    if (n.includes('cuma')) return getNextWeekday(5);
    if (n.includes('cumartesi')) return getNextWeekday(6);
    if (n.includes('pazar')) return getNextWeekday(0);

    // "3 Nisan", "on beş mart" etc.
    const monthMatch = n.match(/(\d{1,2})\s+([a-z]+)/);
    if (monthMatch) {
        const day = parseInt(monthMatch[1]);
        const monthName = monthMatch[2];
        const monthNum = TURKISH_MONTHS[monthName];
        if (monthNum && day >= 1 && day <= 31) {
            const now = new Date();
            let year = now.getFullYear();
            const candidate = new Date(year, monthNum - 1, day);
            if (candidate < now) year++;
            const finalDate = new Date(year, monthNum - 1, day);
            return `${finalDate.getFullYear()}-${String(finalDate.getMonth() + 1).padStart(2, '0')}-${String(finalDate.getDate()).padStart(2, '0')}`;
        }
    }

    // ISO date directly in text
    const isoMatch = originalText.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return isoMatch[0];

    return today;
}

export function parseTime(normalizedText: string): { h: number; m: number } {
    const n = normalizeTurkish(normalizedText);
    const now = new Date();

    const isEvening = n.includes('aksam') || n.includes('gece');
    const isAfternoon = n.includes('ogleden sonra') || n.includes('ogle');
    const isMorning = n.includes('sabah') || n.includes('ogle den once');

    // Helper to adjust hour
    const adjustHour = (h: number): number => {
        if (h >= 12) return h; // already 24h
        if (isEvening) return h + 12;  // "akşam 5" → 17
        if (isAfternoon && h < 12) return h + 12; // "öğleden sonra 3" → 15
        if (isMorning) return h; // morning stays as-is
        // No modifier: if hour < 8, assume afternoon/evening
        if (h < 8) return h + 12;
        return h;
    };

    // Try patterns from most specific to least specific

    // "saat 14:30", "saat 14.30"
    const fullTimeMatch = n.match(/saat\s*(\d{1,2})[\s:.](\d{2})/);
    if (fullTimeMatch) {
        const h = adjustHour(parseInt(fullTimeMatch[1]));
        const m = parseInt(fullTimeMatch[2]);
        return { h: Math.min(h, 23), m: Math.min(m, 59) };
    }

    // "saat 14"
    const singleHourMatch = n.match(/saat\s*(\d{1,2})/);
    if (singleHourMatch) {
        const h = adjustHour(parseInt(singleHourMatch[1]));
        return { h: Math.min(h, 23), m: 0 };
    }

    // "14:30" or "14.30" standalone
    const rawFullMatch = n.match(/\b(\d{1,2})[:.](\d{2})\b/);
    if (rawFullMatch) {
        const h = adjustHour(parseInt(rawFullMatch[1]));
        const m = parseInt(rawFullMatch[2]);
        return { h: Math.min(h, 23), m: Math.min(m, 59) };
    }

    // "akşam 5", "akşam 6", "öğleden sonra 3"
    const modifierHourMatch = n.match(/(?:aksam|gece|ogleden sonra|ogle sonrasi|ogle)\s*(\d{1,2})/);
    if (modifierHourMatch) {
        const h = adjustHour(parseInt(modifierHourMatch[1]));
        return { h: Math.min(h, 23), m: 0 };
    }

    // "X gibi", "X sularında", "Xde", "Xda"
    const vagueMatch = n.match(/\b(\d{1,2})\s*(?:gibi|sularinda|sularında|de\b|da\b|'de|'da)/);
    if (vagueMatch) {
        const h = adjustHour(parseInt(vagueMatch[1]));
        return { h: Math.min(h, 23), m: 0 };
    }

    // Last-resort: any standalone number that could be an hour
    const looseMatch = n.match(/\b([5-9]|1[0-9]|2[0-3])\b/);
    if (looseMatch) {
        const h = adjustHour(parseInt(looseMatch[1]));
        return { h: Math.min(h, 23), m: 0 };
    }

    // Default: next 15-min slot from now
    const curM = now.getMinutes();
    let rH = now.getHours();
    let rM = 0;
    if (curM < 15) rM = 15;
    else if (curM < 30) rM = 30;
    else if (curM < 45) rM = 45;
    else { rH++; rM = 0; }
    return { h: Math.min(rH, 23), m: rM };
}

function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
            else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

function fuzzyMatchService(services: any[], normalizedText: string): any | null {
    if (!services.length) return null;

    // Exact substring match first
    for (const s of services) {
        const sn = normalizeTurkish(s.name);
        if (normalizedText.includes(sn) || sn.includes(normalizedText.split(' ')[0])) return s;
    }

    // Keyword aliases
    const keywords: Record<string, string[]> = {
        'kesim': ['kesim', 'tiras', 'tirasi', 'makina', 'ustura', 'sac kesiyor', 'sac kesti', 'kestir'],
        'boya': ['boya', 'boyatmak', 'dip boyasi', 'renk', 'balyaj', 'ombre', 'isilti', 'boyama'],
        'bakim': ['bakim', 'maske', 'keratin', 'protein', 'botoks', 'saglik'],
        'manikur': ['manikur', 'manikür', 'el bakimi', 'oje', 'kalici', 'jel tirnak'],
        'pedikur': ['pedikur', 'pedikür', 'ayak bakimi', 'topuk'],
        'agda': ['agda', 'agdalama', 'sir', 'epilasyon', 'lazer'],
        'kas': ['kas', 'biyik', 'alim', 'kaş alma', 'kasa'],
        'fon': ['fon', 'fonlamak', 'masa', 'masa fon', 'fule', 'bigudi'],
        'cilt': ['cilt', 'cilt bakimi', 'yuz', 'yuz bakimi', 'peeling'],
    };

    for (const [key, aliases] of Object.entries(keywords)) {
        if (aliases.some(a => normalizedText.includes(a))) {
            const found = services.find(s => normalizeTurkish(s.name).includes(key));
            if (found) return found;
        }
    }

    // Levenshtein fuzzy on each word token vs service names
    const tokens = normalizedText.split(/\s+/);
    let bestService: any = null;
    let bestScore = Infinity;
    for (const s of services) {
        const sn = normalizeTurkish(s.name);
        for (const token of tokens) {
            if (token.length < 3) continue;
            const dist = levenshtein(token, sn);
            const threshold = Math.max(2, Math.floor(sn.length * 0.35));
            if (dist < threshold && dist < bestScore) {
                bestScore = dist;
                bestService = s;
            }
        }
    }
    if (bestService) return bestService;

    return null;
}

export const parseVoiceCommand = (
    transcript: string,
    services: any[],
    _rules: string = ''
): ParsedInfo => {
    const originalTranscript = transcript.toLowerCase().trim();
    const normalizedTranscript = normalizeTurkish(originalTranscript);

    // Date
    const date = parseDate(normalizedTranscript, originalTranscript);

    // Time
    const { h, m } = parseTime(normalizedTranscript);
    const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    // Service
    let matchedService = fuzzyMatchService(services, normalizedTranscript);
    if (!matchedService && services.length > 0) matchedService = null; // don't default silently

    // End time
    const duration = matchedService?.duration_minutes || 30;
    const totalEndMin = h * 60 + m + duration;
    const endH = Math.floor(totalEndMin / 60) % 24;
    const endM = totalEndMin % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // Name extraction
    let name = 'Misafir';
    const nameKeywords = ['icin', 'için', 'adına', 'adina', 'ismini', 'musteri', 'müşteri'];
    for (const kw of nameKeywords) {
        const idx = normalizedTranscript.indexOf(kw);
        if (idx !== -1) {
            const rest = normalizedTranscript.slice(idx + kw.length).trim();
            const potentialName = rest.split(/\s+/)[0];
            if (potentialName && potentialName.length > 1 && !/^(bir|ve|ile|da|de|ka|ko|sa|sa|bu|su|o|ne)$/.test(potentialName)) {
                name = potentialName.charAt(0).toUpperCase() + potentialName.slice(1);
                break;
            }
        }
    }

    return {
        date,
        startTime,
        endTime,
        serviceId: matchedService?.id ?? null,
        customerName: name,
        notes: `Sesli Komut: ${originalTranscript}`,
        price: matchedService?.price || 0
    };
};
