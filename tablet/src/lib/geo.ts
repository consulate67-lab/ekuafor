import type { GeoLocation } from '../types';

function fromCoords(coords: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}): GeoLocation {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy ?? undefined,
    capturedAt: new Date().toISOString(),
  };
}

const DENIED_TR =
  'Konum izni verilmedi. Ayarlar → Uygulamalar → Saloon Tablet → İzinler → Konum: İzin ver. İsterseniz kuruluma konum olmadan devam edebilirsiniz.';

function mapError(err: unknown): string {
  const code =
    typeof err === 'object' && err && 'code' in err
      ? Number((err as { code?: number }).code)
      : undefined;
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err && 'message' in err
        ? String((err as { message?: string }).message || '')
        : String(err || '');

  if (
    code === 1 ||
    /denied|permission|User denied|PERMISSION_DENIED/i.test(msg)
  ) {
    return DENIED_TR;
  }
  if (code === 2 || /unavailable|position/i.test(msg)) {
    return 'Konum alınamadı. GPS açık olsun veya sonra Parametre’den ekleyin.';
  }
  if (code === 3 || /timeout/i.test(msg)) {
    return 'Konum zaman aşımı. Tekrar deneyin veya atlayın.';
  }
  return msg || 'Konum alınamadı.';
}

async function viaCapacitor(): Promise<GeoLocation> {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) {
    throw new Error('not-native');
  }
  const { Geolocation } = await import('@capacitor/geolocation');
  try {
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
      const req = await Geolocation.requestPermissions();
      if (req.location !== 'granted' && req.coarseLocation !== 'granted') {
        throw { code: 1, message: 'User denied Geolocation' };
      }
    }
  } catch (e) {
    if (typeof e === 'object' && e && 'code' in e) throw e;
    /* bazı cihazlarda checkPermissions yok — getCurrentPosition dener */
  }

  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 20000,
  });
  return fromCoords(pos.coords);
}

function viaBrowser(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Bu cihazda konum desteklenmiyor.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve(fromCoords(pos.coords)),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60_000 },
    );
  });
}

/** Native APK’da Capacitor; tarayıcıda Web Geolocation. */
export async function captureLocation(): Promise<GeoLocation> {
  try {
    return await viaCapacitor();
  } catch (e) {
    if (e instanceof Error && e.message === 'not-native') {
      try {
        return await viaBrowser();
      } catch (webErr) {
        throw new Error(mapError(webErr));
      }
    }
    throw new Error(mapError(e));
  }
}

export { mapError as geoErrorMessage };
