const DEFAULT_API = 'https://web-production-db847.up.railway.app/api';

export type PendingAppointment = {
  id: number;
  company_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name?: string;
  customer_phone?: string;
  price?: number;
  notes?: string;
  staff_id?: number;
  service_name?: string;
  staff_name?: string;
};

function apiBase() {
  return (import.meta.env.VITE_API_URL || DEFAULT_API).replace(/\/$/, '');
}

export async function fetchPendingAppointments(input: {
  deviceId: string;
  activationKey: string;
  companyId: number;
}): Promise<{ ok: boolean; data: PendingAppointment[]; message?: string }> {
  if (!navigator.onLine) return { ok: false, data: [], message: 'İnternet yok' };
  try {
    const q = new URLSearchParams({
      companyId: String(input.companyId),
      deviceId: input.deviceId,
      activationKey: input.activationKey,
    });
    const res = await fetch(`${apiBase()}/tablet/appointments/pending?${q}`, {
      headers: {
        'X-Device-Id': input.deviceId,
        'X-Activation-Key': input.activationKey,
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      return { ok: false, data: [], message: json?.error || `Hata (${res.status})` };
    }
    return { ok: true, data: Array.isArray(json.data) ? json.data : [] };
  } catch {
    return { ok: false, data: [], message: 'Bağlantı kurulamadı' };
  }
}

export async function setPendingAppointmentStatus(input: {
  deviceId: string;
  activationKey: string;
  companyId: number;
  appointmentId: number;
  status: 'approved' | 'cancelled';
}): Promise<{ ok: boolean; message: string; data?: PendingAppointment }> {
  if (!navigator.onLine) return { ok: false, message: 'İnternet yok' };
  try {
    const res = await fetch(`${apiBase()}/tablet/appointments/${input.appointmentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': input.deviceId,
        'X-Activation-Key': input.activationKey,
      },
      body: JSON.stringify({
        deviceId: input.deviceId,
        activationKey: input.activationKey,
        companyId: input.companyId,
        status: input.status,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      return { ok: false, message: json?.error || `Hata (${res.status})` };
    }
    return { ok: true, message: json?.message || 'Tamam', data: json.data };
  } catch {
    return { ok: false, message: 'Bağlantı kurulamadı' };
  }
}
