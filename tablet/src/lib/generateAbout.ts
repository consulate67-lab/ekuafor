import { getWebTemplate } from '@shared/webPageTemplates';
import type { CompanySetup } from '../types';

import { apiBase } from './apiBase';

/** Prompt alanında örnek metin (doğrudan kullanılabilir) */
export const EXAMPLE_PROMPT =
  '15 yıllık tecrübe, steril ortam, fade ve sakal ustası, randevulu hizmet, aile işletmesi, hafta içi 09–20';

export const EXAMPLE_PROMPT_HINT =
  'Örn: 15 yıllık tecrübe, steril ortam, fade ve sakal ustası, randevulu hizmet…';

/** Prompt + firma/sektör bilgisinden hakkında metni üret (yerel) */
export function generateAboutLocal(input: {
  prompt: string;
  company: CompanySetup;
  templateId?: string;
}): string {
  const name = input.company.name || 'İşletmemiz';
  const sector =
    input.company.sectorNames?.[0] ||
    input.company.sectorName ||
    'hizmet';
  const tpl = getWebTemplate(input.templateId || input.company.webPage?.templateId);
  const prompt = input.prompt
    .trim()
    .replace(/^örnek\s*:?\s*/i, '')
    .replace(/^örn\.?\s*:?\s*/i, '')
    .replace(/\s+/g, ' ');
  const bits = prompt
    .split(/[,;|/]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const lead =
    bits.length > 0
      ? `${name}, ${sector.toLocaleLowerCase('tr')} alanında ${bits.slice(0, 3).join(', ')} odaklı hizmet sunar.`
      : `${name}, ${sector.toLocaleLowerCase('tr')} alanında güvenilir ve özenli hizmet sunar.`;

  const mid =
    bits.length > 3
      ? ` Misafirlerimize ${bits.slice(3).join(', ')} ile konforlu bir deneyim yaşatmayı hedefliyoruz.`
      : tpl?.about
        ? ` ${tpl.about}`
        : ' Hijyen, randevu düzeni ve samimi iletişim önceliğimizdir.';

  const hours = (() => {
    if (!input.company.workStart || !input.company.workEnd) return '';
    const weekday = `${input.company.workStart}–${input.company.workEnd}`;
    if (input.company.weekendClosed) {
      return ` Hafta içi ${weekday}; hafta sonu kapalıyız.`;
    }
    const weStart = input.company.weekendWorkStart || input.company.workStart;
    const weEnd = input.company.weekendWorkEnd || input.company.workEnd;
    if (weStart === input.company.workStart && weEnd === input.company.workEnd) {
      return ` Çalışma saatlerimiz ${weekday} arasındadır.`;
    }
    return ` Hafta içi ${weekday}, hafta sonu ${weStart}–${weEnd} arasındayız.`;
  })();

  const loc =
    input.company.webPage?.district || input.company.webPage?.city
      ? ` ${[input.company.webPage?.district, input.company.webPage?.city].filter(Boolean).join(', ')} bölgesinde hizmet veriyoruz.`
      : '';

  return `${lead}${mid}${hours}${loc}`.replace(/\s+/g, ' ').trim();
}

/** Sunucuda AI varsa kullan; yoksa yerel üretim */
export async function generateAboutAi(input: {
  prompt: string;
  company: CompanySetup;
  deviceId: string;
  templateId?: string;
}): Promise<{ ok: boolean; text: string; message: string }> {
  const local = generateAboutLocal(input);
  if (!navigator.onLine) {
    return { ok: true, text: local, message: 'Çevrimdışı metin üretildi' };
  }

  const key = String(input.company.activationKey || '')
    .trim()
    .toUpperCase();
  const base = apiBase();

  try {
    const res = await fetch(`${base}/tablet/ai/about`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': input.deviceId,
        ...(key ? { 'X-Activation-Key': key } : {}),
      },
      body: JSON.stringify({
        deviceId: input.deviceId,
        activationKey: key || undefined,
        companyId: input.company.serverCompanyId,
        prompt: input.prompt,
        companyName: input.company.name,
        sectorName: input.company.sectorName || input.company.sectorNames?.[0],
        templateId: input.templateId,
        hours: input.company.weekendClosed
          ? `hafta içi ${input.company.workStart}–${input.company.workEnd}, hafta sonu kapalı`
          : `hafta içi ${input.company.workStart}–${input.company.workEnd}, hafta sonu ${input.company.weekendWorkStart || input.company.workStart}–${input.company.weekendWorkEnd || input.company.workEnd}`,
        city: input.company.webPage?.city,
        district: input.company.webPage?.district,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success && data?.data?.text) {
      return { ok: true, text: String(data.data.text), message: data.message || 'AI metin hazır' };
    }
    // Uç yok / anahtar yok → yerel
    return { ok: true, text: local, message: 'Yerel AI metin üretildi' };
  } catch {
    return { ok: true, text: local, message: 'Yerel AI metin üretildi' };
  }
}
