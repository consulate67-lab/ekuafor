import type { TabletState } from '../types';
import { deviceId } from './id';
import { normalizeMediaSettings } from './idleMedia';

const KEY = 'saloon_tablet_v1';
/** Cihazda uygulama silinse bile kalması için paylaşılan klasör yedeği */
const BACKUP_DIR = 'SaloonTablet';
const BACKUP_FILE = 'setup-backup.json';

export const emptyState = (): TabletState => ({
  deviceId: deviceId(),
  company: null,
  departments: [],
  staff: [],
  services: [],
  events: [],
  expenses: [],
  campaigns: [],
  subscribers: [],
  groupSessions: [],
  syncQueue: [],
  mediaSettings: normalizeMediaSettings(undefined),
});

function mergeState(parsed: Partial<TabletState> | null | undefined): TabletState {
  if (!parsed) return emptyState();
  return {
    ...emptyState(),
    ...parsed,
    expenses: parsed.expenses || [],
    campaigns: (parsed.campaigns || []).map(c => ({
      ...c,
      usesPerService: c.usesPerService ?? 1,
    })),
    subscribers: (parsed.subscribers || []).map(s => ({
      ...s,
      dependents: s.dependents || [],
    })),
    groupSessions: (parsed.groupSessions || []).map(s => ({
      ...s,
      subscriberIds: s.subscriberIds || [],
      waitlistSubscriberIds: s.waitlistSubscriberIds || [],
    })),
    syncQueue: parsed.syncQueue || [],
    deviceId: parsed.deviceId || deviceId(),
    mediaSettings: normalizeMediaSettings(parsed.mediaSettings),
  };
}

function readLocal(): TabletState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return mergeState(JSON.parse(raw) as TabletState);
  } catch {
    return null;
  }
}

function writeLocal(state: TabletState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

async function isNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Capacitor Preferences — uygulama kapanınca kalır, silinince gider */
async function readPreferences(): Promise<TabletState | null> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: KEY });
    if (!value) return null;
    return mergeState(JSON.parse(value) as TabletState);
  } catch {
    return null;
  }
}

async function writePreferences(state: TabletState) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: KEY, value: JSON.stringify(state) });
  } catch {
    /* web / paket yok */
  }
}

type DirName = 'DOCUMENTS' | 'EXTERNAL_STORAGE';

async function readBackupFrom(directory: DirName): Promise<TabletState | null> {
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const dir = directory === 'DOCUMENTS' ? Directory.Documents : Directory.ExternalStorage;
    const result = await Filesystem.readFile({
      path: `${BACKUP_DIR}/${BACKUP_FILE}`,
      directory: dir,
      encoding: Encoding.UTF8,
    });
    const data = typeof result.data === 'string' ? result.data : '';
    if (!data) return null;
    return mergeState(JSON.parse(data) as TabletState);
  } catch {
    return null;
  }
}

/**
 * Cihaz yedeği — ek uygulama yok.
 * Documents: hızlı yerel kopya
 * ExternalStorage/SaloonTablet: APK silinse bile kalır (izin verildiğinde)
 */
async function readDurableBackup(): Promise<TabletState | null> {
  return (
    (await readBackupFrom('EXTERNAL_STORAGE')) ||
    (await readBackupFrom('DOCUMENTS'))
  );
}

async function writeBackupTo(directory: DirName, state: TabletState) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const dir = directory === 'DOCUMENTS' ? Directory.Documents : Directory.ExternalStorage;
  try {
    await Filesystem.mkdir({ path: BACKUP_DIR, directory: dir, recursive: true });
  } catch {
    /* var */
  }
  await Filesystem.writeFile({
    path: `${BACKUP_DIR}/${BACKUP_FILE}`,
    directory: dir,
    data: JSON.stringify(state),
    encoding: Encoding.UTF8,
  });
}

async function writeDurableBackup(state: TabletState) {
  try {
    const { Filesystem } = await import('@capacitor/filesystem');
    try {
      await Filesystem.requestPermissions();
    } catch {
      /* web */
    }
    await writeBackupTo('DOCUMENTS', state);
    try {
      await writeBackupTo('EXTERNAL_STORAGE', state);
    } catch {
      /* Android 11+ kısıtı — Documents yine dolu */
    }
  } catch {
    /* web — sadece localStorage */
  }
}

async function clearPreferences() {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key: KEY });
  } catch {
    /* ignore */
  }
}

async function clearDurableBackup() {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    for (const directory of [Directory.Documents, Directory.ExternalStorage]) {
      try {
        await Filesystem.deleteFile({
          path: `${BACKUP_DIR}/${BACKUP_FILE}`,
          directory,
        });
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

/** Senkron okuma (store init). Asıl kurtarma hydrateAsync ile. */
export function loadState(): TabletState {
  return readLocal() || emptyState();
}

export function saveState(state: TabletState) {
  writeLocal(state);
  void writePreferences(state);
  void writeDurableBackup(state);
}

/**
 * Açılış sırası:
 * 1) localStorage  2) Preferences  3) cihaz Documents yedeği
 * Kurulum varsa board’a dönülür.
 */
export async function loadStateAsync(): Promise<TabletState> {
  const local = readLocal();
  if (local?.company) return local;

  const prefs = await readPreferences();
  if (prefs?.company) {
    writeLocal(prefs);
    return prefs;
  }

  if (await isNative()) {
    const durable = await readDurableBackup();
    if (durable?.company) {
      writeLocal(durable);
      await writePreferences(durable);
      return durable;
    }
  }

  return local || prefs || emptyState();
}

export async function clearState(options?: { wipeBackup?: boolean }) {
  localStorage.removeItem(KEY);
  await clearPreferences();
  if (options?.wipeBackup !== false) {
    await clearDurableBackup();
  }
}

export function getBackupInfo() {
  return {
    localKey: KEY,
    backupPath: `${BACKUP_DIR}/${BACKUP_FILE}`,
    note: 'Yedek tablet Documents/SaloonTablet klasöründe; ek uygulama gerekmez.',
  };
}
