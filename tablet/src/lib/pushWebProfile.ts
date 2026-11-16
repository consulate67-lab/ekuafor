import type { TabletState, WebPageProfile } from '../types';

const DEFAULT_API = 'https://web-production-db847.up.railway.app/api';

/** Web sayfası alanlarını merkez firmaya yazar */
export async function pushWebProfile(state: TabletState): Promise<{ ok: boolean; message: string }> {
  const company = state.company;
  if (!company?.serverCompanyId) {
    return { ok: false, message: 'Önce firma kaydını tamamlayın (QR ekranı).' };
  }
  const key = String(company.activationKey || '')
    .trim()
    .toUpperCase();
  if (!key) return { ok: false, message: 'Kurulum anahtarı yok' };
  if (!navigator.onLine) return { ok: false, message: 'İnternet gerekli' };

  const web: WebPageProfile = company.webPage || {};
  const base = (import.meta.env.VITE_API_URL || DEFAULT_API).replace(/\/$/, '');

  try {
    const res = await fetch(`${base}/tablet/company/profile`, {
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
        profile: {
          web_template_id: web.templateId || null,
          description: (web.about || '').trim(),
          phone: web.phone || null,
          email: web.email || null,
          website: web.website || null,
          address_line: web.address || null,
          city: web.city || null,
          district: web.district || null,
          contact_note: web.contactNote || null,
          hide_prices: web.hidePrices === true,
          instagram_url: web.instagram || null,
          facebook_url: web.facebook || null,
          tiktok_url: web.tiktok || null,
          show_phone: web.showPhone !== false,
          show_address: web.showAddress !== false,
          sector_slugs:
            company.sectorSlugs?.length
              ? company.sectorSlugs
              : company.sectorSlug
                ? [company.sectorSlug]
                : [],
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { ok: false, message: data?.error || `Kayıt başarısız (${res.status})` };
    }
    const hidden = data?.data?.hide_prices === true;
    return {
      ok: true,
      message: hidden
        ? 'Web kaydedildi · fiyatlar gizli'
        : data?.message || 'Web sayfası güncellendi',
    };
  } catch {
    return { ok: false, message: 'Sunucuya bağlanılamadı' };
  }
}
