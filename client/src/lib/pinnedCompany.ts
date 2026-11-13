const PIN_KEY = 'saloon_pinned_company_v1';
const PROMPT_KEY = 'saloon_shortcut_prompt_v1';

export type ShortcutPromptState = 'pending' | 'accepted' | 'dismissed';

export function getPinnedCompanyId(): number | null {
  try {
    const n = Number(localStorage.getItem(PIN_KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function setPinnedCompanyId(id: number) {
  try {
    localStorage.setItem(PIN_KEY, String(id));
  } catch {
    /* ignore */
  }
}

export function clearPinnedCompanyId() {
  try {
    localStorage.removeItem(PIN_KEY);
  } catch {
    /* ignore */
  }
}

function promptMap(): Record<string, ShortcutPromptState> {
  try {
    const raw = localStorage.getItem(PROMPT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ShortcutPromptState>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getShortcutPromptState(companyId: number): ShortcutPromptState {
  return promptMap()[String(companyId)] || 'pending';
}

export function setShortcutPromptState(companyId: number, state: ShortcutPromptState) {
  try {
    const next = { ...promptMap(), [String(companyId)]: state };
    localStorage.setItem(PROMPT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** PWA / ana ekran kısayolu olarak mı açık? */
export function isStandaloneDisplay(): boolean {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (nav.standalone) return true;
    return false;
  } catch {
    return false;
  }
}

export function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Firma sayfası için dinamik manifest (start_url bu firmaya) */
export function applyCompanyManifest(input: {
  companyId: number;
  name: string;
  themeColor?: string;
}) {
  try {
    const start = `./#/firma/${input.companyId}?ref=qr&home=1`;
    const manifest = {
      short_name: input.name.slice(0, 12) || 'Saloon',
      name: input.name || 'Saloon',
      icons: [{ src: 'app-icon.png', sizes: '512x512', type: 'image/png' }],
      start_url: start,
      scope: './',
      display: 'standalone',
      theme_color: input.themeColor || '#4f46e5',
      background_color: '#f8fafc',
      orientation: 'portrait',
      lang: 'tr',
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    const prev = link.href;
    link.href = url;
    if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    document.title = input.name;
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', input.name.slice(0, 12));
  } catch {
    /* ignore */
  }
}
