/**
 * Telefon numarasını normalize eder.
 * Örn: +90 (555) 444 33 22 -> 5554443322 (10 hane)
 * Örn: 05554443322 -> 5554443322 (10 hane)
 * Örn: 905554443322 -> 5554443322 (10 hane)
 */
export const normalizePhone = (phone: string | null | undefined): string => {
    if (!phone) return '';

    // Sadece rakamları al
    let cleaned = phone.replace(/\D/g, '');

    // Baştaki 90 veya 0'ı temizle (Türkiye formatı)
    if (cleaned.startsWith('90') && cleaned.length > 10) {
        cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
        cleaned = cleaned.substring(1);
    }

    // Eğer hala 10 haneden uzunsa ve 90 ile başlıyorsa temizle (Esneklik için tekrar)
    if (cleaned.length > 10 && cleaned.startsWith('90')) {
        cleaned = cleaned.substring(2);
    }

    // Sadece son 10 haneyi al (Güvenli liman)
    if (cleaned.length > 10) {
        cleaned = cleaned.slice(-10);
    }

    return cleaned;
};

/**
 * Netgsm vb. için 12 haneli (90...) formatı
 */
export const formatPhoneTo12Digits = (phone: string | null | undefined): string => {
    const normalized = normalizePhone(phone);
    if (!normalized) return '';
    return '90' + normalized;
};
