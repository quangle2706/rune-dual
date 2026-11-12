/**
 * UI controller: owns the BattleState via useReducer and schedules bot steps.
 *
 * Authority rules:
 * - The reducer is the ONLY place that changes battle state, and it does so
 *   only by calling pure engine commands. React effects never apply damage,
 *   draw cards, or decide victory.
 * - Bot timers only *request* a step. Each request carries (battleId, version);
 *   the reducer ignores stale requests. This makes restarts, unmounts, and
 *   React StrictMode's double effects harmless.
 */
import { useCallback, useEffect, useReducer, useState } from 'react';
import { applyBotStep } from '../bot/runner';
import type { BotDecision } from '../bot/decide';
import { getOpponent } from '../content/opponents';
import { DEFAULT_SETUP, decksForSetup, type BattleSetup } from '../content/setup';
import { DEFAULT_RULES, createBattle, endTurn, playCard } from '../engine/battle';
import type { BattleEvent, BattleState, CommandResult } from '../engine/types';
import { emptyStats, type MatchStats } from '../persistence/save';

export interface UiState {
  /** Increments on every restart; stale timers from older battles are ignored. */
  battleId: number;
  /** Increments on every successful command; stale bot steps are ignored. */
  version: number;
  battle: BattleState;
  selectedId: string | null;
  /** Events from the most recent command (drives animations and sounds only). */
  lastEvents: BattleEvent[];
  notice: string | null;
  botActionsThisTurn: number;
  lastBotDecision: BotDecision | null;
  /** Presentation-only totals for the result screen (the event log is bounded). */
  stats: MatchStats;
  /** Chosen decks and opponent; kept for restarts and saves. */
  setup: BattleSetup;
}

export type UiAction =
  | { type: 'select'; instanceId: string | null }
  | { type: 'play'; instanceId: string }
  | { type: 'endTurn' }
  | { type: 'botStep'; battleId: number; version: number }
  | { type: 'restart'; seed: number }
  | { type: 'dismissNotice' };

export function initUiState(seed: number, battleId = 1, setup: BattleSetup = DEFAULT_SETUP): UiState {
  const { state, events } = createBattle(seed, DEFAULT_RULES, decksForSetup(setup));
  return {
    battleId,
    version: 0,
    battle: state,
    selectedId: null,
    lastEvents: events,
    notice: null,
    botActionsThisTurn: 0,
    lastBotDecision: null,
    stats: emptyStats(),
    setup: { ...setup },
  };
}

/** Resumes a saved battle. No events are replayed, so nothing animates or sounds on load. */
export function resumeUiState(
  battle: BattleState,
  stats: MatchStats = emptyStats(),
  setup: BattleSetup = DEFAULT_SETUP,
): UiState {
  return {
    battleId: 1,
    version: 0,
    battle,
    selectedId: null,
    lastEvents: [],
    notice: null,
    botActionsThisTurn: 0,
    lastBotDecision: null,
    stats,
    setup: { ...setup },
  };
}

export function accumulateStats(stats: MatchStats, events: readonly BattleEvent[]): MatchStats {
  const next: MatchStats = structuredClone(stats);
  for (const e of events) {
    if (e.type === 'damageDealt') next.damageDealt[e.source] += e.hpLoss;
    else if (e.type === 'burnTicked') next.damageDealt[e.side === 'player' ? 'bot' : 'player'] += e.damage;
    else if (e.type === 'cardPlayed') next.cardsPlayed[e.side] += 1;
    else if (e.type === 'healed') next.healed[e.side] += e.amount;
  }
  return next;
}

function applied(ui: UiState, result: Extract<CommandResult, { ok: true }>): UiState {
  return {
    ...ui,
    version: ui.version + 1,
    battle: result.state,
    lastEvents: result.events,
    notice: null,
    stats: accumulateStats(ui.stats, result.events),
  };
}

export function uiReducer(ui: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'select':
      return { ...ui, selectedId: action.instanceId, notice: null };
    case 'dismissNotice':
      return { ...ui, notice: null };
    case 'play': {
      const result = playCard(ui.battle, 'player', action.instanceId);
      if (!result.ok) return { ...ui, notice: result.message };
      return { ...applied(ui, result), selectedId: null };
    }
    case 'endTurn': {
      const result = endTurn(ui.battle, 'player');
      if (!result.ok) return { ...ui, notice: result.message };
      return { ...applied(ui, result), selectedId: null, botActionsThisTurn: 0, lastBotDecision: null };
    }
    case 'botStep': {
      if (action.battleId !== ui.battleId || action.version !== ui.version) return ui; // stale timer
      const step = applyBotStep(ui.battle, 'bot', ui.botActionsThisTurn, getOpponent(ui.setup.opponentId).profile);
      if (!step || !step.result.ok) return ui;
      return {
        ...applied(ui, step.result),
        botActionsThisTurn: step.decision.type === 'endTurn' ? 0 : ui.botActionsThisTurn + 1,
        lastBotDecision: step.decision,
      };
    }
    case 'restart':
      return initUiState(action.seed, ui.battleId + 1, ui.setup);
  }
}

export function makeSeed(): number {
  // Seed generation is outside the rules, so platform randomness is fine here.
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] ?? Date.now();
}

function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return hidden;
}

export interface ControllerOptions {
  initialSeed?: number;
  seedSource?: () => number;
  /** Decks and opponent for a new battle (default: balanced vs Người Gác Ấn). */
  setup?: BattleSetup;
  /** Resume this battle instead of creating a new one. */
  resume?: { battle: BattleState; stats: MatchStats; setup: BattleSetup };
  /** Delay before the bot's first action of a turn (ms). */
  botThinkDelay?: number;
  /** Delay between subsequent bot actions (ms). */
  botStepDelay?: number;
}

export const DEFAULT_BOT_THINK_DELAY = 900;
export const DEFAULT_BOT_STEP_DELAY = 1100;

export function useBattleController(options: ControllerOptions = {}) {
  const {
    initialSeed,
    seedSource = makeSeed,
    resume,
    setup,
    botThinkDelay = DEFAULT_BOT_THINK_DELAY,
    botStepDelay = DEFAULT_BOT_STEP_DELAY,
  } = options;
  const [ui, dispatch] = useReducer(uiReducer, undefined, () =>
    resume
      ? resumeUiState(resume.battle, resume.stats, resume.setup)
      : initUiState(initialSeed ?? seedSource(), 1, setup ?? DEFAULT_SETUP),
  );
  const pageHidden = usePageHidden();

  const { phase } = ui.battle;
  const { battleId, version, botActionsThisTurn } = ui;

  // Bot scheduler: presentation timing only. Paused while the tab is hidden;
  // when visible again the pending step is simply re-scheduled.
  useEffect(() => {
    if (pageHidden || phase !== 'BOT_ACTION') return;
    const delay = botActionsThisTurn === 0 ? botThinkDelay : botStepDelay;
    const timer = setTimeout(() => dispatch({ type: 'botStep', battleId, version }), delay);
    return () => clearTimeout(timer);
  }, [pageHidden, phase, battleId, version, botActionsThisTurn, botThinkDelay, botStepDelay]);

  const select = useCallback((instanceId: string | null) => dispatch({ type: 'select', instanceId }), []);
  const play = useCallback((instanceId: string) => dispatch({ type: 'play', instanceId }), []);
  const finishTurn = useCallback(() => dispatch({ type: 'endTurn' }), []);
  const restart = useCallback(() => dispatch({ type: 'restart', seed: seedSource() }), [seedSource]);
  const dismissNotice = useCallback(() => dispatch({ type: 'dismissNotice' }), []);

  return { ui, select, play, endTurn: finishTurn, restart, dismissNotice, pageHidden };
}
