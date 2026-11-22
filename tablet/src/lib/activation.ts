import { apiBase } from './apiBase';

export async function activateTabletKey(input: {
  key: string;
  deviceId: string;
  apiBase?: string;
}): Promise<{
  ok: boolean;
  message: string;
  key?: string;
  companyId?: number;
  shared?: boolean;
}> {
  const base = (input.apiBase || apiBase()).replace(/\/$/, '');
  if (!navigator.onLine) {
    return { ok: false, message: 'Kurulum anahtarı için internet gerekli.' };
  }
  try {
    const res = await fetch(`${base}/tablet/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': input.deviceId,
      },
      body: JSON.stringify({ key: input.key.trim().toUpperCase(), deviceId: input.deviceId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return {
        ok: false,
        message: data?.error || `Anahtar doğrulanamadı (${res.status})`,
      };
    }
    const companyId = Number(data?.data?.company_id);
    return {
      ok: true,
      message: data?.message || 'Anahtar onaylandı',
      key: data?.data?.key || input.key.trim().toUpperCase(),
      companyId: Number.isFinite(companyId) && companyId > 0 ? companyId : undefined,
      shared: !!data?.data?.shared,
    };
  } catch {
    return { ok: false, message: 'Sunucuya bağlanılamadı. İnterneti kontrol edin.' };
  }
}
