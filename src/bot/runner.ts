import { endTurn, playCard } from '../engine/battle';
import type { BattleEvent, BattleState, CommandResult, Side } from '../engine/types';
import { chooseBotAction, DEFAULT_BOT_PROFILE, type BotDecision, type BotProfile } from './decide';
import { buildBotView } from './view';

/** Safety cap: a side may take at most this many actions in one turn before it is forced to end the turn. */
export const MAX_ACTIONS_PER_TURN = 25;

export interface BotStepResult {
  decision: BotDecision;
  result: CommandResult;
}

/**
 * Applies exactly one bot decision for `side`. `actionsThisTurn` enforces the
 * safety cap. If a decision is somehow rejected by the engine, the bot ends its
 * turn instead so it can never loop on an illegal play.
 * Returns null when it is not that side's turn.
 */
export function applyBotStep(
  state: BattleState,
  side: Side,
  actionsThisTurn: number,
  profile: Readonly<BotProfile> = DEFAULT_BOT_PROFILE,
): BotStepResult | null {
  const decision = chooseBotAction(buildBotView(state, side), profile);
  if (!decision) return null;

  if (decision.type === 'play' && actionsThisTurn < MAX_ACTIONS_PER_TURN) {
    const result = playCard(state, side, decision.instanceId);
    if (result.ok) return { decision, result };
  }
  const forced: BotDecision = decision.type === 'endTurn' ? decision : { type: 'endTurn', reason: 'noUsefulPlay' };
  return { decision: forced, result: endTurn(state, side) };
}

/** Runs a full turn for `side` synchronously (used by tests and simulations). */
export function runBotTurn(
  state: BattleState,
  side: Side,
  profile: Readonly<BotProfile> = DEFAULT_BOT_PROFILE,
): { state: BattleState; events: BattleEvent[]; actions: number } {
  let current = state;
  const events: BattleEvent[] = [];
  let actions = 0;
  for (;;) {
    const step = applyBotStep(current, side, actions, profile);
    if (!step || !step.result.ok) break;
    current = step.result.state;
    events.push(...step.result.events);
    actions += 1;
    if (step.decision.type === 'endTurn') break;
  }
  return { state: current, events, actions };
}
