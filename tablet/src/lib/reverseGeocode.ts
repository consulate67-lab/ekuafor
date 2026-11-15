export type ResolvedAddress = {
  address: string;
  district: string;
  city: string;
  raw?: string;
};

/**
 * Tarayıcı CORS’a uygun reverse geocode (BigDataCloud client API).
 * Kurulumdaki lat/lng → il / ilçe / sokak.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ResolvedAddress | null> {
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${latitude}&longitude=${longitude}&localityLanguage=tr`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      localityInfo?: {
        administrative?: { name: string; adminLevel?: number; description?: string }[];
        informative?: { name: string; description?: string }[];
      };
      plusCode?: string;
    };

    const admins = data.localityInfo?.administrative || [];
    const city =
      admins.find(a => a.adminLevel === 4)?.name ||
      data.principalSubdivision ||
      data.city ||
      '';
    const district =
      admins.find(a => a.adminLevel === 6)?.name ||
      admins.find(a => a.adminLevel === 5)?.name ||
      data.locality ||
      '';
    const neighborhood =
      admins.find(a => a.adminLevel === 8)?.name ||
      admins.find(a => a.adminLevel === 9)?.name ||
      data.localityInfo?.informative?.find(i => /neighbourhood|mahalle|quarter/i.test(i.description || ''))
        ?.name ||
      '';

    const address = [neighborhood, data.locality].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');

    return {
      address: address || neighborhood || '',
      district: district || data.locality || '',
      city: city || data.principalSubdivision || '',
      raw: [neighborhood, district, city].filter(Boolean).join(', '),
    };
  } catch {
    return null;
  }
}
