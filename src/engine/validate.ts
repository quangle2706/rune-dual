/**
 * Structural validation for BattleState loaded from untrusted storage.
 * Returns a list of problems (empty = valid). It checks shape and invariants the
 * engine relies on; it does not replay the battle.
 */
import { findCardDefinition } from '../content/cards';
import type { BattleState, Phase, Side } from './types';

const PHASES: readonly Phase[] = ['SETUP', 'TURN_START', 'PLAYER_ACTION', 'BOT_ACTION', 'TURN_END', 'GAME_OVER'];
const RESTING_PHASES: readonly Phase[] = ['PLAYER_ACTION', 'BOT_ACTION', 'GAME_OVER'];
const SIDES: readonly Side[] = ['player', 'bot'];
const RULE_KEYS = [
  'maxHp',
  'energyPerTurn',
  'turnDrawTarget',
  'handLimit',
  'firstTurnEnergy',
  'firstTurnDrawTarget',
  'secondPlayerFirstTurnDrawBonus',
  'secondPlayerFirstTurnEnergyBonus',
] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonNegInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

export function validateBattleState(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ['not an object'];
  const s = value;

  if (!isRecord(s.rules)) errors.push('rules missing');
  else {
    for (const key of RULE_KEYS) {
      if (!isNonNegInt(s.rules[key])) errors.push(`rules.${key} invalid`);
    }
    if (isNonNegInt(s.rules.maxHp) && s.rules.maxHp < 1) errors.push('rules.maxHp must be >= 1');
  }
  for (const key of ['seed', 'rngState', 'turnNumber', 'nextEventId'] as const) {
    if (!isNonNegInt(s[key])) errors.push(`${key} invalid`);
  }
  if (typeof s.rngState === 'number' && s.rngState > 0xffffffff) errors.push('rngState out of range');
  if (!PHASES.includes(s.phase as Phase)) errors.push('phase invalid');
  else if (!RESTING_PHASES.includes(s.phase as Phase)) errors.push('phase is not a resting phase');
  if (!SIDES.includes(s.activeSide as Side)) errors.push('activeSide invalid');
  if (!(s.winner === null || s.winner === 'draw' || SIDES.includes(s.winner as Side))) errors.push('winner invalid');
  if ((s.phase === 'GAME_OVER') !== (s.winner !== null)) errors.push('phase/winner mismatch');
  if (s.phase === 'PLAYER_ACTION' && s.activeSide !== 'player') errors.push('PLAYER_ACTION with bot active');
  if (s.phase === 'BOT_ACTION' && s.activeSide !== 'bot') errors.push('BOT_ACTION with player active');
  if (!Array.isArray(s.log)) errors.push('log invalid');
  else if (!s.log.every((e) => isRecord(e) && typeof e.type === 'string' && isNonNegInt(e.id))) {
    errors.push('log entries invalid');
  }

  const seenIds = new Set<string>();
  if (!isRecord(s.combatants)) errors.push('combatants missing');
  else {
    for (const side of SIDES) {
      const c = s.combatants[side];
      if (!isRecord(c)) {
        errors.push(`${side} missing`);
        continue;
      }
      for (const key of ['hp', 'maxHp', 'block', 'burn', 'energy'] as const) {
        if (!isNonNegInt(c[key])) errors.push(`${side}.${key} invalid`);
      }
      if (isNonNegInt(c.hp) && isNonNegInt(c.maxHp) && c.hp > c.maxHp) errors.push(`${side}.hp exceeds maxHp`);
      let total = 0;
      for (const pile of ['deck', 'hand', 'discard'] as const) {
        const cards = c[pile];
        if (!Array.isArray(cards)) {
          errors.push(`${side}.${pile} invalid`);
          continue;
        }
        total += cards.length;
        for (const card of cards) {
          if (!isRecord(card) || typeof card.instanceId !== 'string' || typeof card.definitionId !== 'string') {
            errors.push(`${side}.${pile} has an invalid card`);
            break;
          }
          if (!findCardDefinition(card.definitionId)) errors.push(`unknown card ${card.definitionId}`);
          if (seenIds.has(card.instanceId)) errors.push(`duplicate instance ${card.instanceId}`);
          seenIds.add(card.instanceId);
        }
      }
      if (isRecord(s.rules) && isNonNegInt(s.rules.handLimit) && Array.isArray(c.hand) && c.hand.length > s.rules.handLimit) {
        errors.push(`${side}.hand exceeds limit`);
      }
      if (total > 100) errors.push(`${side} has too many cards`);
    }
  }
  return errors;
}

export function isBattleState(value: unknown): value is BattleState {
  return validateBattleState(value).length === 0;
}
