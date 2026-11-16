import type { WebPageTemplate } from '@shared/webPageTemplates';

type Props = {
  template: WebPageTemplate;
  companyName: string;
  selected?: boolean;
  onSelect?: () => void;
};

/** Şablon kartı — renk bloğu değil, küçültülmüş sayfa önizlemesi */
export function WebTemplatePreview({ template, companyName, selected, onSelect }: Props) {
  const { theme, layout, gallery, tagline, styleName, ctaLabel } = template;
  const hero = gallery[0]?.src;
  const name = companyName.trim() || 'İşletmeniz';
  const dark = layout === 'dark-full' || theme.surface === '#111827';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`overflow-hidden rounded-2xl text-left ring-2 transition ${
        selected ? 'ring-brand-600 shadow-md' : 'ring-slate-200 hover:ring-slate-300'
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {/* Ölçeklenmiş mini sayfa */}
        <div
          className="absolute inset-0 origin-top-left"
          style={{ transform: 'scale(0.42)', width: '238%', height: '238%' }}
          aria-hidden
        >
          <MiniPage
            layout={layout}
            theme={theme}
            hero={hero}
            name={name}
            tagline={tagline}
            ctaLabel={ctaLabel}
            dark={dark}
            thumbs={gallery.slice(1, 3).map(g => g.src)}
          />
        </div>
        {selected && (
          <span className="absolute right-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-black text-white shadow">
            Seçili
          </span>
        )}
      </div>
      <div className={`border-t px-3 py-2.5 ${dark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
        <p className={`text-sm font-black ${dark ? 'text-white' : 'text-slate-900'}`}>
          {template.name}
        </p>
        <p className={`mt-0.5 line-clamp-1 text-[11px] font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          {styleName} yerleşim · {tagline}
        </p>
      </div>
    </button>
  );
}

function MiniPage({
  layout,
  theme,
  hero,
  name,
  tagline,
  ctaLabel,
  dark,
  thumbs,
}: {
  layout: WebPageTemplate['layout'];
  theme: WebPageTemplate['theme'];
  hero?: string;
  name: string;
  tagline: string;
  ctaLabel: string;
  dark: boolean;
  thumbs: string[];
}) {
  const text = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-white/70' : 'text-slate-500';
  const cardBg = dark ? 'bg-white/10' : 'bg-white';

  if (layout === 'split') {
    return (
      <div className="flex h-full w-full" style={{ background: theme.surface }}>
        <div className="relative w-[48%] overflow-hidden" style={{ background: `linear-gradient(160deg, ${theme.heroFrom}, ${theme.heroTo})` }}>
          {hero && <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-black/35" />
        </div>
        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: theme.accent }}>
              Online randevu
            </p>
            <h3 className={`mt-2 text-2xl font-black leading-tight ${text}`}>{name}</h3>
            <p className={`mt-2 text-sm font-semibold ${muted}`}>{tagline}</p>
          </div>
          <Cta accent={theme.accent} label={ctaLabel} />
        </div>
      </div>
    );
  }

  if (layout === 'editorial') {
    return (
      <div className="flex h-full w-full flex-col" style={{ background: theme.surface }}>
        <div className="px-5 pt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: theme.accent }}>
            {styleHint(layout)}
          </p>
          <h3 className={`mt-1 text-3xl font-black leading-none ${text}`}>{name}</h3>
          <p className={`mt-2 max-w-sm text-sm font-semibold ${muted}`}>{tagline}</p>
        </div>
        <div className="relative mx-5 mt-4 flex-1 overflow-hidden rounded-2xl" style={{ background: `linear-gradient(145deg, ${theme.heroFrom}, ${theme.heroTo})` }}>
          {hero && <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <Cta accent={theme.accent} label={ctaLabel} wide />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4">
          {thumbs.map(src => (
            <div key={src} className="h-14 flex-1 overflow-hidden rounded-xl bg-slate-200">
              <img src={src} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'card') {
    return (
      <div className="flex h-full w-full flex-col p-4" style={{ background: `linear-gradient(160deg, ${theme.heroFrom}, ${theme.heroTo})` }}>
        <div className={`mt-auto rounded-3xl p-5 shadow-xl ${cardBg}`}>
          {hero && (
            <div className="-mt-12 mb-3 h-28 overflow-hidden rounded-2xl bg-slate-200 shadow-md">
              <img src={hero} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <h3 className={`text-xl font-black ${dark ? 'text-white' : 'text-slate-900'}`}>{name}</h3>
          <p className={`mt-1 text-xs font-semibold ${dark ? 'text-white/70' : 'text-slate-500'}`}>{tagline}</p>
          <div className="mt-4">
            <Cta accent={theme.accent} label={ctaLabel} wide />
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'dark-full') {
    return (
      <div className="relative flex h-full w-full flex-col justify-end bg-black p-5">
        {hero && <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">Premium</p>
          <h3 className="mt-1 text-3xl font-black text-white">{name}</h3>
          <p className="mt-2 text-sm font-semibold text-white/75">{tagline}</p>
          <div className="mt-5">
            <Cta accent={theme.accent === '#e5e7eb' ? '#ffffff' : theme.accent} label={ctaLabel} wide darkText />
          </div>
        </div>
      </div>
    );
  }

  // overlay (klasik)
  return (
    <div className="relative flex h-full w-full flex-col justify-end" style={{ background: `linear-gradient(145deg, ${theme.heroFrom}, ${theme.heroTo})` }}>
      {hero && <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/15" />
      <div className="relative z-10 space-y-3 p-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">Web sayfası</p>
          <h3 className="mt-1 text-2xl font-black text-white">{name}</h3>
          <p className="mt-1 text-sm font-semibold text-white/85">{tagline}</p>
        </div>
        <Cta accent={theme.accent} label={ctaLabel} wide />
        <div className="flex gap-2 pt-1">
          {thumbs.map(src => (
            <div key={src} className="h-12 w-16 overflow-hidden rounded-lg bg-white/20">
              <img src={src} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Cta({
  accent,
  label,
  wide,
  darkText,
}: {
  accent: string;
  label: string;
  wide?: boolean;
  darkText?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-black shadow-lg ${
        wide ? 'w-full' : ''
      } ${darkText ? 'text-slate-900' : 'text-white'}`}
      style={{ backgroundColor: accent }}
    >
      {label}
    </span>
  );
}

function styleHint(layout: WebPageTemplate['layout']) {
  if (layout === 'editorial') return 'Editoryal';
  if (layout === 'split') return 'Modern';
  if (layout === 'card') return 'Kart';
  if (layout === 'dark-full') return 'Koyu';
  return 'Klasik';
}
