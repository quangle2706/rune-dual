/**
 * Core serializable types for the Rune Duel battle engine.
 * Everything in BattleState is plain JSON data: no classes, functions, or Maps.
 */

export type Side = 'player' | 'bot';

export type Phase =
  | 'SETUP'
  | 'TURN_START'
  | 'PLAYER_ACTION'
  | 'BOT_ACTION'
  | 'TURN_END'
  | 'GAME_OVER';

/** Outcome of a finished battle. `null` while the battle is running. */
export type Winner = Side | 'draw' | null;

/**
 * Typed effect system. Each effect is resolved as one or more *atomic* steps;
 * battle end is checked after every atomic step.
 *
 * Targets are fixed per effect type to keep the MVP small:
 * - damage, applyBurn  -> opponent
 * - block, heal, draw, removeBurn, loseHp -> self
 */
export type Effect =
  | { type: 'damage'; amount: number; hits?: number }
  | { type: 'block'; amount: number }
  | { type: 'heal'; amount: number }
  | { type: 'draw'; count: number }
  | { type: 'applyBurn'; amount: number }
  | { type: 'removeBurn' }
  | { type: 'loseHp'; amount: number };

export type EffectType = Effect['type'];

/** Visual/semantic category. Used for presentation and bot hints, never for rules. */
export type CardCategory = 'attack' | 'defense' | 'heal' | 'burn' | 'utility';

export interface CardDefinition {
  id: string;
  /** Vietnamese display name. */
  name: string;
  cost: number;
  category: CardCategory;
  /** Resolved in array order. */
  effects: readonly Effect[];
  /** Short flavor line (Vietnamese). Not rules text. */
  flavor: string;
}

export interface CardInstance {
  /** Unique within a battle, e.g. "player-07". */
  instanceId: string;
  definitionId: string;
}

export interface Combatant {
  hp: number;
  maxHp: number;
  block: number;
  burn: number;
  energy: number;
  /** Index 0 is the top of the deck. */
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
}

/**
 * Tunable rule numbers. Stored in BattleState so a saved battle keeps the rules
 * it was started with, and simulations can compare variants.
 */
export interface BattleRules {
  maxHp: number;
  energyPerTurn: number;
  /** Turn-start draw fills the hand up to this many cards. */
  turnDrawTarget: number;
  handLimit: number;
  /** Energy on the very first turn of the battle (the first player's turn 1). */
  firstTurnEnergy: number;
  /** Turn-start draw target on the very first turn of the battle. */
  firstTurnDrawTarget: number;
  /** Extra cards the second player draws on its first turn (battle turn 2). */
  secondPlayerFirstTurnDrawBonus: number;
  /** Extra energy the second player gets on its first turn (battle turn 2). */
  secondPlayerFirstTurnEnergyBonus: number;
}

export interface BattleState {
  /** Rules this battle was created with. */
  rules: BattleRules;
  seed: number;
  /** Current mulberry32 state. Advances only when randomness is consumed. */
  rngState: number;
  phase: Phase;
  activeSide: Side;
  /** Increments every time a side's turn starts. Turn 1 = player's first turn. */
  turnNumber: number;
  winner: Winner;
  combatants: Record<Side, Combatant>;
  /** Bounded history of recent events (newest last). */
  log: BattleEvent[];
  /** Next event id; ids are unique and increasing within a battle. */
  nextEventId: number;
}

type EventBase = { id: number };

export type BattleEvent = EventBase &
  (
    | { type: 'battleStarted'; seed: number }
    | { type: 'turnStarted'; side: Side; turnNumber: number }
    | { type: 'blockCleared'; side: Side; amount: number }
    | { type: 'burnTicked'; side: Side; damage: number; hpAfter: number; burnAfter: number }
    | { type: 'energyRefilled'; side: Side; energy: number }
    | { type: 'cardDrawn'; side: Side; instanceId: string; definitionId: string }
    | { type: 'drawSkipped'; side: Side; reason: 'handFull' | 'noCards' }
    | { type: 'reshuffled'; side: Side; count: number }
    | { type: 'cardPlayed'; side: Side; instanceId: string; definitionId: string }
    | { type: 'energySpent'; side: Side; amount: number; energyAfter: number }
    | {
        type: 'damageDealt';
        source: Side;
        target: Side;
        amount: number;
        blocked: number;
        hpLoss: number;
        hpAfter: number;
      }
    | { type: 'hpLost'; side: Side; amount: number; hpAfter: number }
    | { type: 'blockGained'; side: Side; amount: number; blockAfter: number }
    | { type: 'healed'; side: Side; amount: number; hpAfter: number }
    | { type: 'burnApplied'; source: Side; target: Side; amount: number; burnAfter: number }
    | { type: 'burnRemoved'; side: Side; amount: number }
    | { type: 'turnEnded'; side: Side; discarded: number }
    | { type: 'battleEnded'; winner: Exclude<Winner, null> }
  );

/** Event type without its id: what engine internals emit before ids are assigned. */
export type BattleEventInput = BattleEvent extends infer E
  ? E extends BattleEvent
    ? Omit<E, 'id'>
    : never
  : never;

export type RejectionReason =
  | 'battleOver'
  | 'wrongPhase'
  | 'notYourTurn'
  | 'cardNotInHand'
  | 'notEnoughEnergy'
  | 'unknownCard';

export type CommandResult =
  | { ok: true; state: BattleState; events: BattleEvent[] }
  | { ok: false; state: BattleState; reason: RejectionReason; message: string };
