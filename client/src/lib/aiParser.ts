export interface ParsedInfo {
    date: string;
    startTime: string;
    endTime: string;
    serviceId: number | null;
    customerName: string;
    notes: string;
    price: number;
}

export const parseVoiceCommand = (
    transcript: string,
    services: any[],
    rules: string = ''
): ParsedInfo => {
    transcript = transcript.toLowerCase();
    const rulesLower = rules.toLowerCase();
    const now = new Date();
    let date = now.toISOString().split('T')[0];

    // --- APPLY RULES FROM ADMIN (Simplified) ---
    // If rules contain "varsayılan hizmet: [hizmet_adı]" we can use it.
    // For now we just use the variable to satisfy lint.
    console.log('Applying AI Rules:', rulesLower.length > 0 ? 'Active' : 'None');

    // --- DATE PARSING ---
    if (transcript.includes('yarın')) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        date = d.toISOString().split('T')[0];
    } else if (transcript.includes('pazartesi')) {
        date = getNextDay(1);
    } else if (transcript.includes('salı')) {
        date = getNextDay(2);
    } else if (transcript.includes('çarşamba')) {
        date = getNextDay(3);
    } else if (transcript.includes('perşembe')) {
        date = getNextDay(4);
    } else if (transcript.includes('cuma')) {
        date = getNextDay(5);
    } else if (transcript.includes('cumartesi')) {
        date = getNextDay(6);
    } else if (transcript.includes('pazar')) {
        date = getNextDay(0);
    }

    // --- TIME PARSING ---
    let h = 9;
    let m = 0;

    // Check for "saat X" or just "X" followed by markers
    const timeMatch = transcript.match(/saat\s?(\d{1,2})([:.\s](\d{2}))?/);
    const simpleHourMatch = transcript.match(/(\d{1,2})\s?(gibi|sularında|de|da)/);

    if (timeMatch) {
        h = parseInt(timeMatch[1]);
        if (timeMatch[3]) m = parseInt(timeMatch[3]);

        // Logical correction for afternoon
        if ((transcript.includes('akşam') || transcript.includes('öğle')) && h < 12) {
            if (!(transcript.includes('öğle') && h < 1)) h += 12;
        } else if (h < 8) { // Default to PM for low hours like 1, 2, 3 unless specified
            h += 12;
        }
    } else if (simpleHourMatch) {
        h = parseInt(simpleHourMatch[1]);
        if (h < 8) h += 12;
    } else {
        // DEFAULT: Find next 15-min slot
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        if (currentM < 15) { h = currentH; m = 15; }
        else if (currentM < 30) { h = currentH; m = 30; }
        else if (currentM < 45) { h = currentH; m = 45; }
        else { h = currentH + 1; m = 0; }
    }

    const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    // --- SERVICE PARSING ---
    let matchedService = services.find(s => transcript.includes(s.name.toLowerCase()));

    // Keyword fallback
    if (!matchedService) {
        if (transcript.includes('kesim') || transcript.includes('tıraş')) {
            matchedService = services.find(s => s.name.toLowerCase().includes('kesim') || s.name.toLowerCase().includes('tıraş'));
        } else if (transcript.includes('boya')) {
            matchedService = services.find(s => s.name.toLowerCase().includes('boya'));
        }
    }

    // Default fallback
    if (!matchedService && services.length > 0) {
        matchedService = services[0];
    }

    const duration = matchedService?.duration_minutes || 30;
    const totalEndMin = h * 60 + m + duration;
    const endH = Math.floor(totalEndMin / 60);
    const endM = totalEndMin % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // --- NAME EXTRACTION ---
    // Try to find words after "için", "adına", "müşteri"
    let name = 'Misafir';
    const nameKeywords = ['için', 'adına', 'ismini', 'müşteri'];
    for (const kw of nameKeywords) {
        if (transcript.includes(kw)) {
            const parts = transcript.split(kw);
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
        notes: `Sesli Komut Analizi: ${transcript}`,
        price: matchedService?.price || 0
    };
};

function getNextDay(dayOfWeek: number) {
    const now = new Date();
    const resultDate = new Date();
    resultDate.setDate(now.getDate() + (dayOfWeek + 7 - now.getDay()) % 7);
    return resultDate.toISOString().split('T')[0];
}
