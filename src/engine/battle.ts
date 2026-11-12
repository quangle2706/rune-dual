/**
 * Pure battle engine. Public commands:
 *   createBattle(seed, rules?, decks?)    -> { state, events }
 *   playCard(state, side, instanceId)     -> CommandResult
 *   endTurn(state, side)                  -> CommandResult
 *
 * Contract:
 * - Inputs are never mutated. Valid commands work on a structuredClone draft.
 * - Rejected commands return the ORIGINAL state object, consume no randomness,
 *   and emit no events.
 * - All randomness comes from state.rngState (seeded mulberry32).
 * - Battle end is checked after every atomic effect step; once a winner exists,
 *   remaining effects are skipped.
 */
import { findCardDefinition, getCardDefinition } from '../content/cards';
import { STARTER_DECK_RECIPE, buildDeck, type DeckRecipe } from '../content/decks';
import { REJECTION_MESSAGES } from '../content/text';
import { normalizeSeed, shuffle } from './rng';
import type {
  BattleEvent,
  BattleEventInput,
  BattleRules,
  BattleState,
  CardInstance,
  CommandResult,
  Combatant,
  Effect,
  Phase,
  RejectionReason,
  Side,
  Winner,
} from './types';

export const MAX_HP = 30;
export const ENERGY_PER_TURN = 3;
export const TURN_DRAW_TARGET = 5;
export const HAND_LIMIT = 8;
export const LOG_LIMIT = 100;

/** Milestone 1 rules, with no first-turn adjustments. */
export const BASE_RULES: Readonly<BattleRules> = {
  maxHp: MAX_HP,
  energyPerTurn: ENERGY_PER_TURN,
  turnDrawTarget: TURN_DRAW_TARGET,
  handLimit: HAND_LIMIT,
  firstTurnEnergy: ENERGY_PER_TURN,
  firstTurnDrawTarget: TURN_DRAW_TARGET,
  secondPlayerFirstTurnDrawBonus: 0,
  secondPlayerFirstTurnEnergyBonus: 0,
};

/** Rules used by the game. See docs/BALANCE.md for how they were chosen. */
export const DEFAULT_RULES: Readonly<BattleRules> = {
  ...BASE_RULES,
  firstTurnEnergy: 2,
  secondPlayerFirstTurnEnergyBonus: 1,
};

export function opponentOf(side: Side): Side {
  return side === 'player' ? 'bot' : 'player';
}

export function actionPhaseFor(side: Side): Phase {
  return side === 'player' ? 'PLAYER_ACTION' : 'BOT_ACTION';
}

/** Mutable working context used only inside a single command. */
interface Ctx {
  state: BattleState;
  events: BattleEvent[];
}

function emit(ctx: Ctx, input: BattleEventInput): void {
  const event = { ...input, id: ctx.state.nextEventId } as BattleEvent;
  ctx.state.nextEventId += 1;
  ctx.events.push(event);
  ctx.state.log.push(event);
}

function finish(ctx: Ctx): CommandResult {
  if (ctx.state.log.length > LOG_LIMIT) {
    ctx.state.log = ctx.state.log.slice(-LOG_LIMIT);
  }
  return { ok: true, state: ctx.state, events: ctx.events };
}

function reject(state: BattleState, reason: RejectionReason): CommandResult {
  return { ok: false, state, reason, message: REJECTION_MESSAGES[reason] };
}

function newCombatant(deck: CardInstance[], maxHp: number): Combatant {
  return { hp: maxHp, maxHp, block: 0, burn: 0, energy: 0, deck, hand: [], discard: [] };
}

// ---------------------------------------------------------------------------
// Battle end
// ---------------------------------------------------------------------------

/**
 * Checks both combatants. If both are at 0 HP after the same atomic step, the
 * result is a draw. Returns true when the battle is (now) over.
 */
export function outcomeFor(playerHp: number, botHp: number): Winner {
  const playerDown = playerHp <= 0;
  const botDown = botHp <= 0;
  if (playerDown && botDown) return 'draw';
  if (playerDown) return 'bot';
  if (botDown) return 'player';
  return null;
}

function checkBattleEnd(ctx: Ctx): boolean {
  const { state } = ctx;
  if (state.winner !== null) return true;
  const winner = outcomeFor(state.combatants.player.hp, state.combatants.bot.hp);
  if (winner === null) return false;
  state.winner = winner;
  state.phase = 'GAME_OVER';
  emit(ctx, { type: 'battleEnded', winner: state.winner });
  return true;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function reshuffleDiscard(ctx: Ctx, side: Side): void {
  const c = ctx.state.combatants[side];
  const { items, nextState } = shuffle(c.discard, ctx.state.rngState);
  ctx.state.rngState = nextState;
  c.deck = items;
  c.discard = [];
  emit(ctx, { type: 'reshuffled', side, count: items.length });
}

/** Draws up to `count` cards, respecting the hand limit and reshuffling as needed. */
function drawCards(ctx: Ctx, side: Side, count: number): void {
  const c = ctx.state.combatants[side];
  for (let i = 0; i < count; i++) {
    if (c.hand.length >= ctx.state.rules.handLimit) {
      emit(ctx, { type: 'drawSkipped', side, reason: 'handFull' });
      return;
    }
    if (c.deck.length === 0) {
      if (c.discard.length === 0) {
        emit(ctx, { type: 'drawSkipped', side, reason: 'noCards' });
        return;
      }
      reshuffleDiscard(ctx, side);
    }
    const card = c.deck.shift() as CardInstance;
    c.hand.push(card);
    emit(ctx, { type: 'cardDrawn', side, instanceId: card.instanceId, definitionId: card.definitionId });
  }
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

function startTurn(ctx: Ctx, side: Side): void {
  const { state } = ctx;
  const c = state.combatants[side];
  state.phase = 'TURN_START';
  state.activeSide = side;
  state.turnNumber += 1;
  emit(ctx, { type: 'turnStarted', side, turnNumber: state.turnNumber });

  // 1. Clear old block.
  if (c.block > 0) {
    emit(ctx, { type: 'blockCleared', side, amount: c.block });
    c.block = 0;
  }

  // 2. Burn: bypasses block, then decays by 1. 3. Check battle end.
  if (c.burn > 0) {
    const damage = c.burn;
    c.hp = Math.max(0, c.hp - damage);
    c.burn -= 1;
    emit(ctx, { type: 'burnTicked', side, damage, hpAfter: c.hp, burnAfter: c.burn });
    if (checkBattleEnd(ctx)) return;
  }

  // 4. Refill energy.
  const { rules } = state;
  c.energy =
    state.turnNumber === 1
      ? rules.firstTurnEnergy
      : rules.energyPerTurn + (state.turnNumber === 2 ? rules.secondPlayerFirstTurnEnergyBonus : 0);
  emit(ctx, { type: 'energyRefilled', side, energy: c.energy });

  // 5. Draw until hand size reaches the target (never discards or draws past that).
  const target =
    state.turnNumber === 1
      ? rules.firstTurnDrawTarget
      : rules.turnDrawTarget + (state.turnNumber === 2 ? rules.secondPlayerFirstTurnDrawBonus : 0);
  drawCards(ctx, side, Math.max(0, target - c.hand.length));

  state.phase = actionPhaseFor(side);
}

/** Creates a new battle and starts the player's first turn. */
export interface BattleDecks {
  player: DeckRecipe;
  bot: DeckRecipe;
}

export const STARTER_DECKS: Readonly<BattleDecks> = { player: STARTER_DECK_RECIPE, bot: STARTER_DECK_RECIPE };

export function createBattle(
  seed: number,
  rules: Readonly<BattleRules> = DEFAULT_RULES,
  decks: Readonly<BattleDecks> = STARTER_DECKS,
): { state: BattleState; events: BattleEvent[] } {
  const normalized = normalizeSeed(seed);
  let rng = normalized;
  const playerShuffle = shuffle(buildDeck('player', decks.player), rng);
  rng = playerShuffle.nextState;
  const botShuffle = shuffle(buildDeck('bot', decks.bot), rng);
  rng = botShuffle.nextState;

  const state: BattleState = {
    rules: { ...rules },
    seed: normalized,
    rngState: rng,
    phase: 'SETUP',
    activeSide: 'player',
    turnNumber: 0,
    winner: null,
    combatants: {
      player: newCombatant(playerShuffle.items, rules.maxHp),
      bot: newCombatant(botShuffle.items, rules.maxHp),
    },
    log: [],
    nextEventId: 1,
  };
  const ctx: Ctx = { state, events: [] };
  emit(ctx, { type: 'battleStarted', seed: normalized });
  startTurn(ctx, 'player');
  const result = finish(ctx);
  return { state: result.state, events: ctx.events };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateActiveSide(state: BattleState, side: Side): RejectionReason | null {
  if (state.winner !== null || state.phase === 'GAME_OVER') return 'battleOver';
  if (state.activeSide !== side) return 'notYourTurn';
  if (state.phase !== actionPhaseFor(side)) return 'wrongPhase';
  return null;
}

/** Why `side` cannot play this card right now, or null if the play is legal. */
export function getPlayRejection(state: BattleState, side: Side, instanceId: string): RejectionReason | null {
  const base = validateActiveSide(state, side);
  if (base) return base;
  const card = state.combatants[side].hand.find((c) => c.instanceId === instanceId);
  if (!card) return 'cardNotInHand';
  const def = findCardDefinition(card.definitionId);
  if (!def) return 'unknownCard';
  if (def.cost > state.combatants[side].energy) return 'notEnoughEnergy';
  return null;
}

export function getEndTurnRejection(state: BattleState, side: Side): RejectionReason | null {
  return validateActiveSide(state, side);
}

// ---------------------------------------------------------------------------
// Effect resolution
// ---------------------------------------------------------------------------

function dealDamage(ctx: Ctx, source: Side, amount: number): void {
  const targetSide = opponentOf(source);
  const target = ctx.state.combatants[targetSide];
  const blocked = Math.min(target.block, amount);
  target.block -= blocked;
  const hpLoss = Math.min(target.hp, amount - blocked);
  target.hp -= hpLoss;
  emit(ctx, { type: 'damageDealt', source, target: targetSide, amount, blocked, hpLoss, hpAfter: target.hp });
}

/**
 * Resolves one effect as one or more atomic steps.
 * Returns true if the battle ended (caller must stop resolving).
 */
function resolveEffect(ctx: Ctx, side: Side, effect: Effect): boolean {
  const self = ctx.state.combatants[side];
  const foeSide = opponentOf(side);
  const foe = ctx.state.combatants[foeSide];

  switch (effect.type) {
    case 'damage': {
      const hits = effect.hits ?? 1;
      for (let i = 0; i < hits; i++) {
        dealDamage(ctx, side, effect.amount);
        if (checkBattleEnd(ctx)) return true;
      }
      return false;
    }
    case 'block':
      self.block += effect.amount;
      emit(ctx, { type: 'blockGained', side, amount: effect.amount, blockAfter: self.block });
      return checkBattleEnd(ctx);
    case 'heal': {
      // Cannot revive a defeated combatant; cannot exceed max HP.
      const amount = self.hp <= 0 ? 0 : Math.min(effect.amount, self.maxHp - self.hp);
      self.hp += amount;
      emit(ctx, { type: 'healed', side, amount, hpAfter: self.hp });
      return checkBattleEnd(ctx);
    }
    case 'draw':
      drawCards(ctx, side, effect.count);
      return checkBattleEnd(ctx);
    case 'applyBurn':
      foe.burn += effect.amount;
      emit(ctx, { type: 'burnApplied', source: side, target: foeSide, amount: effect.amount, burnAfter: foe.burn });
      return checkBattleEnd(ctx);
    case 'removeBurn': {
      const amount = self.burn;
      self.burn = 0;
      emit(ctx, { type: 'burnRemoved', side, amount });
      return checkBattleEnd(ctx);
    }
    case 'loseHp': {
      const amount = Math.min(self.hp, effect.amount);
      self.hp -= amount;
      emit(ctx, { type: 'hpLost', side, amount, hpAfter: self.hp });
      return checkBattleEnd(ctx);
    }
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export function playCard(state: BattleState, side: Side, instanceId: string): CommandResult {
  const rejection = getPlayRejection(state, side, instanceId);
  if (rejection) return reject(state, rejection);

  const ctx: Ctx = { state: structuredClone(state), events: [] };
  const self = ctx.state.combatants[side];
  const index = self.hand.findIndex((c) => c.instanceId === instanceId);
  // The played card leaves the hand and is held aside (not in discard), so its
  // own draw effect can never reshuffle it back into the deck.
  const [card] = self.hand.splice(index, 1) as [CardInstance];
  const def = getCardDefinition(card.definitionId);

  emit(ctx, { type: 'cardPlayed', side, instanceId: card.instanceId, definitionId: def.id });
  self.energy -= def.cost;
  emit(ctx, { type: 'energySpent', side, amount: def.cost, energyAfter: self.energy });

  for (const effect of def.effects) {
    if (resolveEffect(ctx, side, effect)) break;
  }

  self.discard.push(card);
  return finish(ctx);
}

export function endTurn(state: BattleState, side: Side): CommandResult {
  const rejection = getEndTurnRejection(state, side);
  if (rejection) return reject(state, rejection);

  const ctx: Ctx = { state: structuredClone(state), events: [] };
  const self = ctx.state.combatants[side];
  ctx.state.phase = 'TURN_END';
  const discarded = self.hand.length;
  self.discard.push(...self.hand);
  self.hand = [];
  emit(ctx, { type: 'turnEnded', side, discarded });
  // (No explicit end-of-turn card effects exist in Milestone 1.)

  startTurn(ctx, opponentOf(side));
  return finish(ctx);
}
