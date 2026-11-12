import { describe, expect, it } from 'vitest';
import { CARD_DEFINITIONS } from '../src/content/cards';
import { buildStarterDeck } from '../src/content/decks';
import {
  BASE_RULES,
  DEFAULT_RULES,
  HAND_LIMIT,
  LOG_LIMIT,
  createBattle,
  endTurn,
  outcomeFor,
  playCard,
} from '../src/engine/battle';
import type { BattleState, CommandResult } from '../src/engine/types';
import { handIds, makeState } from './helpers';

function ok(result: CommandResult): BattleState {
  if (!result.ok) throw new Error(`Expected success, got ${result.reason}`);
  return result.state;
}

function firstInHand(state: BattleState, definitionId: string, side: 'player' | 'bot' = 'player'): string {
  const c = state.combatants[side].hand.find((h) => h.definitionId === definitionId);
  if (!c) throw new Error(`No ${definitionId} in ${side} hand`);
  return c.instanceId;
}

describe('setup and decks', () => {
  it('has thirteen card definitions (12 original + Lá chắn gai) with unique ids', () => {
    expect(CARD_DEFINITIONS).toHaveLength(13);
    expect(new Set(CARD_DEFINITIONS.map((c) => c.id)).size).toBe(13);
  });

  it('builds a 20-card starter deck: 5 strike, 5 guard, 1 of each other card', () => {
    const deck = buildStarterDeck('player');
    expect(deck).toHaveLength(20);
    const counts: Record<string, number> = {};
    for (const c of deck) counts[c.definitionId] = (counts[c.definitionId] ?? 0) + 1;
    expect(counts.strike).toBe(5);
    expect(counts.guard).toBe(5);
    for (const def of CARD_DEFINITIONS.filter((d) => !['strike', 'guard', 'thorn_shield'].includes(d.id))) {
      expect(counts[def.id]).toBe(1);
    }
  });

  it('gives every card instance in a battle a unique id', () => {
    const { state } = createBattle(7);
    const all = (['player', 'bot'] as const).flatMap((s) => {
      const c = state.combatants[s];
      return [...c.deck, ...c.hand, ...c.discard];
    });
    expect(all).toHaveLength(40);
    expect(new Set(all.map((c) => c.instanceId)).size).toBe(40);
  });

  it('starts on the player turn with 5 cards, 3 energy, 30 HP (base rules)', () => {
    const { state } = createBattle(1, BASE_RULES);
    expect(state.phase).toBe('PLAYER_ACTION');
    expect(state.activeSide).toBe('player');
    expect(state.turnNumber).toBe(1);
    expect(state.combatants.player.hand).toHaveLength(5);
    expect(state.combatants.player.deck).toHaveLength(15);
    expect(state.combatants.player.energy).toBe(3);
    expect(state.combatants.player.hp).toBe(30);
    expect(state.combatants.bot.hand).toHaveLength(0);
  });
});

describe('first-turn balance rules', () => {
  it('default rules: first player gets 2 energy on turn 1, second player 4 on its first turn, then 3', () => {
    let state = createBattle(3).state;
    expect(state.rules).toEqual(DEFAULT_RULES);
    expect(state.combatants.player.energy).toBe(2);
    state = ok(endTurn(state, 'player'));
    expect(state.combatants.bot.energy).toBe(4);
    state = ok(endTurn(state, 'bot'));
    expect(state.combatants.player.energy).toBe(3);
    state = ok(endTurn(state, 'player'));
    expect(state.combatants.bot.energy).toBe(3);
  });

  it('first-turn draw target and second-player draw bonus are configurable', () => {
    const rules = { ...BASE_RULES, firstTurnDrawTarget: 3, secondPlayerFirstTurnDrawBonus: 1 };
    let state = createBattle(3, rules).state;
    expect(state.combatants.player.hand).toHaveLength(3);
    state = ok(endTurn(state, 'player'));
    expect(state.combatants.bot.hand).toHaveLength(6);
    state = ok(endTurn(state, 'bot'));
    expect(state.combatants.player.hand).toHaveLength(5);
  });

  it('max HP comes from the rules', () => {
    const state = createBattle(3, { ...BASE_RULES, maxHp: 40 }).state;
    expect(state.combatants.player.hp).toBe(40);
    expect(state.combatants.bot.maxHp).toBe(40);
  });
});

describe('seeded reproducibility', () => {
  function replay(seed: number): BattleState {
    let state = createBattle(seed).state;
    for (let turn = 0; turn < 6 && state.winner === null; turn++) {
      const side = state.activeSide;
      const affordable = state.combatants[side].hand.find((c) => c.definitionId !== 'desperate_blow');
      if (affordable) {
        const r = playCard(state, side, affordable.instanceId);
        if (r.ok) state = r.state;
      }
      state = ok(endTurn(state, side));
    }
    return state;
  }

  it('same seed and commands produce identical battles', () => {
    expect(replay(1234)).toEqual(replay(1234));
  });

  it('different seeds produce different shuffles', () => {
    expect(handIds(createBattle(1).state, 'player')).not.toEqual(handIds(createBattle(2).state, 'player'));
  });
});

describe('card play validation', () => {
  it('plays a legal card: removes it from hand, spends energy, discards after resolving', () => {
    const state = makeState({ player: { hand: ['strike', 'guard'] } });
    const id = firstInHand(state, 'strike');
    const next = ok(playCard(state, 'player', id));
    expect(next.combatants.player.hand.map((c) => c.instanceId)).not.toContain(id);
    expect(next.combatants.player.energy).toBe(2);
    expect(next.combatants.player.discard.at(-1)?.instanceId).toBe(id);
    expect(next.combatants.bot.hp).toBe(24);
  });

  it('rejects playing on the opponent turn', () => {
    const state = makeState({ bot: { hand: ['strike'] } });
    const r = playCard(state, 'bot', state.combatants.bot.hand[0]!.instanceId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('notYourTurn');
  });

  it('rejects a card that is not in hand (including opponent cards)', () => {
    const state = makeState({ bot: { hand: ['strike'] } });
    const r = playCard(state, 'player', state.combatants.bot.hand[0]!.instanceId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('cardNotInHand');
  });

  it('rejects when energy is insufficient', () => {
    const state = makeState({ player: { hand: ['heavy_strike'], energy: 1 } });
    const r = playCard(state, 'player', firstInHand(state, 'heavy_strike'));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('notEnoughEnergy');
      expect(r.message).toBe('Không đủ Năng lượng.');
    }
  });

  it('rejects commands after the battle is over', () => {
    const state = makeState({ player: { hand: ['strike'] } });
    state.winner = 'player';
    state.phase = 'GAME_OVER';
    const r = playCard(state, 'player', firstInHand(state, 'strike'));
    expect(!r.ok && r.reason).toBe('battleOver');
    const e = endTurn(state, 'player');
    expect(!e.ok && e.reason).toBe('battleOver');
  });

  it('rejected commands do not mutate state or consume randomness', () => {
    const state = makeState({ player: { hand: ['heavy_strike', 'insight'], energy: 1, deck: [] } });
    const snapshot = structuredClone(state);
    const rejections = [
      playCard(state, 'player', firstInHand(state, 'heavy_strike')),
      playCard(state, 'player', 'nope'),
      playCard(state, 'bot', firstInHand(state, 'insight')),
      endTurn(state, 'bot'),
    ];
    for (const r of rejections) {
      expect(r.ok).toBe(false);
      expect(r.state).toBe(state); // same object returned
    }
    expect(state).toEqual(snapshot);
  });

  it('valid commands do not mutate the input state', () => {
    const state = makeState({ player: { hand: ['strike'] } });
    const snapshot = structuredClone(state);
    ok(playCard(state, 'player', firstInHand(state, 'strike')));
    ok(endTurn(state, 'player'));
    expect(state).toEqual(snapshot);
  });

  it('0-cost cards can be played with 0 energy', () => {
    const state = makeState({ player: { hand: ['quick_cut'], energy: 0 } });
    const next = ok(playCard(state, 'player', firstInHand(state, 'quick_cut')));
    expect(next.combatants.bot.hp).toBe(28);
    expect(next.combatants.player.energy).toBe(0);
  });
});

describe('block and damage', () => {
  it('damage consumes block first, then HP; block never negative', () => {
    const state = makeState({ player: { hand: ['heavy_strike'] }, bot: { block: 5 } });
    const next = ok(playCard(state, 'player', firstInHand(state, 'heavy_strike')));
    expect(next.combatants.bot.block).toBe(0);
    expect(next.combatants.bot.hp).toBe(24);
  });

  it('block fully absorbs smaller hits', () => {
    const state = makeState({ player: { hand: ['strike'] }, bot: { block: 10 } });
    const next = ok(playCard(state, 'player', firstInHand(state, 'strike')));
    expect(next.combatants.bot.block).toBe(4);
    expect(next.combatants.bot.hp).toBe(30);
  });

  it('block persists through the opponent turn and is cleared at its owner next turn start', () => {
    let state = makeState({ player: { hand: ['fortify'] }, bot: { deck: ['strike', 'strike', 'strike', 'strike', 'strike'] } });
    state = ok(playCard(state, 'player', firstInHand(state, 'fortify')));
    expect(state.combatants.player.block).toBe(12);
    state = ok(endTurn(state, 'player'));
    expect(state.combatants.player.block).toBe(12); // still there during bot turn
    state = ok(playCard(state, 'bot', firstInHand(state, 'strike', 'bot')));
    expect(state.combatants.player.block).toBe(6);
    expect(state.combatants.player.hp).toBe(30);
    state = ok(endTurn(state, 'bot'));
    expect(state.combatants.player.block).toBe(0); // cleared at player turn start
  });

  it('HP never drops below 0', () => {
    const state = makeState({ player: { hand: ['heavy_strike'] }, bot: { hp: 3 } });
    const next = ok(playCard(state, 'player', firstInHand(state, 'heavy_strike')));
    expect(next.combatants.bot.hp).toBe(0);
  });
});

describe('healing', () => {
  it('cannot exceed max HP', () => {
    const state = makeState({ player: { hand: ['mend'], hp: 28 } });
    const next = ok(playCard(state, 'player', firstInHand(state, 'mend')));
    expect(next.combatants.player.hp).toBe(30);
    const healed = next.log.find((e) => e.type === 'healed');
    expect(healed && healed.type === 'healed' && healed.amount).toBe(2);
  });
});

describe('burn', () => {
  it('applies stacks to the opponent', () => {
    const state = makeState({ player: { hand: ['ember'] }, bot: { burn: 2 } });
    const next = ok(playCard(state, 'player', firstInHand(state, 'ember')));
    expect(next.combatants.bot.burn).toBe(5);
  });

  it('ticks at the afflicted side turn start, bypasses block, then decays by 1', () => {
    const state = makeState({ bot: { burn: 3, block: 10, hp: 20 } });
    const next = ok(endTurn(state, 'player'));
    const bot = next.combatants.bot;
    expect(bot.hp).toBe(17);
    const tick = next.log.find((e) => e.type === 'burnTicked');
    expect(tick && tick.type === 'burnTicked' && tick.damage).toBe(3);
    expect(bot.burn).toBe(2);
  });

  it('a burn tick can end the battle before energy refill and draw', () => {
    const state = makeState({ bot: { burn: 5, hp: 5 } });
    const next = ok(endTurn(state, 'player'));
    expect(next.winner).toBe('player');
    expect(next.phase).toBe('GAME_OVER');
    expect(next.combatants.bot.hand).toHaveLength(0);
    expect(next.log.some((e) => e.type === 'cardDrawn' && e.side === 'bot')).toBe(false);
  });

  it('cleanse removes burn first, then heals 2', () => {
    const state = makeState({ player: { hand: ['cleanse'], burn: 4, hp: 20 } });
    const next = ok(playCard(state, 'player', firstInHand(state, 'cleanse')));
    expect(next.combatants.player.burn).toBe(0);
    expect(next.combatants.player.hp).toBe(22);
    const types = next.log.filter((e) => e.type === 'burnRemoved' || e.type === 'healed').map((e) => e.type);
    expect(types).toEqual(['burnRemoved', 'healed']);
  });
});

describe('multi-step effects', () => {
  it('twin_strike resolves as two separate hits', () => {
    const state = makeState({ player: { hand: ['twin_strike'] }, bot: { block: 3 } });
    const result = playCard(state, 'player', firstInHand(state, 'twin_strike'));
    const next = ok(result);
    const hits = result.ok ? result.events.filter((e) => e.type === 'damageDealt') : [];
    expect(hits).toHaveLength(2);
    expect(hits.map((h) => (h.type === 'damageDealt' ? [h.blocked, h.hpLoss] : null))).toEqual([
      [3, 1],
      [0, 4],
    ]);
    expect(next.combatants.bot.hp).toBe(25);
  });

  it('shield_bash gains block, then deals damage', () => {
    const state = makeState({ player: { hand: ['shield_bash'] } });
    const result = playCard(state, 'player', firstInHand(state, 'shield_bash'));
    const next = ok(result);
    expect(next.combatants.player.block).toBe(3);
    expect(next.combatants.bot.hp).toBe(27);
    const order = result.ok ? result.events.map((e) => e.type).filter((t) => t === 'blockGained' || t === 'damageDealt') : [];
    expect(order).toEqual(['blockGained', 'damageDealt']);
  });

  it('desperate_blow: self-damage that defeats the user stops the attack', () => {
    const state = makeState({ player: { hand: ['desperate_blow'], hp: 2 }, bot: { hp: 5 } });
    const result = playCard(state, 'player', firstInHand(state, 'desperate_blow'));
    const next = ok(result);
    expect(next.combatants.player.hp).toBe(0);
    expect(next.combatants.bot.hp).toBe(5);
    expect(next.winner).toBe('bot');
    expect(result.ok && result.events.some((e) => e.type === 'damageDealt')).toBe(false);
    expect(next.combatants.player.discard.at(-1)?.definitionId).toBe('desperate_blow');
  });

  it('desperate_blow self-damage bypasses block', () => {
    const state = makeState({ player: { hand: ['desperate_blow'], block: 5 } });
    const next = ok(playCard(state, 'player', firstInHand(state, 'desperate_blow')));
    expect(next.combatants.player.hp).toBe(28);
    expect(next.combatants.player.block).toBe(5);
    expect(next.combatants.bot.hp).toBe(20);
  });

  it('thorn_shield gains block, then deals damage equal to total block (block not spent)', () => {
    const state = makeState({ player: { hand: ['thorn_shield'], block: 6 }, bot: { block: 3 } });
    const result = playCard(state, 'player', firstInHand(state, 'thorn_shield'));
    const next = ok(result);
    expect(next.combatants.player.block).toBe(8);
    expect(next.combatants.bot.block).toBe(0);
    expect(next.combatants.bot.hp).toBe(25); // 8 damage, 3 absorbed
  });

  it('thorn_shield with no prior block deals 2', () => {
    const state = makeState({ player: { hand: ['thorn_shield'] } });
    const next = ok(playCard(state, 'player', firstInHand(state, 'thorn_shield')));
    expect(next.combatants.bot.hp).toBe(28);
  });

  it('victory stops subsequent effects (first twin_strike hit kills)', () => {
    const state = makeState({ player: { hand: ['twin_strike'] }, bot: { hp: 3 } });
    const result = playCard(state, 'player', firstInHand(state, 'twin_strike'));
    const next = ok(result);
    expect(next.winner).toBe('player');
    expect(next.phase).toBe('GAME_OVER');
    expect(result.ok && result.events.filter((e) => e.type === 'damageDealt')).toHaveLength(1);
    expect(result.ok && result.events.at(-1)?.type).toBe('battleEnded');
  });

  it('draw is the outcome when both reach 0 in the same atomic step', () => {
    expect(outcomeFor(0, 0)).toBe('draw');
    expect(outcomeFor(0, 5)).toBe('bot');
    expect(outcomeFor(5, 0)).toBe('player');
    expect(outcomeFor(5, 5)).toBe(null);
  });
});

describe('drawing, hand limit and reshuffle', () => {
  it('insight draws 2', () => {
    const state = makeState({ player: { hand: ['insight'], deck: ['strike', 'guard', 'mend'] } });
    const next = ok(playCard(state, 'player', firstInHand(state, 'insight')));
    expect(handIds(next, 'player')).toEqual(['strike', 'guard']);
    expect(next.combatants.player.deck).toHaveLength(1);
  });

  it('draw effects stop at the hand limit without removing cards from the deck', () => {
    const hand = ['insight', ...Array<string>(HAND_LIMIT).fill('guard')];
    const state = makeState({ player: { hand, deck: ['strike', 'strike', 'strike'] } });
    // Hand has 9 here only because the helper bypasses rules; after playing insight it is 8 (full).
    const next = ok(playCard(state, 'player', firstInHand(state, 'insight')));
    expect(next.combatants.player.hand).toHaveLength(HAND_LIMIT);
    expect(next.combatants.player.deck).toHaveLength(3);
    expect(next.log.some((e) => e.type === 'drawSkipped' && e.reason === 'handFull')).toBe(true);
  });

  it('draw effects fill only up to the limit', () => {
    const hand = ['insight', ...Array<string>(HAND_LIMIT - 2).fill('guard')];
    const state = makeState({ player: { hand, deck: ['strike', 'strike', 'strike'] } });
    const next = ok(playCard(state, 'player', firstInHand(state, 'insight')));
    expect(next.combatants.player.hand).toHaveLength(HAND_LIMIT);
    expect(next.combatants.player.deck).toHaveLength(1);
  });

  it('turn start does not draw if the hand already has 5+ cards', () => {
    const state = makeState({ bot: { hand: ['guard', 'guard', 'guard', 'guard', 'guard', 'guard'] } });
    const next = ok(endTurn(state, 'player'));
    expect(next.combatants.bot.hand).toHaveLength(6);
  });

  it('reshuffles the discard pile when the deck is empty', () => {
    const state = makeState({
      player: { hand: ['insight'], deck: ['mend'], discard: ['strike', 'guard', 'ember'] },
    });
    const next = ok(playCard(state, 'player', firstInHand(state, 'insight')));
    expect(next.log.some((e) => e.type === 'reshuffled' && e.side === 'player')).toBe(true);
    expect(next.combatants.player.hand).toHaveLength(2);
    expect(next.combatants.player.hand[0]!.definitionId).toBe('mend');
    expect(next.combatants.player.deck.length + next.combatants.player.hand.length).toBe(4);
  });

  it('the played card is excluded from its own draw reshuffle', () => {
    const state = makeState({ player: { hand: ['insight'], deck: [], discard: [] } });
    const result = playCard(state, 'player', firstInHand(state, 'insight'));
    const next = ok(result);
    expect(next.combatants.player.hand).toHaveLength(0);
    expect(next.combatants.player.discard.map((c) => c.definitionId)).toEqual(['insight']);
    expect(result.ok && result.events.some((e) => e.type === 'drawSkipped' && e.reason === 'noCards')).toBe(true);
  });

  it('draws nothing when deck and discard are both empty (no fatigue)', () => {
    const state = makeState({ bot: { hand: [], deck: [], discard: [] } });
    const next = ok(endTurn(state, 'player'));
    expect(next.combatants.bot.hand).toHaveLength(0);
    expect(next.combatants.bot.hp).toBe(30);
    expect(next.phase).toBe('BOT_ACTION');
  });
});

describe('turn transitions', () => {
  it('end turn discards the hand, switches side, refills energy, draws to 5', () => {
    const state = makeState({ player: { energy: 1 } });
    const handBefore = state.combatants.player.hand.length;
    const next = ok(endTurn(state, 'player'));
    expect(next.combatants.player.hand).toHaveLength(0);
    expect(next.combatants.player.discard).toHaveLength(handBefore);
    expect(next.activeSide).toBe('bot');
    expect(next.phase).toBe('BOT_ACTION');
    expect(next.turnNumber).toBe(2);
    expect(next.combatants.bot.energy).toBe(3);
    expect(next.combatants.bot.hand).toHaveLength(5);

    const back = ok(endTurn(next, 'bot'));
    expect(back.activeSide).toBe('player');
    expect(back.phase).toBe('PLAYER_ACTION');
    expect(back.combatants.player.energy).toBe(3);
    expect(back.combatants.player.hand).toHaveLength(5);
  });

  it('emits turn start steps in documented order', () => {
    const state = makeState({ bot: { block: 4, burn: 2 } });
    const result = endTurn(state, 'player');
    const types = result.ok ? result.events.map((e) => e.type) : [];
    const firstDraw = types.indexOf('cardDrawn');
    expect(types.slice(0, 5)).toEqual(['turnEnded', 'turnStarted', 'blockCleared', 'burnTicked', 'energyRefilled']);
    expect(firstDraw).toBe(5);
  });

  it('keeps the event log bounded', () => {
    let state = createBattle(99).state;
    for (let i = 0; i < 60 && state.winner === null; i++) {
      state = ok(endTurn(state, state.activeSide));
    }
    expect(state.log.length).toBeLessThanOrEqual(LOG_LIMIT);
    const ids = state.log.map((e) => e.id);
    expect([...ids].sort((a, b) => a - b)).toEqual(ids);
  });
});
