import { opponentOf } from '../engine/battle';
import type { BattleEvent, BattleState, CardInstance, Phase, Side, Winner } from '../engine/types';

/** Information about a combatant that both players can see at the table. */
export interface PublicCombatant {
  hp: number;
  maxHp: number;
  block: number;
  burn: number;
  handCount: number;
  deckCount: number;
  discardCount: number;
}

/**
 * Everything a bot may use to make decisions. Built from BattleState by
 * `buildBotView`, which deliberately omits:
 * - the opponent's hand contents,
 * - both decks' order (only counts are kept),
 * - the RNG state (so future shuffles cannot be predicted),
 * - the opponent's cardDrawn events (they reveal the hidden hand).
 */
export interface BotView {
  side: Side;
  phase: Phase;
  activeSide: Side;
  winner: Winner;
  turnNumber: number;
  /** Rule numbers are public knowledge. */
  handLimit: number;
  energyPerTurn: number;
  self: PublicCombatant & { energy: number; hand: readonly CardInstance[] };
  opponent: PublicCombatant;
  publicLog: readonly BattleEvent[];
}

function publicInfo(state: BattleState, side: Side): PublicCombatant {
  const c = state.combatants[side];
  return {
    hp: c.hp,
    maxHp: c.maxHp,
    block: c.block,
    burn: c.burn,
    handCount: c.hand.length,
    deckCount: c.deck.length,
    discardCount: c.discard.length,
  };
}

export function buildBotView(state: BattleState, side: Side): BotView {
  const foe = opponentOf(side);
  const self = state.combatants[side];
  return {
    side,
    phase: state.phase,
    activeSide: state.activeSide,
    winner: state.winner,
    turnNumber: state.turnNumber,
    handLimit: state.rules.handLimit,
    energyPerTurn: state.rules.energyPerTurn,
    self: { ...publicInfo(state, side), energy: self.energy, hand: self.hand.map((c) => ({ ...c })) },
    opponent: publicInfo(state, foe),
    publicLog: state.log.filter((e) => !(e.type === 'cardDrawn' && e.side === foe)),
  };
}
