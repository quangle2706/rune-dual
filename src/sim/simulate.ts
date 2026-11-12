/**
 * Headless bot-vs-bot simulation for balance review.
 * Both seats use the same heuristic bot (src/bot), so results measure the rules
 * and cards under that bot's play style — not under human play.
 */
import { DEFAULT_BOT_PROFILE, type BotProfile } from '../bot/decide';
import { runBotTurn } from '../bot/runner';
import { getDeck } from '../content/decks';
import { OPPONENTS, profileForDeck } from '../content/opponents';
import { STARTER_DECKS, createBattle, type BattleDecks } from '../engine/battle';
import type { BattleRules, BattleState, Side } from '../engine/types';

export interface SimulationSetup {
  rules?: BattleRules;
  decks?: BattleDecks;
  profiles?: Record<Side, Readonly<BotProfile>>;
}

const DEFAULT_PROFILES: Record<Side, Readonly<BotProfile>> = { player: DEFAULT_BOT_PROFILE, bot: DEFAULT_BOT_PROFILE };

export interface SimulationResult {
  games: number;
  /** The side that takes turn 1 (always 'player' in the engine). */
  firstSeatWins: number;
  secondSeatWins: number;
  draws: number;
  /** Games stopped by the turn cap without a winner. */
  unfinished: number;
  firstSeatWinRate: number;
  averageTurns: number;
  maxTurns: number;
  /** How often each card definition was played, across both seats. */
  cardPlays: Record<string, number>;
}

export function simulateBattle(seed: number, setup: SimulationSetup = {}, turnCap = 200): BattleState {
  const profiles = setup.profiles ?? DEFAULT_PROFILES;
  let state = createBattle(seed, setup.rules, setup.decks ?? STARTER_DECKS).state;
  while (state.winner === null && state.turnNumber < turnCap) {
    state = runBotTurn(state, state.activeSide, profiles[state.activeSide]).state;
  }
  return state;
}

export function simulate(options: SimulationSetup & { seeds: number[]; turnCap?: number }): SimulationResult {
  const { rules, seeds, turnCap = 200 } = options;
  const decks = options.decks ?? STARTER_DECKS;
  const profiles = options.profiles ?? DEFAULT_PROFILES;
  const result: SimulationResult = {
    games: seeds.length,
    firstSeatWins: 0,
    secondSeatWins: 0,
    draws: 0,
    unfinished: 0,
    firstSeatWinRate: 0,
    averageTurns: 0,
    maxTurns: 0,
    cardPlays: {},
  };
  let totalTurns = 0;
  for (const seed of seeds) {
    // The bounded log only keeps recent events, so count plays turn by turn.
    let state = createBattle(seed, rules, decks).state;
    while (state.winner === null && state.turnNumber < turnCap) {
      const turn = runBotTurn(state, state.activeSide, profiles[state.activeSide]);
      for (const e of turn.events) {
        if (e.type === 'cardPlayed') result.cardPlays[e.definitionId] = (result.cardPlays[e.definitionId] ?? 0) + 1;
      }
      state = turn.state;
    }
    if (state.winner === 'player') result.firstSeatWins += 1;
    else if (state.winner === 'bot') result.secondSeatWins += 1;
    else if (state.winner === 'draw') result.draws += 1;
    else result.unfinished += 1;
    totalTurns += state.turnNumber;
    result.maxTurns = Math.max(result.maxTurns, state.turnNumber);
  }
  const decided = result.firstSeatWins + result.secondSeatWins + result.draws;
  result.firstSeatWinRate = decided ? result.firstSeatWins / decided : 0;
  result.averageTurns = seeds.length ? totalTurns / seeds.length : 0;
  return result;
}

export function seedRange(count: number, start = 1): number[] {
  return Array.from({ length: count }, (_, i) => start + i);
}

export interface MatchupResult {
  playerDeckId: string;
  opponentId: string;
  /** Win rate of the player's seat (who also moves first). */
  playerWinRate: number;
  averageTurns: number;
  maxTurns: number;
  unfinished: number;
}

/**
 * Every player deck against every opponent archetype. The player's seat is
 * played by the bot using the profile that matches the player's deck.
 */
export function simulateMatchups(options: { rules?: BattleRules; seeds: number[]; playerDeckIds: string[] }): MatchupResult[] {
  const out: MatchupResult[] = [];
  for (const playerDeckId of options.playerDeckIds) {
    for (const opponent of OPPONENTS) {
      const r = simulate({
        rules: options.rules,
        seeds: options.seeds,
        decks: { player: getDeck(playerDeckId).recipe, bot: getDeck(opponent.deckId).recipe },
        profiles: { player: profileForDeck(playerDeckId), bot: opponent.profile },
      });
      out.push({
        playerDeckId,
        opponentId: opponent.id,
        playerWinRate: r.firstSeatWinRate,
        averageTurns: r.averageTurns,
        maxTurns: r.maxTurns,
        unfinished: r.unfinished,
      });
    }
  }
  return out;
}
