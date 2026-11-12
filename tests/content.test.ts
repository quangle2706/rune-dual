import { describe, expect, it } from 'vitest';
import { DEFAULT_BOT_PROFILE, chooseBotAction, estimateIncomingDamage } from '../src/bot/decide';
import { buildBotView } from '../src/bot/view';
import { findCardDefinition } from '../src/content/cards';
import { DECKS, DECK_SIZE, buildDeck, recipeSize } from '../src/content/decks';
import { OPPONENTS, findOpponent } from '../src/content/opponents';
import { DEFAULT_SETUP, decksForSetup, sanitizeSetup } from '../src/content/setup';
import { BASE_RULES, createBattle, endTurn, getPlayRejection, playCard } from '../src/engine/battle';
import { seedRange, simulateMatchups } from '../src/sim/simulate';
import { makeState } from './helpers';

describe('decks and opponents', () => {
  it('every deck has 20 cards, known card ids, and unique instance ids', () => {
    for (const deck of DECKS) {
      expect(recipeSize(deck.recipe), deck.id).toBe(DECK_SIZE);
      for (const [id] of deck.recipe) expect(findCardDefinition(id), id).toBeDefined();
      const built = buildDeck('player', deck.recipe);
      expect(new Set(built.map((c) => c.instanceId)).size).toBe(DECK_SIZE);
    }
  });

  it('every opponent references an existing deck and a complete profile', () => {
    for (const o of OPPONENTS) {
      expect(DECKS.some((d) => d.id === o.deckId), o.id).toBe(true);
      expect(Object.keys(o.profile).sort()).toEqual(Object.keys(DEFAULT_BOT_PROFILE).sort());
    }
    expect(new Set(OPPONENTS.map((o) => o.id)).size).toBe(OPPONENTS.length);
  });

  it('createBattle uses the given decks for each side', () => {
    const decks = decksForSetup({ playerDeckId: 'burn', opponentId: 'golem' });
    const s = createBattle(5, BASE_RULES, decks).state;
    const all = (side: 'player' | 'bot') => {
      const c = s.combatants[side];
      return [...c.deck, ...c.hand, ...c.discard].map((x) => x.definitionId);
    };
    expect(all('player').filter((id) => id === 'ember')).toHaveLength(3);
    expect(all('bot').filter((id) => id === 'shield_bash')).toHaveLength(7);
  });

  it('sanitizeSetup replaces unknown ids', () => {
    expect(sanitizeSetup({ playerDeckId: 'nope', opponentId: 'golem' })).toEqual({ ...DEFAULT_SETUP, opponentId: 'golem' });
    expect(sanitizeSetup(42)).toEqual(DEFAULT_SETUP);
  });
});

describe('adaptive incoming-damage estimate', () => {
  it('uses the profile prior when there is no opponent history', () => {
    expect(estimateIncomingDamage(buildBotView(createBattle(1).state, 'bot'))).toBe(10);
    const s = endTurn(makeState({}), 'player');
    if (!s.ok) throw new Error('endTurn failed');
    // The player's turn 1 dealt nothing → observed 0 → 0.4 × 10.
    expect(estimateIncomingDamage(buildBotView(s.state, 'bot'))).toBeCloseTo(4);
  });

  it('rises when the opponent actually attacks', () => {
    const state = makeState({ player: { hand: ['heavy_strike'] } });
    const r = playCard(state, 'player', state.combatants.player.hand[0]!.instanceId);
    if (!r.ok) throw new Error(r.reason);
    const e = endTurn(r.state, 'player');
    if (!e.ok) throw new Error(e.reason);
    expect(estimateIncomingDamage(buildBotView(e.state, 'bot'))).toBeCloseTo(0.4 * 10 + 0.6 * 11);
  });

  it('archetype bots only choose legal actions and every game finishes', () => {
    for (const o of OPPONENTS) {
      for (let seed = 1; seed <= 10; seed++) {
        let state = createBattle(seed, undefined, decksForSetup({ playerDeckId: 'balanced', opponentId: o.id })).state;
        for (let i = 0; i < 400 && state.winner === null; i++) {
          const side = state.activeSide;
          const profile = side === 'bot' ? findOpponent(o.id)!.profile : DEFAULT_BOT_PROFILE;
          const d = chooseBotAction(buildBotView(state, side), profile);
          expect(d).not.toBeNull();
          if (d!.type === 'play') expect(getPlayRejection(state, side, d!.instanceId)).toBeNull();
          const result = d!.type === 'play' ? playCard(state, side, d!.instanceId) : endTurn(state, side);
          if (!result.ok) throw new Error(result.reason);
          state = result.state;
        }
        expect(state.winner).not.toBeNull();
      }
    }
  });
});

describe('matchup simulation', () => {
  it('is deterministic and finishes every game', () => {
    const run = () => simulateMatchups({ seeds: seedRange(8), playerDeckIds: ['balanced', 'fortress'] });
    const a = run();
    expect(a).toHaveLength(2 * OPPONENTS.length);
    expect(a).toEqual(run());
    expect(a.every((r) => r.unfinished === 0)).toBe(true);
  });
});
