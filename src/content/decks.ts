import type { CardInstance, Side } from '../engine/types';

/** [definitionId, copies] pairs. Every deck has exactly DECK_SIZE cards. */
export type DeckRecipe = ReadonlyArray<readonly [string, number]>;

export const DECK_SIZE = 20;

export interface DeckDefinition {
  id: string;
  /** Vietnamese display name. */
  name: string;
  /** One-line Vietnamese description of the play style. */
  description: string;
  /** Optional Vietnamese caution shown on the setup screen. */
  note?: string;
  recipe: DeckRecipe;
}

/** Fixed starter deck recipe (Milestone 1). Total 20. */
export const STARTER_DECK_RECIPE: DeckRecipe = [
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

/**
 * Decks built only from the twelve existing cards. Tuned with
 * `npm run simulate` (see docs/BALANCE.md → Milestone 3).
 */
export const DECKS: readonly DeckDefinition[] = [
  {
    id: 'balanced',
    name: 'Cân bằng',
    description: 'Bộ khởi đầu: mỗi loại thẻ một ít, dễ làm quen.',
    recipe: STARTER_DECK_RECIPE,
  },
  {
    id: 'burn',
    name: 'Thiêu đốt',
    description: 'Ba Tàn lửa và nhiều đòn nhanh. Thiêu đốt gây sát thương xuyên Giáp qua nhiều lượt.',
    recipe: [
      ['ember', 3],
      ['strike', 4],
      ['quick_cut', 3],
      ['guard', 4],
      ['insight', 2],
      ['heavy_strike', 1],
      ['desperate_blow', 1],
      ['cleanse', 1],
      ['mend', 1],
    ],
  },
  {
    id: 'fortress',
    name: 'Phòng ngự',
    description: 'Khiên kích vừa đỡ vừa đánh, thêm Củng cố và Thanh tẩy. Bền bỉ, chống Thiêu đốt tốt hơn.',
    note: 'Khó dùng hơn: trong mô phỏng, bộ này thắng ít hơn hai bộ còn lại.',
    recipe: [
      ['shield_bash', 7],
      ['strike', 5],
      ['heavy_strike', 3],
      ['fortify', 2],
      ['cleanse', 2],
      ['mend', 1],
    ],
  },
];

export const DEFAULT_DECK_ID = 'balanced';

export function findDeck(id: string): DeckDefinition | undefined {
  return DECKS.find((d) => d.id === id);
}

export function getDeck(id: string): DeckDefinition {
  const deck = findDeck(id);
  if (!deck) throw new Error(`Unknown deck: ${id}`);
  return deck;
}

export function recipeSize(recipe: DeckRecipe): number {
  return recipe.reduce((n, [, copies]) => n + copies, 0);
}

/** Builds unshuffled card instances with unique ids like "player-01". */
export function buildDeck(side: Side, recipe: DeckRecipe): CardInstance[] {
  const deck: CardInstance[] = [];
  for (const [definitionId, copies] of recipe) {
    for (let i = 0; i < copies; i++) {
      const n = String(deck.length + 1).padStart(2, '0');
      deck.push({ instanceId: `${side}-${n}`, definitionId });
    }
  }
  return deck;
}

export function buildStarterDeck(side: Side): CardInstance[] {
  return buildDeck(side, STARTER_DECK_RECIPE);
}
