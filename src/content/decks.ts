import type { CardInstance, Side } from '../engine/types';

/** Fixed starter deck recipe: [definitionId, copies]. Total 20. */
export const STARTER_DECK_RECIPE: ReadonlyArray<readonly [string, number]> = [
  ['strike', 5],
  ['guard', 5],
  ['heavy_strike', 1],
  ['mend', 1],
  ['insight', 1],
  ['ember', 1],
  ['shield_bash', 1],
  ['fortify', 1],
  ['quick_cut', 1],
  ['twin_strike', 1],
  ['cleanse', 1],
  ['desperate_blow', 1],
];

/** Builds unshuffled card instances with unique ids like "player-01". */
export function buildStarterDeck(side: Side): CardInstance[] {
  const deck: CardInstance[] = [];
  for (const [definitionId, copies] of STARTER_DECK_RECIPE) {
    for (let i = 0; i < copies; i++) {
      const n = String(deck.length + 1).padStart(2, '0');
      deck.push({ instanceId: `${side}-${n}`, definitionId });
    }
  }
  return deck;
}
