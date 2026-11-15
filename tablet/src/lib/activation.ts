const DEFAULT_API = 'https://web-production-db847.up.railway.app/api';

export async function activateTabletKey(input: {
  key: string;
  deviceId: string;
  apiBase?: string;
}): Promise<{ ok: boolean; message: string; key?: string }> {
  const base = (input.apiBase || import.meta.env.VITE_API_URL || DEFAULT_API).replace(/\/$/, '');
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
    return {
      ok: true,
      message: data?.message || 'Anahtar onaylandı',
      key: data?.data?.key || input.key.trim().toUpperCase(),
    };
  } catch {
    return { ok: false, message: 'Sunucuya bağlanılamadı. İnterneti kontrol edin.' };
  }
}
