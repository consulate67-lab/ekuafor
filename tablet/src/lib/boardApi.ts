import type { TabletState } from '../types';
import { apiBase } from './apiBase';
import { normalizeMediaSettings } from './idleMedia';

export type BoardPayload = Pick<
  TabletState,
  | 'company'
  | 'departments'
  | 'staff'
  | 'services'
  | 'events'
  | 'expenses'
  | 'campaigns'
  | 'subscribers'
  | 'groupSessions'
  | 'mediaSettings'
>;

function authHeaders(deviceId: string, activationKey: string) {
  return {
    'Content-Type': 'application/json',
    'X-Device-Id': deviceId,
    'X-Activation-Key': activationKey.trim().toUpperCase(),
  };
}

export function boardPayloadFromState(state: TabletState): BoardPayload {
  return {
    company: state.company,
    departments: state.departments,
    staff: state.staff,
    services: state.services,
    events: state.events,
    expenses: state.expenses || [],
    campaigns: state.campaigns || [],
    subscribers: state.subscribers || [],
    groupSessions: state.groupSessions || [],
    mediaSettings: normalizeMediaSettings(state.mediaSettings),
  };
}

/** Railway’den firma board’unu yükle */
export async function fetchBoard(input: {
  deviceId: string;
  activationKey: string;
  companyId?: number;
}): Promise<{
  ok: boolean;
  message?: string;
  companyId?: number;
  revision?: number;
  payload?: BoardPayload | null;
}> {
  if (!navigator.onLine) return { ok: false, message: 'İnternet yok' };
  const key = input.activationKey.trim().toUpperCase();
  if (!key) return { ok: false, message: 'Kurulum anahtarı yok' };

  try {
    const q = new URLSearchParams({
      deviceId: input.deviceId,
      activationKey: key,
    });
    if (input.companyId) q.set('companyId', String(input.companyId));

    const res = await fetch(`${apiBase()}/tablet/board?${q}`, {
      headers: authHeaders(input.deviceId, key),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { ok: false, message: data?.error || `Yükleme başarısız (${res.status})` };
    }
    return {
      ok: true,
      companyId: data?.data?.company_id,
      revision: data?.data?.revision,
      payload: data?.data?.payload ?? null,
      message: data?.message,
    };
  } catch {
    return { ok: false, message: 'Sunucuya bağlanılamadı' };
  }
}

/** Board’u Railway’e yaz */
export async function saveBoard(input: {
  deviceId: string;
  activationKey: string;
  companyId: number;
  payload: BoardPayload;
  expectedRevision?: number;
}): Promise<{ ok: boolean; message?: string; revision?: number }> {
  if (!navigator.onLine) return { ok: false, message: 'İnternet yok — kayıt sunucuya yazılamadı' };
  const key = input.activationKey.trim().toUpperCase();
  if (!key || !input.companyId) return { ok: false, message: 'Kimlik eksik' };

  try {
    const res = await fetch(`${apiBase()}/tablet/board`, {
      method: 'PUT',
      headers: authHeaders(input.deviceId, key),
      body: JSON.stringify({
        deviceId: input.deviceId,
        activationKey: key,
        companyId: input.companyId,
        expectedRevision: input.expectedRevision,
        payload: input.payload,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { ok: false, message: data?.error || `Kayıt başarısız (${res.status})` };
    }
    return { ok: true, revision: data?.data?.revision, message: data?.message };
  } catch {
    return { ok: false, message: 'Sunucuya bağlanılamadı' };
  }
}
