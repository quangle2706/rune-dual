import { describe, expect, it } from 'vitest';
import { chooseBotAction } from '../src/bot/decide';
import { MAX_ACTIONS_PER_TURN, runBotTurn } from '../src/bot/runner';
import { buildBotView } from '../src/bot/view';
import { createBattle, endTurn, getPlayRejection } from '../src/engine/battle';
import type { BattleState } from '../src/engine/types';
import { makeState } from './helpers';

/** Hands the turn to the bot with the given patch applied after its turn start. */
function botTurn(patch: NonNullable<Parameters<typeof makeState>[0]>): BattleState {
  const base = makeState({});
  const r = endTurn(base, 'player');
  if (!r.ok) throw new Error('endTurn failed');
  const state = structuredClone(r.state);
  const patched = makeState(patch);
  for (const side of ['player', 'bot'] as const) {
    const p = patch[side];
    if (!p) continue;
    const src = patched.combatants[side];
    const dst = state.combatants[side];
    for (const key of Object.keys(p) as (keyof typeof src)[]) {
      (dst as unknown as Record<string, unknown>)[key] = structuredClone(src[key]);
    }
  }
  return state;
}

function chosenCard(state: BattleState): string | null {
  const d = chooseBotAction(buildBotView(state, 'bot'));
  if (!d || d.type !== 'play') return null;
  return state.combatants.bot.hand.find((c) => c.instanceId === d.instanceId)?.definitionId ?? null;
}

describe('bot view hides private information', () => {
  it('does not expose the player hand, deck order, or rng', () => {
    const state = createBattle(5).state;
    const view = buildBotView(state, 'bot');
    const json = JSON.stringify(view);
    for (const c of [...state.combatants.player.hand, ...state.combatants.player.deck, ...state.combatants.bot.deck]) {
      expect(json).not.toContain(`"${c.instanceId}"`);
    }
    expect(json).not.toContain('rngState');
    expect(view.opponent.handCount).toBe(5);
  });
});

describe('bot decisions', () => {
  it('returns null when it is not the bot turn', () => {
    expect(chooseBotAction(buildBotView(createBattle(1).state, 'bot'))).toBeNull();
  });

  it('prefers a lethal attack', () => {
    const state = botTurn({ player: { hp: 6, block: 0 }, bot: { hand: ['guard', 'mend', 'strike'], hp: 10 } });
    const d = chooseBotAction(buildBotView(state, 'bot'));
    expect(d?.type === 'play' && d.reason).toBe('lethal');
    expect(chosenCard(state)).toBe('strike');
  });

  it('accounts for player block when checking lethal', () => {
    const state = botTurn({ player: { hp: 6, block: 6 }, bot: { hand: ['strike', 'strike', 'guard'], energy: 3 } });
    const d = chooseBotAction(buildBotView(state, 'bot'));
    expect(d?.type === 'play' && d.reason).toBe('lethal');
  });

  it('cleanses significant burn', () => {
    const state = botTurn({ bot: { hand: ['strike', 'cleanse', 'guard'], burn: 4 } });
    expect(chosenCard(state)).toBe('cleanse');
  });

  it('heals when badly injured', () => {
    const state = botTurn({ bot: { hand: ['mend', 'quick_cut'], hp: 9, block: 20 } });
    expect(chosenCard(state)).toBe('mend');
  });

  it('blocks when low on HP and unprotected', () => {
    const state = botTurn({ bot: { hand: ['fortify', 'quick_cut'], hp: 8, block: 0 } });
    expect(chosenCard(state)).toBe('fortify');
  });

  it('does not play desperate_blow when it would kill itself', () => {
    const state = botTurn({ bot: { hand: ['desperate_blow'], hp: 2 } });
    const d = chooseBotAction(buildBotView(state, 'bot'));
    expect(d?.type).toBe('endTurn');
  });

  it('ends turn when out of energy', () => {
    const state = botTurn({ bot: { hand: ['strike', 'heavy_strike'], energy: 0 } });
    expect(chooseBotAction(buildBotView(state, 'bot'))).toEqual({ type: 'endTurn', reason: 'noEnergy' });
  });

  it('only ever chooses legal actions across many seeded games', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let state = createBattle(seed).state;
      for (let guard = 0; guard < 400 && state.winner === null; guard++) {
        const side = state.activeSide;
        const d = chooseBotAction(buildBotView(state, side));
        expect(d).not.toBeNull();
        if (d!.type === 'play') {
          expect(getPlayRejection(state, side, d!.instanceId)).toBeNull();
        }
        state = runBotTurn(state, side).state;
      }
      expect(state.winner).not.toBeNull();
    }
  });
});

describe('bot turn runner', () => {
  it('ends its turn without looping and returns control to the player', () => {
    const state = botTurn({});
    const result = runBotTurn(state, 'bot');
    expect(result.actions).toBeGreaterThan(0);
    expect(result.actions).toBeLessThanOrEqual(MAX_ACTIONS_PER_TURN + 1);
    if (result.state.winner === null) {
      expect(result.state.activeSide).toBe('player');
      expect(result.state.phase).toBe('PLAYER_ACTION');
    }
  });

  it('is deterministic for the same state', () => {
    const state = botTurn({});
    expect(runBotTurn(state, 'bot')).toEqual(runBotTurn(state, 'bot'));
  });

  it('enforces the action cap even with a huge hand of free cards', () => {
    const state = botTurn({ bot: { hand: Array<string>(40).fill('quick_cut') }, player: { hp: 999, maxHp: 999, block: 0 } });
    const result = runBotTurn(state, 'bot');
    expect(result.actions).toBe(MAX_ACTIONS_PER_TURN + 1);
    expect(result.state.activeSide).toBe('player');
  });
});
