import { browserStore, readJson, type KeyValueStore } from '../persistence/storage';

export type BotSpeed = 'slow' | 'normal' | 'fast';
export type MotionPreference = 'system' | 'reduced';

export interface Settings {
  botSpeed: BotSpeed;
  soundEnabled: boolean;
  /** 0..1 */
  volume: number;
  motion: MotionPreference;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  botSpeed: 'normal',
  soundEnabled: true,
  volume: 0.6,
  motion: 'system',
};

/** [delay before the bot's first action, delay between later actions] in ms. */
export const BOT_DELAYS: Record<BotSpeed, readonly [number, number]> = {
  slow: [1400, 1700],
  normal: [900, 1100],
  fast: [450, 550],
};

export const SETTINGS_KEY = 'rune-duel/settings';

/** Accepts only known values; anything else falls back to the default. */
export function sanitizeSettings(value: unknown): Settings {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return {
    botSpeed: v.botSpeed === 'slow' || v.botSpeed === 'fast' || v.botSpeed === 'normal' ? v.botSpeed : DEFAULT_SETTINGS.botSpeed,
    soundEnabled: typeof v.soundEnabled === 'boolean' ? v.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    volume:
      typeof v.volume === 'number' && Number.isFinite(v.volume)
        ? Math.min(1, Math.max(0, v.volume))
        : DEFAULT_SETTINGS.volume,
    motion: v.motion === 'reduced' || v.motion === 'system' ? v.motion : DEFAULT_SETTINGS.motion,
  };
}

export function loadSettings(store: KeyValueStore = browserStore): Settings {
  return sanitizeSettings(readJson(store, SETTINGS_KEY));
}

export function saveSettings(settings: Settings, store: KeyValueStore = browserStore): void {
  store.set(SETTINGS_KEY, JSON.stringify(settings));
}
