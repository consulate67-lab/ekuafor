import type { IdleMediaSettings, RadioPreset, TvChannel } from '../types';
import { uid } from './id';

/** Katalog güncellenince kayıtlı eski (bozuk) URL’ler yenilenir */
export const MEDIA_CATALOG_VERSION = 6;

/**
 * Yalnızca HTTP 200 doğrulanmış akışlar.
 * Progressive (mp3/aac) önce — tablette ses kesin gelir.
 * TRT HLS satırları gizli <video> + hls.js ile çalınır.
 */
export const DEFAULT_RADIO_PRESETS: RadioPreset[] = [
  { id: 'radio_power_turk', name: 'Power Türk', frequency: 103.0, streamUrl: 'https://listen.powerapp.com.tr/powerturk/mpeg/icecast.audio' },
  { id: 'radio_joy_fm', name: 'Joy FM', frequency: 89.6, streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_FMAAC.aac' },
  { id: 'radio_joy_turk', name: 'Joy Türk', frequency: 92.6, streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_TURKAAC.aac' },
  { id: 'radio_metro_fm', name: 'Metro FM', frequency: 97.2, streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FMAAC.aac' },
  { id: 'radio_super_fm', name: 'Süper FM', frequency: 90.6, streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/SUPER_FMAAC.aac' },
  { id: 'radio_virgin', name: 'Virgin Radio', frequency: 106.2, streamUrl: 'https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIOAAC.aac' },
  { id: 'radio_kiss', name: 'Kiss Türk', frequency: 90.0, streamUrl: 'https://kiss.radyotvonline.net/kissturk' },
  { id: 'radio_show', name: 'Show Radyo', frequency: 99.6, streamUrl: 'https://showradyo.radyotvonline.net/showradyo' },
  { id: 'radio_radyo_d', name: 'Radyo D', frequency: 103.5, streamUrl: 'https://radyo.duhnet.tv/radyod' },
  { id: 'radio_best_fm', name: 'Best FM', frequency: 98.4, streamUrl: 'https://bestfm.turkhosted.com/;' },
  { id: 'radio_alaturka', name: 'Radyo Alaturka', frequency: 91.0, streamUrl: 'https://stream.zeno.fm/0r0xa792kwzuv' },
  { id: 'radio_seymen', name: 'Radyo Seymen', frequency: 107.0, streamUrl: 'https://yayin.radyoseymen.com.tr:1070/stream' },
  { id: 'radio_fenomen', name: 'Radyo Fenomen', frequency: 89.0, streamUrl: 'https://live.radyofenomen.com/fenomen/abr/playlist.m3u8' },
  { id: 'radio_kral_fm', name: 'Kral FM', frequency: 104.0, streamUrl: 'https://dygedge2.radyotvonline.net/kralfm/playlist.m3u8' },
  { id: 'radio_a_haber', name: 'A Haber Radyo', frequency: 96.0, streamUrl: 'https://trkvz-radyolar.ercdn.net/ahaberradyo/playlist.m3u8' },
  { id: 'radio_trt_radyo1', name: 'TRT Radyo 1', frequency: 88.2, streamUrl: 'https://rd-trtradyo1.medya.trt.com.tr/master.m3u8' },
  { id: 'radio_trt_fm', name: 'TRT FM', frequency: 98.0, streamUrl: 'https://rd-trtfm.medya.trt.com.tr/master.m3u8' },
  { id: 'radio_trt_radyo3', name: 'TRT Radyo 3', frequency: 91.4, streamUrl: 'https://rd-trtradyo3.medya.trt.com.tr/master.m3u8' },
  { id: 'radio_trt_haber', name: 'TRT Radyo Haber', frequency: 99.0, streamUrl: 'https://radio-trtradyohaber.live.trt.com.tr/master.m3u8' },
  { id: 'radio_trt_nagme', name: 'TRT Nağme', frequency: 102.0, streamUrl: 'https://rd-trtnagme.medya.trt.com.tr/master.m3u8' },
  { id: 'radio_trt_turku', name: 'TRT Türkü', frequency: 95.0, streamUrl: 'https://rd-trtturku.medya.trt.com.tr/master.m3u8' },
  { id: 'radio_trt_world', name: 'TRT World Radio', frequency: 95.8, streamUrl: 'https://radio-trtworld.medya.trt.com.tr/master.m3u8' },
  { id: 'radio_trt_kurdi', name: 'TRT Radyo Kurdî', frequency: 92.0, streamUrl: 'https://rd-trtradyo6.medya.trt.com.tr/master.m3u8' },
];

/** HTTP + m3u8 doğrulanmış ücretsiz TV akışları (2026-11) */
export const DEFAULT_TV_CHANNELS: TvChannel[] = [
  { id: 'tv_trt1', name: 'TRT 1', streamUrl: 'https://tv-trt1.medya.trt.com.tr/master.m3u8' },
  { id: 'tv_trt2', name: 'TRT 2', streamUrl: 'https://tv-trt2.medya.trt.com.tr/master.m3u8' },
  { id: 'tv_trt_haber', name: 'TRT Haber', streamUrl: 'https://tv-trthaber.medya.trt.com.tr/master.m3u8' },
  { id: 'tv_trt_spor', name: 'TRT Spor', streamUrl: 'https://tv-trtspor1.medya.trt.com.tr/master.m3u8' },
  { id: 'tv_trt_spor_yildiz', name: 'TRT Spor Yıldız', streamUrl: 'https://tv-trtspor2.medya.trt.com.tr/master.m3u8' },
  { id: 'tv_trt_cocuk', name: 'TRT Çocuk', streamUrl: 'https://tv-trtcocuk.medya.trt.com.tr/master.m3u8' },
  { id: 'tv_trt_muzik', name: 'TRT Müzik', streamUrl: 'https://tv-trtmuzik.medya.trt.com.tr/master.m3u8' },
  { id: 'tv_trt_turk', name: 'TRT Türk', streamUrl: 'https://tv-trtturk.medya.trt.com.tr/master.m3u8' },
  { id: 'tv_trt_world', name: 'TRT World', streamUrl: 'https://tv-trtworld.medya.trt.com.tr/master.m3u8' },
  { id: 'tv_trt_avaz', name: 'TRT Avaz', streamUrl: 'https://tv-trtavaz.medya.trt.com.tr/master.m3u8' },
  { id: 'tv_trt_kurdi', name: 'TRT Kurdî', streamUrl: 'https://tv-trtkurdi.medya.trt.com.tr/master.m3u8' },
  { id: 'tv_trt_arabi', name: 'TRT Arabi', streamUrl: 'https://tv-trtarabi.medya.trt.com.tr/master.m3u8' },
  { id: 'tv_trt_diyanet_cocuk', name: 'TRT Diyanet Çocuk', streamUrl: 'https://tv-trtdiyanetcocuk.medya.trt.com.tr/master.m3u8' },
  { id: 'tv_show', name: 'Show TV', streamUrl: 'https://ciner.daioncdn.net/showtv/showtv.m3u8?ce=3&app=4bc856ef-4c68-4a94-bc87-37dfaaa66558' },
  { id: 'tv_kanal_d', name: 'Kanal D', streamUrl: 'https://demiroren.daioncdn.net/kanald/kanald.m3u8?app=kanald_web&ce=3' },
  { id: 'tv_star', name: 'Star TV', streamUrl: 'https://dogus.daioncdn.net/startv/startv.m3u8?ce=3&app=1740db13-3ee9-4858-8d2c-b1a9cfaa3718' },
  { id: 'tv_now', name: 'NOW', streamUrl: 'https://uycyyuuzyh.turknet.ercdn.net/nphindgytw/nowtv/nowtv.m3u8' },
  { id: 'tv_ntv', name: 'NTV', streamUrl: 'https://dogus.daioncdn.net/ntv/ntv.m3u8' },
  { id: 'tv_beyaz', name: 'Beyaz TV', streamUrl: 'https://beyaztv-live.daioncdn.net/beyaztv/beyaztv.m3u8' },
  { id: 'tv_halk', name: 'Halk TV', streamUrl: 'https://halktv-live.daioncdn.net/halktv/halktv.m3u8' },
  { id: 'tv_kanal7', name: 'Kanal 7', streamUrl: 'https://kanal7-live.daioncdn.net/kanal7/kanal7.m3u8' },
  { id: 'tv_tgrt', name: 'TGRT Haber', streamUrl: 'https://tgrthaber-live.daioncdn.net/tgrthaber/tgrthaber.m3u8' },
  { id: 'tv_ulke', name: 'Ülke TV', streamUrl: 'https://livetv.radyotvonline.net/kanal7live/ulketv/playlist.m3u8' },
  { id: 'tv_360', name: 'TV 360', streamUrl: 'https://turkmedya-live.ercdn.net/tv360/tv360.m3u8' },
];

export const defaultMediaSettings = (): IdleMediaSettings => ({
  enabled: true,
  idleDelaySeconds: 90,
  radioEnabled: true,
  radioPresets: DEFAULT_RADIO_PRESETS.map(p => ({ ...p })),
  selectedRadioPresetId: DEFAULT_RADIO_PRESETS[0]?.id,
  tvEnabled: true,
  tvChannels: DEFAULT_TV_CHANNELS.map(c => ({ ...c })),
  selectedTvChannelId: DEFAULT_TV_CHANNELS[0]?.id,
  catalogVersion: MEDIA_CATALOG_VERSION,
});

function isCatalogId(id: string) {
  return id.startsWith('radio_') || id.startsWith('tv_');
}

export function normalizeMediaSettings(
  raw: Partial<IdleMediaSettings> | null | undefined,
): IdleMediaSettings {
  const base = defaultMediaSettings();
  if (!raw) return base;

  const needsCatalogRefresh =
    !raw.catalogVersion || raw.catalogVersion < MEDIA_CATALOG_VERSION;

  let radioPresets: RadioPreset[];
  let tvChannels: TvChannel[];

  if (needsCatalogRefresh) {
    const customRadios = (raw.radioPresets || []).filter(
      p => p?.streamUrl && p.id && !isCatalogId(p.id),
    );
    const customTvs = (raw.tvChannels || []).filter(
      c => c?.streamUrl && c.id && !isCatalogId(c.id),
    );
    radioPresets = [
      ...base.radioPresets,
      ...customRadios.map(p => ({
        id: p.id || uid('radio'),
        name: String(p.name || 'Radyo').trim() || 'Radyo',
        frequency: clampFrequency(Number(p.frequency) || 100),
        streamUrl: String(p.streamUrl || '').trim(),
      })),
    ];
    tvChannels = [
      ...base.tvChannels,
      ...customTvs.map(c => ({
        id: c.id || uid('tv'),
        name: String(c.name || 'Kanal').trim() || 'Kanal',
        streamUrl: String(c.streamUrl || '').trim(),
      })),
    ];
  } else {
    radioPresets =
      Array.isArray(raw.radioPresets) && raw.radioPresets.length
        ? raw.radioPresets.map(p => ({
            id: p.id || uid('radio'),
            name: String(p.name || 'Radyo').trim() || 'Radyo',
            frequency: clampFrequency(Number(p.frequency) || 100),
            streamUrl: String(p.streamUrl || '').trim(),
          }))
        : base.radioPresets;
    tvChannels =
      Array.isArray(raw.tvChannels) && raw.tvChannels.length
        ? raw.tvChannels.map(c => ({
            id: c.id || uid('tv'),
            name: String(c.name || 'Kanal').trim() || 'Kanal',
            streamUrl: String(c.streamUrl || '').trim(),
          }))
        : base.tvChannels;
  }

  return {
    enabled: raw.enabled !== false,
    idleDelaySeconds: Math.max(30, Math.min(600, Number(raw.idleDelaySeconds) || base.idleDelaySeconds)),
    radioEnabled: raw.radioEnabled !== false,
    radioPresets,
    selectedRadioPresetId:
      raw.selectedRadioPresetId && radioPresets.some(p => p.id === raw.selectedRadioPresetId)
        ? raw.selectedRadioPresetId
        : radioPresets[0]?.id,
    tvEnabled: raw.tvEnabled !== false,
    tvChannels,
    selectedTvChannelId:
      raw.selectedTvChannelId && tvChannels.some(c => c.id === raw.selectedTvChannelId)
        ? raw.selectedTvChannelId
        : tvChannels[0]?.id,
    catalogVersion: MEDIA_CATALOG_VERSION,
  };
}

export function clampFrequency(hz: number) {
  if (!Number.isFinite(hz)) return 100;
  return Math.round(Math.min(108, Math.max(87.5, hz)) * 10) / 10;
}

export function formatFrequency(hz: number) {
  return `${clampFrequency(hz).toFixed(1)} FM`;
}

export function isHlsUrl(url: string) {
  return /\.m3u8(\?|$)/i.test(url) || /\/playlist\.m3u8/i.test(url) || /\/master\.m3u8/i.test(url);
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}
