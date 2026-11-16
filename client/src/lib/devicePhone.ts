import { Capacitor } from '@capacitor/core';

/** Uluslararası / yerel numarayı TR 05XXXXXXXXX biçimine çevirir. */
export function normalizeTrMobile(raw: string): string {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length >= 12 && digits.startsWith('90')) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('5')) digits = `0${digits}`;
  if (digits.length > 11) digits = digits.slice(-11);
  return digits.slice(0, 11);
}

/**
 * Android: Google Phone Number Hint — SIM’deki numarayı sistem listesinden seçtirir.
 * iOS/web: cihaz ayarından okumak yasak/mümkün değil; null döner (autocomplete kullanılır).
 */
export async function requestDevicePhoneNumber(): Promise<string | null> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return null;
  }
  try {
    const { AndroidSmsRetriever } = await import('@capgo/capacitor-android-sms-retriever');
    const result = await AndroidSmsRetriever.getPhoneNumber();
    const phone = normalizeTrMobile(
      (result as { phoneNumber?: string; phone?: string }).phoneNumber ||
        (result as { phone?: string }).phone ||
        '',
    );
    return phone.length >= 10 ? phone : null;
  } catch {
    return null;
  }
}

export function canRequestDevicePhone(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}
