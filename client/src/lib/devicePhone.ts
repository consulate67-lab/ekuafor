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

/** Karşılaştırma anahtarı: 5XXXXXXXXX (10 hane). */
export function phoneCompareKey(raw: string): string {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('90') && digits.length >= 12) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function phonesMatch(a: string, b: string): boolean {
  const ka = phoneCompareKey(a);
  const kb = phoneCompareKey(b);
  return ka.length >= 10 && kb.length >= 10 && ka === kb;
}

function preferMobile(numbers: Array<string | null | undefined>): string | null {
  const normalized = numbers.map(n => normalizeTrMobile(n || '')).filter(n => n.length >= 10);
  if (!normalized.length) return null;
  const mobile = normalized.find(n => n.startsWith('05'));
  return mobile || normalized[0];
}

/** Android SIM hint veya iOS/Android rehber seçici kullanılabilir mi? */
export function canRequestDevicePhone(): boolean {
  return Capacitor.isNativePlatform();
}

export function phonePickButtonLabel(): string {
  if (!Capacitor.isNativePlatform()) return 'Numara seç';
  return Capacitor.getPlatform() === 'android' ? 'SIM’den seç' : 'Rehberden seç';
}

export function phonePickHelpText(): string {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    return 'Android’de SIM numaranızı seçebilirsiniz; ardından SMS kodu ile doğrularız.';
  }
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
    return 'iPhone’da rehberinizden (Ben kartı) numaranızı seçin; ardından SMS kodu ile doğrularız. Klavye üstündeki öneriyi de kullanabilirsiniz.';
  }
  return 'Numaranızı SMS kodu ile doğruluyoruz. Klavye üstündeki kayıtlı numarayı kullanabilirsiniz.';
}

async function requestAndroidSimPhone(): Promise<string | null> {
  try {
    const { AndroidSmsRetriever } = await import('@capgo/capacitor-android-sms-retriever');
    const result = await AndroidSmsRetriever.getPhoneNumber();
    return preferMobile([result.phoneNumber]);
  } catch {
    return null;
  }
}

/** iOS (ve Android yedek): sistem rehber seçicisi — kullanıcı kendi kartını seçer. */
async function requestPhoneFromContacts(): Promise<string | null> {
  try {
    const { Contacts } = await import('@capacitor-community/contacts');
    const perm = await Contacts.requestPermissions();
    if (perm.contacts !== 'granted' && perm.contacts !== 'limited') return null;
    const { contact } = await Contacts.pickContact({
      projection: { phones: true, name: true },
    });
    const phones = (contact.phones || []).map(p => p.number);
    return preferMobile(phones);
  } catch {
    return null;
  }
}

/**
 * Android: önce Phone Number Hint (SIM).
 * iOS: rehberden seç (Ben kartı önerilir).
 * Web: destek yok → null (autocomplete kullanılır).
 */
export async function requestDevicePhoneNumber(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;

  if (Capacitor.getPlatform() === 'android') {
    const fromSim = await requestAndroidSimPhone();
    if (fromSim) return fromSim;
  }

  return requestPhoneFromContacts();
}
