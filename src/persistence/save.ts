/**
 * Battle save/resume. One save slot, versioned. Anything that fails validation
 * is discarded rather than loaded.
 */
import { DEFAULT_SETUP, sanitizeSetup, type BattleSetup } from '../content/setup';
import { isBattleState } from '../engine/validate';
import type { BattleState } from '../engine/types';
import { browserStore, readJson, type KeyValueStore } from './storage';

export const SAVE_KEY = 'rune-duel/save';
export const SAVE_SCHEMA = 1;

/** Presentation-only match statistics, shown on the result screen. */
export interface MatchStats {
  damageDealt: { player: number; bot: number };
  cardsPlayed: { player: number; bot: number };
  healed: { player: number; bot: number };
}

export function emptyStats(): MatchStats {
  return {
    damageDealt: { player: 0, bot: 0 },
    cardsPlayed: { player: 0, bot: 0 },
    healed: { player: 0, bot: 0 },
  };
}

export interface SaveFile {
  schema: typeof SAVE_SCHEMA;
  savedAt: string;
  battle: BattleState;
  stats: MatchStats;
  /** Added in Milestone 3; older saves default to the starter setup. */
  setup: BattleSetup;
}

function isSide2(v: unknown): v is { player: number; bot: number } {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.player === 'number' && typeof r.bot === 'number';
}

function isStats(v: unknown): v is MatchStats {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return isSide2(r.damageDealt) && isSide2(r.cardsPlayed) && isSide2(r.healed);
}

export function saveBattle(
  battle: BattleState,
  stats: MatchStats,
  store: KeyValueStore = browserStore,
  setup: BattleSetup = DEFAULT_SETUP,
): boolean {
  const file: SaveFile = { schema: SAVE_SCHEMA, savedAt: new Date().toISOString(), battle, stats, setup };
  return store.set(SAVE_KEY, JSON.stringify(file));
}

/** Returns a resumable save, or null. Finished or invalid saves are removed. */
export function loadSave(store: KeyValueStore = browserStore): SaveFile | null {
  if (store.get(SAVE_KEY) === null) return null;
  const data = readJson(store, SAVE_KEY);
  if (data === null) {
    store.remove(SAVE_KEY); // unreadable JSON
    return null;
  }
  const file = data as Partial<SaveFile>;
  if (file.schema !== SAVE_SCHEMA || !isBattleState(file.battle) || file.battle.phase === 'GAME_OVER') {
    store.remove(SAVE_KEY);
    return null;
  }
  return {
    schema: SAVE_SCHEMA,
    savedAt: typeof file.savedAt === 'string' ? file.savedAt : '',
    battle: file.battle,
    stats: isStats(file.stats) ? file.stats : emptyStats(),
    setup: sanitizeSetup(file.setup),
  };
}

export function clearSave(store: KeyValueStore = browserStore): void {
  store.remove(SAVE_KEY);
}
