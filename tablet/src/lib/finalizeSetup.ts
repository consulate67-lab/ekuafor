import type { TabletState } from '../types';

const DEFAULT_API = 'https://web-production-db847.up.railway.app/api';

/** Kurulum bitince firmayı merkez sisteme kaydet */
export async function finalizeCompanyOnServer(state: TabletState): Promise<{
  ok: boolean;
  message: string;
  companyId?: number;
}> {
  const base = (import.meta.env.VITE_API_URL || DEFAULT_API).replace(/\/$/, '');
  if (!state.company) return { ok: false, message: 'Firma yok' };
  if (!navigator.onLine) {
    return { ok: false, message: 'Firma kaydı için internet yok; sonra Rapor’dan senkron deneyin.' };
  }
  const activationKey = String(state.company.activationKey || '')
    .trim()
    .toUpperCase();
  if (!activationKey) {
    return {
      ok: false,
      message: 'Kurulum anahtarı yok. QR ekranından Telegram anahtarını girip bağlayın.',
    };
  }

  try {
    const res = await fetch(`${base}/tablet/setup/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': state.deviceId,
      },
      body: JSON.stringify({
        deviceId: state.deviceId,
        activationKey,
        company: {
          name: state.company.name,
          workStart: state.company.workStart,
          workEnd: state.company.workEnd,
          slotInterval: state.company.slotInterval,
          location: state.company.location,
          sectorSlugs: state.company.sectorSlugs || (state.company.sectorSlug ? [state.company.sectorSlug] : []),
          webPage: state.company.webPage || null,
          web_template_id: state.company.webPage?.templateId || null,
          description: state.company.webPage?.about || null,
          phone: state.company.webPage?.phone || null,
          email: state.company.webPage?.email || null,
          website: state.company.webPage?.website || null,
          address_line: state.company.webPage?.address || null,
          city: state.company.webPage?.city || null,
          district: state.company.webPage?.district || null,
        },
        departments: state.departments,
        staff: state.staff.map(s => ({
          localId: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          phone: s.phone,
          title: s.title,
          photo: s.photo || null,
          workStart: s.workStart,
          workEnd: s.workEnd,
          serviceLocalIds: s.serviceIds || [],
        })),
        services: state.services.map(s => ({
          localId: s.id,
          name: s.name,
          durationMinutes: s.durationMinutes,
          price: s.price,
          fromSectorSlug: s.fromSectorSlug,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { ok: false, message: data?.error || `Kayıt başarısız (${res.status})` };
    }
    return {
      ok: true,
      message: data?.message || 'Firma sisteme kaydedildi',
      companyId: data?.data?.company_id,
    };
  } catch {
    return { ok: false, message: 'Sunucuya bağlanılamadı' };
  }
}
