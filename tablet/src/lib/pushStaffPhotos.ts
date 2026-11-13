import type { TabletState } from '../types';

const DEFAULT_API = 'https://web-production-db847.up.railway.app/api';

/** Tabletteki çalışan fotoğraflarını merkez firmaya yazar */
export async function pushStaffPhotos(state: TabletState): Promise<{ ok: boolean; message: string }> {
  const company = state.company;
  if (!company?.serverCompanyId) {
    return { ok: false, message: 'Önce firma kaydını tamamlayın (QR ekranı).' };
  }
  const key = String(company.activationKey || '')
    .trim()
    .toUpperCase();
  if (!key) return { ok: false, message: 'Kurulum anahtarı yok' };
  if (!navigator.onLine) return { ok: false, message: 'İnternet gerekli' };

  const staff = state.staff
    .filter(s => s.photo)
    .map(s => ({
      firstName: s.firstName,
      lastName: s.lastName,
      photo: s.photo,
    }));
  if (!staff.length) return { ok: false, message: 'Tablette kayıtlı çalışan fotoğrafı yok' };

  const base = (import.meta.env.VITE_API_URL || DEFAULT_API).replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/tablet/company/staff-photos`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': state.deviceId,
        'X-Activation-Key': key,
      },
      body: JSON.stringify({
        deviceId: state.deviceId,
        activationKey: key,
        companyId: company.serverCompanyId,
        staff,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { ok: false, message: data?.error || `Kayıt başarısız (${res.status})` };
    }
    return { ok: true, message: data?.message || 'Fotoğraflar güncellendi' };
  } catch {
    return { ok: false, message: 'Sunucuya bağlanılamadı' };
  }
}
