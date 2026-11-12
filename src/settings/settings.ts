import { sanitizeSetup, type BattleSetup } from '../content/setup';
import { browserStore, readJson, type KeyValueStore } from '../persistence/storage';

export type BotSpeed = 'slow' | 'normal' | 'fast';
export type MotionPreference = 'system' | 'reduced';

export interface Settings {
  botSpeed: BotSpeed;
  soundEnabled: boolean;
  /** 0..1 */
  volume: number;
  motion: MotionPreference;
  /** Background music (off by default: no surprise audio). */
  musicEnabled: boolean;
  /** 0..1 */
  musicVolume: number;
  /** True once the first-battle tutorial was finished or skipped. */
  tutorialDone: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  botSpeed: 'normal',
  soundEnabled: true,
  volume: 0.6,
  motion: 'system',
  musicEnabled: false,
  musicVolume: 0.4,
  tutorialDone: false,
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
    musicEnabled: typeof v.musicEnabled === 'boolean' ? v.musicEnabled : DEFAULT_SETTINGS.musicEnabled,
    musicVolume:
      typeof v.musicVolume === 'number' && Number.isFinite(v.musicVolume)
        ? Math.min(1, Math.max(0, v.musicVolume))
        : DEFAULT_SETTINGS.musicVolume,
    tutorialDone: typeof v.tutorialDone === 'boolean' ? v.tutorialDone : DEFAULT_SETTINGS.tutorialDone,
  };
}

export function loadSettings(store: KeyValueStore = browserStore): Settings {
  return sanitizeSettings(readJson(store, SETTINGS_KEY));
}

export function saveSettings(settings: Settings, store: KeyValueStore = browserStore): void {
  store.set(SETTINGS_KEY, JSON.stringify(settings));
}

export const SETUP_KEY = 'rune-duel/last-setup';

/** The deck/opponent chosen last time, preselected on the setup screen. */
export function loadLastSetup(store: KeyValueStore = browserStore): BattleSetup {
  return sanitizeSetup(readJson(store, SETUP_KEY));
}

export function saveLastSetup(setup: BattleSetup, store: KeyValueStore = browserStore): void {
  store.set(SETUP_KEY, JSON.stringify(setup));
}
