import { describe, expect, it } from 'vitest';
import { createBattle, endTurn, playCard } from '../src/engine/battle';
import { isBattleState, validateBattleState } from '../src/engine/validate';
import type { BattleState } from '../src/engine/types';
import { SAVE_KEY, clearSave, emptyStats, loadSave, saveBattle } from '../src/persistence/save';
import type { KeyValueStore } from '../src/persistence/storage';
import { DEFAULT_SETTINGS, loadSettings, sanitizeSettings, saveSettings } from '../src/settings/settings';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    get: (k) => (k in data ? data[k]! : null),
    set: (k, v) => {
      data[k] = v;
      return true;
    },
    remove: (k) => {
      delete data[k];
    },
  };
}

function midBattle(): BattleState {
  let state = createBattle(11).state;
  const card = state.combatants.player.hand[0]!;
  const r = playCard(state, 'player', card.instanceId);
  if (r.ok) state = r.state;
  const e = endTurn(state, 'player');
  if (!e.ok) throw new Error('endTurn failed');
  return e.state;
}

describe('battle state validation', () => {
  it('accepts fresh and mid-battle states (including after a JSON round trip)', () => {
    expect(validateBattleState(createBattle(1).state)).toEqual([]);
    expect(validateBattleState(JSON.parse(JSON.stringify(midBattle())))).toEqual([]);
  });

  const cases: Array<[string, (s: BattleState) => void]> = [
    ['hp above max', (s) => (s.combatants.player.hp = 99)],
    ['negative block', (s) => (s.combatants.bot.block = -1)],
    ['unknown card', (s) => (s.combatants.player.hand[0]!.definitionId = 'mega_nuke')],
    ['duplicate instance id', (s) => (s.combatants.player.hand[1]!.instanceId = s.combatants.player.hand[0]!.instanceId)],
    ['transient phase', (s) => (s.phase = 'TURN_START')],
    ['phase/side mismatch', (s) => (s.activeSide = 'bot')],
    ['winner without GAME_OVER', (s) => (s.winner = 'player')],
    ['missing rules field', (s) => delete (s.rules as Partial<BattleState['rules']>).handLimit],
    ['hand above limit', (s) => (s.rules.handLimit = 2)],
    ['fractional energy', (s) => (s.combatants.player.energy = 1.5)],
  ];
  for (const [name, mutate] of cases) {
    it(`rejects: ${name}`, () => {
      const s = structuredClone(createBattle(1).state);
      mutate(s);
      expect(isBattleState(s)).toBe(false);
    });
  }

  it('rejects non-objects', () => {
    expect(isBattleState(null)).toBe(false);
    expect(isBattleState('battle')).toBe(false);
    expect(isBattleState([])).toBe(false);
  });
});

describe('save / resume', () => {
  it('round-trips a battle and its stats', () => {
    const store = memoryStore();
    const battle = midBattle();
    const stats = { ...emptyStats(), cardsPlayed: { player: 1, bot: 0 } };
    expect(saveBattle(battle, stats, store)).toBe(true);
    const loaded = loadSave(store);
    expect(loaded?.battle).toEqual(battle);
    expect(loaded?.stats).toEqual(stats);
  });

  it('a resumed battle continues identically (same RNG state)', () => {
    const store = memoryStore();
    const battle = midBattle();
    saveBattle(battle, emptyStats(), store);
    const loaded = loadSave(store)!.battle;
    const a = endTurn(battle, 'bot');
    const b = endTurn(loaded, 'bot');
    expect(a).toEqual(b);
  });

  it('discards corrupt JSON, wrong schema, invalid state, and finished battles', () => {
    const finished = structuredClone(createBattle(1).state);
    finished.phase = 'GAME_OVER';
    finished.winner = 'player';
    const bad = structuredClone(createBattle(1).state);
    bad.combatants.player.hp = 500;
    const inputs = [
      '{not json',
      JSON.stringify({ schema: 99, battle: createBattle(1).state }),
      JSON.stringify({ schema: 1, battle: bad }),
      JSON.stringify({ schema: 1, battle: finished }),
    ];
    for (const raw of inputs) {
      const store = memoryStore({ [SAVE_KEY]: raw });
      expect(loadSave(store)).toBeNull();
      expect(store.data[SAVE_KEY]).toBeUndefined();
    }
  });

  it('falls back to empty stats if stats are malformed', () => {
    const store = memoryStore({ [SAVE_KEY]: JSON.stringify({ schema: 1, battle: createBattle(1).state, stats: 'x' }) });
    expect(loadSave(store)?.stats).toEqual(emptyStats());
  });

  it('clearSave removes the slot; a throwing store does not crash', () => {
    const store = memoryStore();
    saveBattle(createBattle(1).state, emptyStats(), store);
    clearSave(store);
    expect(loadSave(store)).toBeNull();
    const throwing: KeyValueStore = {
      get: () => null,
      set: () => false,
      remove: () => undefined,
    };
    expect(saveBattle(createBattle(1).state, emptyStats(), throwing)).toBe(false);
    expect(loadSave(throwing)).toBeNull();
  });
});

describe('settings', () => {
  it('sanitizes unknown or out-of-range values to defaults', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ botSpeed: 'warp', soundEnabled: 'yes', volume: 7, motion: 'wild' })).toEqual({
      ...DEFAULT_SETTINGS,
      volume: 1,
    });
  });

  it('persists and reloads', () => {
    const store = memoryStore();
    const next = { botSpeed: 'fast' as const, soundEnabled: false, volume: 0.25, motion: 'reduced' as const };
    saveSettings(next, store);
    expect(loadSettings(store)).toEqual(next);
  });
});
