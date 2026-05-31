export const COLLECTOR_TOKEN_KEY = 'album_collector_token';
export const COLLECTOR_USER_KEY = 'album_collector_user';

export type CollectorUser = {
  id: string;
  email: string;
  display_name: string | null;
};

let memoryToken: string | null = null;

export function getCollectorToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(COLLECTOR_TOKEN_KEY);
}

export async function hydrateCollectorTokenFromPreferences(): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: COLLECTOR_TOKEN_KEY });
    if (value) {
      memoryToken = value;
      window.localStorage.setItem(COLLECTOR_TOKEN_KEY, value);
    }
    const userRaw = (await Preferences.get({ key: COLLECTOR_USER_KEY })).value;
    if (userRaw) window.localStorage.setItem(COLLECTOR_USER_KEY, userRaw);
  } catch {
    /* web sem Capacitor */
  }
}

export function setCollectorToken(token: string): void {
  memoryToken = token;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(COLLECTOR_TOKEN_KEY, token);
    void persistPreferences(COLLECTOR_TOKEN_KEY, token);
  }
}

export function clearCollectorToken(): void {
  memoryToken = null;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(COLLECTOR_TOKEN_KEY);
    window.localStorage.removeItem(COLLECTOR_USER_KEY);
    void persistPreferences(COLLECTOR_TOKEN_KEY, null);
    void persistPreferences(COLLECTOR_USER_KEY, null);
  }
}

async function persistPreferences(key: string, value: string | null): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Preferences } = await import('@capacitor/preferences');
    if (value == null) await Preferences.remove({ key });
    else await Preferences.set({ key, value });
  } catch {
    /* ignore */
  }
}

export function getCollectorUser(): CollectorUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(COLLECTOR_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CollectorUser;
  } catch {
    return null;
  }
}

export function setCollectorUser(user: CollectorUser): void {
  if (typeof window !== 'undefined') {
    const raw = JSON.stringify(user);
    window.localStorage.setItem(COLLECTOR_USER_KEY, raw);
    void persistPreferences(COLLECTOR_USER_KEY, raw);
  }
}
