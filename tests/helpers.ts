import { BASE_RULES, createBattle } from '../src/engine/battle';
import type { BattleState, CardInstance, Combatant, Side } from '../src/engine/types';

let counter = 0;

export function card(definitionId: string, side: Side = 'player'): CardInstance {
  counter += 1;
  return { instanceId: `${side}-t${counter}`, definitionId };
}

export function cards(ids: string[], side: Side = 'player'): CardInstance[] {
  return ids.map((id) => card(id, side));
}

type CombatantPatch = Partial<Omit<Combatant, 'hand' | 'deck' | 'discard'>> & {
  hand?: string[];
  deck?: string[];
  discard?: string[];
};

/**
 * Creates a battle (player's turn 1, PLAYER_ACTION) and overrides chosen fields.
 * Uses BASE_RULES (3 energy on every turn) so core-rule tests don't depend on
 * the first-turn balance adjustments.
 * Card arrays are given as definition ids and receive fresh unique instance ids.
 */
export function makeState(
  patch: { player?: CombatantPatch; bot?: CombatantPatch; seed?: number } = {},
): BattleState {
  const state = structuredClone(createBattle(patch.seed ?? 42, BASE_RULES).state);
  for (const side of ['player', 'bot'] as const) {
    const p = patch[side];
    if (!p) continue;
    const { hand, deck, discard, ...rest } = p;
    const c = state.combatants[side];
    Object.assign(c, rest);
    if (hand) c.hand = cards(hand, side);
    if (deck) c.deck = cards(deck, side);
    if (discard) c.discard = cards(discard, side);
  }
  return state;
}

export function handIds(state: BattleState, side: Side): string[] {
  return state.combatants[side].hand.map((c) => c.definitionId);
}
