// Türkiye'nin 81 il ve 957 ilçesi (TÜİK 2025 + Wikipedia cross-check).
// Kaynak: https://gist.github.com/sercanov/c63063e4b40c756d4040a0be694895e9
//
// Veri yapısı: { "İl Adı (proper)": ["İlçe 1", "İlçe 2", ...], ... }
//
// IL_ILCE_MAP: il → ilçe[] (orijinal veri)
// ILCE_TO_IL: ilçe → il (ters map, lookup için)
//
// Her anahtar Türkçe karakterli proper case. findIlInAddress'te kullanılırken
// normalize (i→ı, lowercase) ile aranır.

import { IL_ILCE_DATA } from './turkiye-il-ilce-data';

export const IL_ILCE_MAP: Record<string, string[]> = IL_ILCE_DATA;

export const ILCE_TO_IL: Record<string, string> = (() => {
    const m: Record<string, string> = {};
    for (const [il, ilceler] of Object.entries(IL_ILCE_MAP)) {
        for (const ilce of ilceler) {
            // Eğer aynı ilçe iki farklı ilde varsa, son eklenen kazanır (nadir, çakışma yok)
            m[ilce] = il;
        }
    }
    return m;
})();

/**
 * 81 il + 957 ilçe için normalize edilmiş (i→ı, lowercase) Map.
 * findIlInAddress'te hızlı lookup için kullanılır.
 */
export const ILCE_TO_IL_LOWER: Map<string, string> = (() => {
    const m = new Map<string, string>();
    const normalize = (s: string) => s.toLowerCase().split('i').join('ı');
    for (const [ilce, il] of Object.entries(ILCE_TO_IL)) {
        m.set(normalize(ilce), il);
    }
    return m;
})();
