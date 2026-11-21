import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import {
  clampFrequency,
  formatFrequency,
  isHlsUrl,
  isOnline,
  normalizeMediaSettings,
} from '../lib/idleMedia';
import { attachStream, type StreamHandle } from '../lib/streamPlayer';
import { uid } from '../lib/id';
import { IconClose, IconList, IconPause, IconPlay, IconRadio, IconTv } from './Icons';
import type { RadioPreset, TvChannel } from '../types';

type Tab = 'radio' | 'tv';

type Props = {
  mode: Tab;
  onClose: () => void;
  autoTv?: boolean;
};

function channelNumber(index: number) {
  return String(index + 1).padStart(2, '0');
}

export function IdleMediaPanel({ mode, onClose, autoTv }: Props) {
  const mediaSettings = useAppStore(s => s.mediaSettings);
  const updateMediaSettings = useAppStore(s => s.updateMediaSettings);
  const settings = useMemo(() => normalizeMediaSettings(mediaSettings), [mediaSettings]);

  const [tab, setTab] = useState<Tab>(mode);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [online, setOnline] = useState(() => isOnline());
  const [freq, setFreq] = useState(100);
  const [name, setName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [tvName, setTvName] = useState('');
  const [tvUrl, setTvUrl] = useState('');
  const [radioFilter, setRadioFilter] = useState('');
  /** Televizyon OSD tarzı kanal / istasyon listesi */
  const [guideOpen, setGuideOpen] = useState(false);
  /** HLS iken video görünür olmalı (display:none sesi keser) */
  const [radioEngine, setRadioEngine] = useState<'audio' | 'hls'>('audio');

  /** Progressive radyo */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** TV */
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** HLS radyo (TRT) — video + hls.js */
  const radioHlsRef = useRef<HTMLVideoElement | null>(null);
  const handleRef = useRef<StreamHandle | null>(null);

  const selectedRadio = settings.radioPresets.find(p => p.id === settings.selectedRadioPresetId);
  const selectedTv = settings.tvChannels.find(c => c.id === settings.selectedTvChannelId);

  const filteredRadios = useMemo(() => {
    const q = radioFilter.trim().toLocaleLowerCase('tr-TR');
    if (!q) return settings.radioPresets;
    return settings.radioPresets.filter(
      p =>
        p.name.toLocaleLowerCase('tr-TR').includes(q) ||
        formatFrequency(p.frequency).toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [settings.radioPresets, radioFilter]);

  useEffect(() => {
    setTab(mode);
    setGuideOpen(false);
  }, [mode]);

  useEffect(() => {
    if (selectedRadio) {
      setFreq(selectedRadio.frequency);
      setName(selectedRadio.name);
      setStreamUrl(selectedRadio.streamUrl);
    }
  }, [selectedRadio?.id]);

  useEffect(() => {
    const sync = () => setOnline(isOnline());
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  useEffect(() => {
    return () => {
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  const stopAll = () => {
    handleRef.current?.destroy();
    handleRef.current = null;
    setPlaying(false);
    setStatus('');
  };

  useEffect(() => {
    if (!online && playing) {
      stopAll();
      setError('İnternet yok — radyo / TV için bağlantı gerekli');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const requireOnline = () => {
    if (!isOnline()) {
      setOnline(false);
      setError('İnternet bağlantısı yok — yayın açılamaz');
      return false;
    }
    setOnline(true);
    return true;
  };

  const playRadio = (preset?: RadioPreset) => {
    if (!requireOnline()) return;
    const target = preset || {
      id: settings.selectedRadioPresetId || '',
      name: name.trim() || 'Radyo',
      frequency: clampFrequency(freq),
      streamUrl: streamUrl.trim(),
    };
    if (!target.streamUrl) {
      setError('Akış adresi gerekli');
      return;
    }

    const useHls = isHlsUrl(target.streamUrl);
    setError('');
    setStatus('Bağlanıyor…');
    stopAll();
    setRadioEngine(useHls ? 'hls' : 'audio');

    if (preset) {
      updateMediaSettings({ selectedRadioPresetId: preset.id });
      setFreq(preset.frequency);
      setName(preset.name);
      setStreamUrl(preset.streamUrl);
    } else {
      setStreamUrl(target.streamUrl);
    }

    const el = useHls ? radioHlsRef.current : audioRef.current;
    if (!el) {
      setError('Ses oynatıcı hazır değil');
      setStatus('');
      return;
    }
    handleRef.current = attachStream(
      el,
      target.streamUrl,
      msg => {
        setPlaying(false);
        setStatus('');
        setError(msg);
      },
      () => {
        setPlaying(true);
        setStatus('Çalıyor');
        setError('');
      },
    );
    setPlaying(true);
  };

  const playTv = (channel?: TvChannel) => {
    if (!requireOnline()) return;
    const target = channel || selectedTv;
    if (!target?.streamUrl) {
      setError('Kanal akış adresi yok');
      return;
    }
    const el = videoRef.current;
    if (!el) return;

    setError('');
    setStatus('Bağlanıyor…');
    stopAll();

    handleRef.current = attachStream(
      el,
      target.streamUrl,
      msg => {
        setPlaying(false);
        setStatus('');
        setError(msg);
      },
      () => {
        setPlaying(true);
        setStatus('Yayında');
        setError('');
      },
    );
    setPlaying(true);
    if (channel) updateMediaSettings({ selectedTvChannelId: channel.id });
  };

  useEffect(() => {
    if (autoTv && tab === 'tv' && selectedTv?.streamUrl && isOnline()) {
      const t = window.setTimeout(() => playTv(selectedTv), 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTv, tab, selectedTv?.id]);

  const saveRadioPreset = () => {
    const url = streamUrl.trim();
    if (!url) {
      setError('Akış adresi gerekli');
      return;
    }
    const label = name.trim() || formatFrequency(freq);
    const existing = settings.radioPresets.find(
      p => Math.abs(p.frequency - clampFrequency(freq)) < 0.05 || p.streamUrl === url,
    );
    let next: RadioPreset[];
    let selectedId: string;
    if (existing) {
      selectedId = existing.id;
      next = settings.radioPresets.map(p =>
        p.id === existing.id
          ? { ...p, name: label, frequency: clampFrequency(freq), streamUrl: url }
          : p,
      );
    } else {
      selectedId = uid('radio');
      next = [
        ...settings.radioPresets,
        { id: selectedId, name: label, frequency: clampFrequency(freq), streamUrl: url },
      ];
    }
    updateMediaSettings({ radioPresets: next, selectedRadioPresetId: selectedId });
    setError('');
    setName(label);
  };

  const removeRadioPreset = (id: string) => {
    const next = settings.radioPresets.filter(p => p.id !== id);
    updateMediaSettings({
      radioPresets: next,
      selectedRadioPresetId:
        settings.selectedRadioPresetId === id ? next[0]?.id : settings.selectedRadioPresetId,
    });
  };

  const saveTvChannel = () => {
    const url = tvUrl.trim();
    if (!url || !tvName.trim()) {
      setError('Kanal adı ve akış adresi gerekli');
      return;
    }
    const id = uid('tv');
    updateMediaSettings({
      tvChannels: [...settings.tvChannels, { id, name: tvName.trim(), streamUrl: url }],
      selectedTvChannelId: id,
    });
    setTvName('');
    setTvUrl('');
    setError('');
  };

  const removeTvChannel = (id: string) => {
    const next = settings.tvChannels.filter(c => c.id !== id);
    updateMediaSettings({
      tvChannels: next,
      selectedTvChannelId:
        settings.selectedTvChannelId === id ? next[0]?.id : settings.selectedTvChannelId,
    });
  };

  const handleClose = () => {
    stopAll();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[45] flex flex-col bg-slate-950 text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              stopAll();
              setGuideOpen(false);
              setTab('radio');
            }}
            className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black ${
              tab === 'radio' ? 'bg-brand-600 text-white' : 'bg-white/10 text-white/70'
            }`}
          >
            <IconRadio className="h-4 w-4" /> Radyo
          </button>
          <button
            type="button"
            onClick={() => {
              stopAll();
              setGuideOpen(false);
              setTab('tv');
            }}
            className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black ${
              tab === 'tv' ? 'bg-brand-600 text-white' : 'bg-white/10 text-white/70'
            }`}
          >
            <IconTv className="h-4 w-4" /> TV
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title={tab === 'tv' ? 'Kanal listesi' : 'İstasyon listesi'}
            aria-label={tab === 'tv' ? 'Kanal listesi' : 'İstasyon listesi'}
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-black text-white/90"
          >
            <IconList className="h-4 w-4" />
            <span className="hidden sm:inline">{tab === 'tv' ? 'Kanal listesi' : 'İstasyon listesi'}</span>
          </button>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
              online ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            {online ? 'Çevrimiçi' : 'İnternet yok'}
          </span>
          {status && (
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black text-white/70">
              {status}
            </span>
          )}
          <button
            type="button"
            title="Kapat"
            aria-label="Kapat"
            onClick={handleClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"
          >
            <IconClose />
          </button>
        </div>
      </header>

      {(error || !online) && (
        <p className="shrink-0 bg-amber-500/20 px-4 py-2 text-center text-sm font-bold text-amber-100">
          {!online ? 'İnternet bağlantısı yok — radyo / TV çalışmaz' : error}
        </p>
      )}

      {/* İkisi de her zaman mount — display:none / unmount sesi keser */}
      <audio
        ref={audioRef}
        className={
          tab === 'radio' && radioEngine === 'audio'
            ? 'mx-4 mt-3 h-10 w-[calc(100%-2rem)]'
            : 'fixed left-0 top-0 h-1 w-1 opacity-0'
        }
        controls={tab === 'radio' && radioEngine === 'audio'}
        preload="none"
      />
      <video
        ref={radioHlsRef}
        className={
          tab === 'radio' && radioEngine === 'hls'
            ? 'mx-4 mt-3 h-16 w-[calc(100%-2rem)] rounded-2xl bg-black object-cover'
            : 'fixed left-0 top-0 h-1 w-1 opacity-0'
        }
        playsInline
        controls={tab === 'radio' && radioEngine === 'hls'}
      />

      {tab === 'radio' && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
          <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-300">Frekans</p>
            <p className="mt-1 text-4xl font-black tabular-nums">{formatFrequency(freq)}</p>
            <p className="mt-1 text-lg font-bold text-white/80">{name || 'İstasyon seçin'}</p>
            <input
              type="range"
              min={87.5}
              max={108}
              step={0.1}
              value={freq}
              onChange={e => setFreq(clampFrequency(Number(e.target.value)))}
              className="mt-4 w-full accent-brand-500"
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="İstasyon adı"
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 font-bold text-white placeholder:text-white/40"
              />
              <input
                value={streamUrl}
                onChange={e => setStreamUrl(e.target.value)}
                placeholder="Akış URL (https://…)"
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 font-bold text-white placeholder:text-white/40"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="btn btn-primary inline-flex items-center gap-2 !min-h-11"
              >
                <IconList className="h-4 w-4" /> İstasyon listesi
              </button>
              <button
                type="button"
                disabled={!online}
                onClick={() => (playing ? stopAll() : playRadio())}
                className="btn btn-secondary inline-flex items-center gap-2 !min-h-11 disabled:opacity-40"
              >
                {playing ? <IconPause /> : <IconPlay />}
                {playing ? 'Durdur' : 'Çal'}
              </button>
              <button type="button" onClick={saveRadioPreset} className="btn btn-secondary !min-h-11">
                Frekansı kaydet
              </button>
            </div>
            <p className="mt-3 text-xs font-semibold text-white/50">
              İstasyon listesinden seçin. Üstteki oynatıcı çubuğunda sesin açık olduğundan emin olun.
            </p>
          </div>
        </div>
      )}

      {tab === 'tv' && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-[40vh] flex-1 bg-black sm:min-h-0">
            <video
              ref={videoRef}
              className="h-full w-full object-contain"
              controls
              playsInline
              autoPlay={!!autoTv}
            />
            {!playing && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="rounded-2xl bg-black/50 px-4 py-2 text-sm font-bold text-white/70">
                  {online ? 'Kanal seçin veya oynatın' : 'İnternet gerekli'}
                </p>
              </div>
            )}
          </div>
          <div className="shrink-0 space-y-3 border-t border-white/10 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white"
              >
                <IconList className="h-4 w-4" /> Kanal listesi
              </button>
              {selectedTv && (
                <button
                  type="button"
                  disabled={!online}
                  onClick={() => (playing ? stopAll() : playTv(selectedTv))}
                  className="inline-flex items-center gap-1 rounded-2xl bg-white/10 px-3 py-2.5 text-sm font-black disabled:opacity-40"
                >
                  {playing ? <IconPause className="h-4 w-4" /> : <IconPlay className="h-4 w-4" />}
                  {playing ? 'Durdur' : 'Oynat'}
                </button>
              )}
              {selectedTv && (
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-white/70">
                  {selectedTv.name}
                </p>
              )}
            </div>
            <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto">
              {settings.tvChannels.slice(0, 8).map(c => (
                <button
                  key={c.id}
                  type="button"
                  disabled={!online}
                  onClick={() => playTv(c)}
                  className={`rounded-2xl px-3 py-2 text-sm font-black disabled:opacity-40 ${
                    c.id === settings.selectedTvChannelId
                      ? 'bg-brand-600 text-white'
                      : 'bg-white/10 text-white/80'
                  }`}
                >
                  {c.name}
                </button>
              ))}
              {settings.tvChannels.length > 8 && (
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-black text-white/70"
                >
                  +{settings.tvChannels.length - 8} daha
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto_auto]">
              <input
                value={tvName}
                onChange={e => setTvName(e.target.value)}
                placeholder="Kanal adı"
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 font-bold text-white placeholder:text-white/40"
              />
              <input
                value={tvUrl}
                onChange={e => setTvUrl(e.target.value)}
                placeholder="Ücretsiz yayın URL (.m3u8 / mp4)"
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 font-bold text-white placeholder:text-white/40"
              />
              <button type="button" onClick={saveTvChannel} className="btn btn-primary !min-h-10 !px-3">
                Ekle
              </button>
              {selectedTv && !selectedTv.id.startsWith('tv_') && (
                <button
                  type="button"
                  onClick={() => removeTvChannel(selectedTv.id)}
                  className="btn btn-secondary !min-h-10 !px-3"
                >
                  Sil
                </button>
              )}
            </div>
            <p className="text-xs font-semibold text-white/45">
              {settings.tvChannels.length} kanal · doğrulanmış yayınlar · çevrimiçi gerekir
            </p>
          </div>
        </div>
      )}

      {guideOpen && (
        <div
          className="absolute inset-0 z-20 flex flex-col bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={tab === 'tv' ? 'Kanal listesi' : 'İstasyon listesi'}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/15 bg-slate-950/95 px-4 py-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-300">
                {tab === 'tv' ? 'TV menü' : 'Radyo menü'}
              </p>
              <h2 className="text-lg font-black">
                {tab === 'tv' ? 'Kanal listesi' : 'İstasyon listesi'}
              </h2>
            </div>
            <button
              type="button"
              title="Listeyi kapat"
              aria-label="Listeyi kapat"
              onClick={() => setGuideOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"
            >
              <IconClose />
            </button>
          </div>

          {tab === 'radio' && (
            <div className="shrink-0 border-b border-white/10 px-4 py-3">
              <input
                value={radioFilter}
                onChange={e => setRadioFilter(e.target.value)}
                placeholder="İstasyon ara…"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base font-bold text-white placeholder:text-white/40"
              />
            </div>
          )}

          <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
            {tab === 'tv'
              ? settings.tvChannels.map((c, i) => {
                  const selected = c.id === settings.selectedTvChannelId;
                  return (
                    <li key={c.id} className="mb-1.5">
                      <button
                        type="button"
                        disabled={!online}
                        onClick={() => {
                          playTv(c);
                          setGuideOpen(false);
                        }}
                        className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left disabled:opacity-40 ${
                          selected
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40'
                            : 'bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10'
                        }`}
                      >
                        <span
                          className={`w-10 shrink-0 text-center font-mono text-lg font-black tabular-nums ${
                            selected ? 'text-white' : 'text-brand-300'
                          }`}
                        >
                          {channelNumber(i)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-lg font-black">{c.name}</span>
                        {selected && (
                          <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-white/80">
                            Seçili
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })
              : filteredRadios.map((p, i) => {
                  const selected = p.id === settings.selectedRadioPresetId;
                  const sourceIndex = settings.radioPresets.findIndex(r => r.id === p.id);
                  const num = channelNumber(sourceIndex >= 0 ? sourceIndex : i);
                  return (
                    <li key={p.id} className="mb-1.5">
                      <div
                        className={`flex items-center gap-2 rounded-2xl ${
                          selected
                            ? 'bg-brand-600 shadow-lg shadow-brand-900/40'
                            : 'bg-white/5 ring-1 ring-white/10'
                        }`}
                      >
                        <button
                          type="button"
                          disabled={!online}
                          onClick={() => {
                            playRadio(p);
                            setGuideOpen(false);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3.5 text-left disabled:opacity-40"
                        >
                          <span
                            className={`w-10 shrink-0 text-center font-mono text-lg font-black tabular-nums ${
                              selected ? 'text-white' : 'text-brand-300'
                            }`}
                          >
                            {num}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-lg font-black">{p.name}</span>
                            <span
                              className={`block text-sm font-semibold ${
                                selected ? 'text-white/75' : 'text-white/50'
                              }`}
                            >
                              {formatFrequency(p.frequency)}
                              {isHlsUrl(p.streamUrl) ? ' · HLS' : ''}
                            </span>
                          </span>
                          {selected && (
                            <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-white/80">
                              Seçili
                            </span>
                          )}
                        </button>
                        {!p.id.startsWith('radio_') && (
                          <button
                            type="button"
                            className="mr-2 shrink-0 rounded-xl bg-black/25 px-3 py-2 text-xs font-bold text-white/70"
                            onClick={() => removeRadioPreset(p.id)}
                          >
                            Sil
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
            {tab === 'radio' && filteredRadios.length === 0 && (
              <li className="rounded-2xl bg-white/5 px-4 py-8 text-center text-sm font-bold text-white/50">
                Eşleşen istasyon yok
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
