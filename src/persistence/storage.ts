/**
 * Safe localStorage access. Storage can be missing or throw (private mode,
 * blocked site data, quota), so every call is wrapped and the game keeps
 * working without it.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): void;
}

export const browserStore: KeyValueStore = {
  get(key) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      globalThis.localStorage?.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export function readJson(store: KeyValueStore, key: string): unknown {
  const raw = store.get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
