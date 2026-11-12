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
import { createBattle, endTurn, playCard } from '../engine/battle';
import type { BattleEvent, BattleState } from '../engine/types';

export interface UiState {
  /** Increments on every restart; stale timers from older battles are ignored. */
  battleId: number;
  /** Increments on every successful command; stale bot steps are ignored. */
  version: number;
  battle: BattleState;
  selectedId: string | null;
  /** Events from the most recent command (drives animations only). */
  lastEvents: BattleEvent[];
  notice: string | null;
  botActionsThisTurn: number;
  lastBotDecision: BotDecision | null;
}

export type UiAction =
  | { type: 'select'; instanceId: string | null }
  | { type: 'play'; instanceId: string }
  | { type: 'endTurn' }
  | { type: 'botStep'; battleId: number; version: number }
  | { type: 'restart'; seed: number }
  | { type: 'dismissNotice' };

export function initUiState(seed: number, battleId = 1): UiState {
  const { state, events } = createBattle(seed);
  return {
    battleId,
    version: 0,
    battle: state,
    selectedId: null,
    lastEvents: events,
    notice: null,
    botActionsThisTurn: 0,
    lastBotDecision: null,
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
      return {
        ...ui,
        version: ui.version + 1,
        battle: result.state,
        lastEvents: result.events,
        selectedId: null,
        notice: null,
      };
    }
    case 'endTurn': {
      const result = endTurn(ui.battle, 'player');
      if (!result.ok) return { ...ui, notice: result.message };
      return {
        ...ui,
        version: ui.version + 1,
        battle: result.state,
        lastEvents: result.events,
        selectedId: null,
        notice: null,
        botActionsThisTurn: 0,
        lastBotDecision: null,
      };
    }
    case 'botStep': {
      if (action.battleId !== ui.battleId || action.version !== ui.version) return ui; // stale timer
      const step = applyBotStep(ui.battle, 'bot', ui.botActionsThisTurn);
      if (!step || !step.result.ok) return ui;
      return {
        ...ui,
        version: ui.version + 1,
        battle: step.result.state,
        lastEvents: step.result.events,
        botActionsThisTurn: step.decision.type === 'endTurn' ? 0 : ui.botActionsThisTurn + 1,
        lastBotDecision: step.decision,
      };
    }
    case 'restart':
      return initUiState(action.seed, ui.battleId + 1);
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
    botThinkDelay = DEFAULT_BOT_THINK_DELAY,
    botStepDelay = DEFAULT_BOT_STEP_DELAY,
  } = options;
  const [ui, dispatch] = useReducer(uiReducer, undefined, () => initUiState(initialSeed ?? seedSource()));
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
