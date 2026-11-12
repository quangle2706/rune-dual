/**
 * Personal match records (wins/losses/draws per deck × opponent), stored only in
 * this browser. Used to compare real play with the bot-vs-bot simulations.
 */
import type { BattleSetup } from '../content/setup';
import type { Winner } from '../engine/types';
import { browserStore, readJson, type KeyValueStore } from './storage';

export const RECORDS_KEY = 'rune-duel/records';

export interface MatchupRecord {
  wins: number;
  losses: number;
  draws: number;
}

export interface RecordsFile {
  /** Keyed by `${playerDeckId}|${opponentId}`. */
  matchups: Record<string, MatchupRecord>;
  /** Tokens of recently recorded battles, to avoid counting one battle twice. */
  recent: string[];
}

const RECENT_LIMIT = 30;

export function recordKey(setup: BattleSetup): string {
  return `${setup.playerDeckId}|${setup.opponentId}`;
}

function emptyRecords(): RecordsFile {
  return { matchups: {}, recent: [] };
}

function isCount(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

export function loadRecords(store: KeyValueStore = browserStore): RecordsFile {
  const data = readJson(store, RECORDS_KEY);
  if (typeof data !== 'object' || data === null) return emptyRecords();
  const raw = data as Record<string, unknown>;
  const out = emptyRecords();
  if (typeof raw.matchups === 'object' && raw.matchups !== null) {
    for (const [key, value] of Object.entries(raw.matchups as Record<string, unknown>)) {
      const r = value as Record<string, unknown>;
      if (isCount(r?.wins) && isCount(r?.losses) && isCount(r?.draws)) {
        out.matchups[key] = { wins: r.wins, losses: r.losses, draws: r.draws };
      }
    }
  }
  if (Array.isArray(raw.recent)) out.recent = raw.recent.filter((t): t is string => typeof t === 'string').slice(-RECENT_LIMIT);
  return out;
}

/**
 * Records a finished battle once. `token` identifies the battle (e.g. seed and
 * final turn); a token seen recently is ignored. Returns true if recorded.
 */
export function recordResult(
  setup: BattleSetup,
  winner: Exclude<Winner, null>,
  token: string,
  store: KeyValueStore = browserStore,
): boolean {
  const records = loadRecords(store);
  if (records.recent.includes(token)) return false;
  const key = recordKey(setup);
  const r = records.matchups[key] ?? { wins: 0, losses: 0, draws: 0 };
  if (winner === 'player') r.wins += 1;
  else if (winner === 'bot') r.losses += 1;
  else r.draws += 1;
  records.matchups[key] = r;
  records.recent = [...records.recent, token].slice(-RECENT_LIMIT);
  return store.set(RECORDS_KEY, JSON.stringify(records));
}

export function clearRecords(store: KeyValueStore = browserStore): void {
  store.remove(RECORDS_KEY);
}

export function totals(records: RecordsFile): MatchupRecord & { played: number } {
  const t = { wins: 0, losses: 0, draws: 0, played: 0 };
  for (const r of Object.values(records.matchups)) {
    t.wins += r.wins;
    t.losses += r.losses;
    t.draws += r.draws;
  }
  t.played = t.wins + t.losses + t.draws;
  return t;
}
