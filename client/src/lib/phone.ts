/** `tel:` bağlantısı için Türkiye numarası: 905xx / 5xx / 05xx biçimlerini 05xx… yapar. */
export const dialNumber = (phone?: string | null) => {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('90')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return digits.length === 10 ? `0${digits}` : digits;
};
