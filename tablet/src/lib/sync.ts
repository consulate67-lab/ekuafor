import type { TabletState, SyncPayload } from '../types';
import { uid } from './id';
import { apiBase as defaultApiBase } from './apiBase';

/**
 * Raporlar için online senkron.
 * Veriler tablette kalır; internet varken özet sunucuya iletilir.
 */

export function buildSnapshot(state: TabletState): SyncPayload {
  return {
    id: uid('sync'),
    createdAt: new Date().toISOString(),
    type: 'snapshot',
    body: {
      deviceId: state.deviceId,
      company: state.company
        ? {
            name: state.company.name,
            workStart: state.company.workStart,
            workEnd: state.company.workEnd,
            slotInterval: state.company.slotInterval,
            location: state.company.location,
            sectorSlug: state.company.sectorSlug,
            sectorName: state.company.sectorName,
            sectorSlugs: state.company.sectorSlugs,
            sectorNames: state.company.sectorNames,
            activationKey: state.company.activationKey,
            webPage: state.company.webPage || null,
          }
        : null,
      staffCount: state.staff.length,
      serviceCount: state.services.length,
      events: state.events.map(e => ({
        id: e.id,
        kind: e.kind,
        staffId: e.staffId,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        status: e.status,
        customerName: e.customerName,
        price: e.price,
        collectedPrice: e.collectedPrice,
        paymentMethod: e.paymentMethod,
        note: e.note,
      })),
      expenses: state.expenses,
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function pushSnapshot(
  state: TabletState,
  apiBase = defaultApiBase(),
): Promise<{ ok: boolean; message: string }> {
  const payload = buildSnapshot(state);
  try {
    const res = await fetch(`${apiBase.replace(/\/+$/, '')}/tablet/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Id': state.deviceId },
      body: JSON.stringify(payload.body),
    });
    if (res.status === 404) {
      return {
        ok: false,
        message: 'Sunucu henüz tablet senkronunu kabul etmiyor. Rapor tablette hazır; uç nokta eklenince gönderilecek.',
      };
    }
    if (!res.ok) {
      return { ok: false, message: `Sunucu yanıtı: ${res.status}` };
    }
    return { ok: true, message: 'Rapor sunucuya iletildi.' };
  } catch {
    return {
      ok: false,
      message: 'İnternet yok veya sunucuya ulaşılamadı. Rapor kuyruğa alındı.',
    };
  }
}
