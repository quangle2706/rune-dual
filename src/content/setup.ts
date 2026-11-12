import { DEFAULT_DECK_ID, findDeck, getDeck } from './decks';
import { DEFAULT_OPPONENT_ID, findOpponent, getOpponent } from './opponents';
import type { BattleDecks } from '../engine/battle';

/** What the player chose before a battle. Serializable; stored with saves. */
export interface BattleSetup {
  playerDeckId: string;
  opponentId: string;
}

export const DEFAULT_SETUP: Readonly<BattleSetup> = {
  playerDeckId: DEFAULT_DECK_ID,
  opponentId: DEFAULT_OPPONENT_ID,
};

/** Keeps known ids; replaces unknown or missing ones with defaults. */
export function sanitizeSetup(value: unknown): BattleSetup {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return {
    playerDeckId:
      typeof v.playerDeckId === 'string' && findDeck(v.playerDeckId) ? v.playerDeckId : DEFAULT_SETUP.playerDeckId,
    opponentId: typeof v.opponentId === 'string' && findOpponent(v.opponentId) ? v.opponentId : DEFAULT_SETUP.opponentId,
  };
}

export function decksForSetup(setup: BattleSetup): BattleDecks {
  return {
    player: getDeck(setup.playerDeckId).recipe,
    bot: getDeck(getOpponent(setup.opponentId).deckId).recipe,
  };
}
