/**
 * Deterministic heuristic bot. NOT optimal — see docs/ARCHITECTURE.md for its
 * limitations. Decisions are a pure function of a BotView, so they are easy to
 * test and contain no timing logic.
 */
import { getCardDefinition } from '../content/cards';
import { actionPhaseFor } from '../engine/battle';
import type { CardDefinition, CardInstance } from '../engine/types';
import type { BotView } from './view';

export type BotReason =
  | 'lethal'
  | 'cleanse'
  | 'bestValue'
  | 'noEnergy'
  | 'noUsefulPlay';

export type BotDecision =
  | { type: 'play'; instanceId: string; reason: BotReason; score: number }
  | { type: 'endTurn'; reason: BotReason };

/**
 * Tunable weights that give each opponent archetype its personality.
 * Every multiplier defaults to 1 (the Milestone 1/2 behavior).
 */
export interface BotProfile {
  /**
   * A rough guess of how much normal damage the opponent might deal next turn,
   * from public info only: 3 energy at roughly 3–4 damage per energy, discounted
   * because opponents rarely spend everything on attacks.
   */
  estimatedIncomingDamage: number;
  /** Minimum score for a play to be considered useful. */
  minUsefulScore: number;
  /** Burn at or above this is worth cleansing proactively. */
  cleanseBurnThreshold: number;
  damageWeight: number;
  blockWeight: number;
  healWeight: number;
  drawWeight: number;
  burnWeight: number;
}

export const DEFAULT_BOT_PROFILE: Readonly<BotProfile> = {
  estimatedIncomingDamage: 10,
  minUsefulScore: 1.5,
  cleanseBurnThreshold: 3,
  damageWeight: 1,
  blockWeight: 1,
  healWeight: 1,
  drawWeight: 1,
  burnWeight: 1,
};

interface Candidate {
  card: CardInstance;
  def: CardDefinition;
}

export function totalDamage(def: CardDefinition): number {
  return def.effects.reduce((sum, e) => (e.type === 'damage' ? sum + e.amount * (e.hits ?? 1) : sum), 0);
}

function selfHpCost(def: CardDefinition): number {
  return def.effects.reduce((sum, e) => (e.type === 'loseHp' ? sum + e.amount : sum), 0);
}

/** Remaining total damage a Burn stack will deal if never cleansed: b + (b-1) + ... + 1. */
function burnTotal(burn: number): number {
  return (burn * (burn + 1)) / 2;
}

function compareCandidates(a: Candidate, b: Candidate): number {
  return (
    a.def.cost - b.def.cost ||
    a.def.id.localeCompare(b.def.id) ||
    a.card.instanceId.localeCompare(b.card.instanceId)
  );
}

/**
 * Looks for a set of affordable damage cards that can kill this turn.
 * Hand size is at most 8, so checking every subset (≤ 256) is cheap.
 * Returns the card to play first (highest damage), or null.
 */
function findLethal(view: BotView, affordable: Candidate[]): Candidate | null {
  // Normal hands hold at most 8 cards; cap the search defensively anyway.
  const attackers = affordable
    .filter((c) => totalDamage(c.def) > 0)
    .sort((a, b) => totalDamage(b.def) - totalDamage(a.def) || compareCandidates(a, b))
    .slice(0, 10);
  const needed = view.opponent.hp + view.opponent.block;
  let best: Candidate[] | null = null;
  for (let mask = 1; mask < 1 << attackers.length; mask++) {
    const subset = attackers.filter((_, i) => mask & (1 << i));
    const cost = subset.reduce((s, c) => s + c.def.cost, 0);
    const selfLoss = subset.reduce((s, c) => s + selfHpCost(c.def), 0);
    const damage = subset.reduce((s, c) => s + totalDamage(c.def), 0);
    if (cost > view.self.energy || selfLoss >= view.self.hp || damage < needed) continue;
    if (!best || subset.length < best.length) best = subset;
  }
  if (!best) return null;
  return [...best].sort((a, b) => totalDamage(b.def) - totalDamage(a.def) || compareCandidates(a, b))[0] ?? null;
}

/** How many recent opponent turns the incoming-damage estimate looks at. */
export const INCOMING_HISTORY_TURNS = 3;

/**
 * Expected normal (blockable) damage from the opponent's next turn.
 * Uses public history only: the pre-block damage the opponent dealt in its
 * last few turns, blended with the profile's prior. With no history yet,
 * returns the prior. This stops two defensive bots from blocking forever
 * against an opponent that never attacks.
 */
export function estimateIncomingDamage(view: BotView, profile: Readonly<BotProfile> = DEFAULT_BOT_PROFILE): number {
  const foe = view.side === 'player' ? 'bot' : 'player';
  const perTurn: number[] = [];
  let current: number | null = null;
  for (const e of view.publicLog) {
    if (e.type === 'turnStarted') {
      if (current !== null) perTurn.push(current);
      current = e.side === foe ? 0 : null;
    } else if (current !== null && e.type === 'damageDealt' && e.source === foe) {
      current += e.amount;
    }
  }
  // An opponent turn still in progress (only possible when called off-turn) is ignored.
  const recent = perTurn.slice(-INCOMING_HISTORY_TURNS);
  if (recent.length === 0) return profile.estimatedIncomingDamage;
  const observed = recent.reduce((a, b) => a + b, 0) / recent.length;
  return 0.4 * profile.estimatedIncomingDamage + 0.6 * observed;
}

/** Heuristic value of playing `def` now. Higher is better; negative means harmful. */
export function scoreCard(view: BotView, def: CardDefinition, profile: Readonly<BotProfile> = DEFAULT_BOT_PROFILE): number {
  const { self, opponent } = view;
  const incoming = estimateIncomingDamage(view, profile);
  let score = 0;
  let hp = self.hp;
  for (const effect of def.effects) {
    switch (effect.type) {
      case 'damage': {
        const dmg = effect.amount * (effect.hits ?? 1);
        const absorbed = Math.min(dmg, opponent.block);
        const hpDamage = Math.min(opponent.hp, dmg - absorbed);
        score += (hpDamage + absorbed * 0.3) * profile.damageWeight;
        break;
      }
      case 'block': {
        const needed = Math.max(0, incoming - self.block);
        const danger = hp <= incoming ? 1.5 : 1;
        score += Math.min(effect.amount, needed) * danger * profile.blockWeight;
        break;
      }
      case 'heal': {
        const missing = self.maxHp - hp;
        const useful = Math.min(effect.amount, missing);
        score += useful * (hp <= self.maxHp / 2 ? 1.4 : 0.7) * profile.healWeight;
        break;
      }
      case 'draw': {
        const room = view.handLimit - (self.hand.length - 1);
        const available = self.deckCount + self.discardCount;
        const drawn = Math.max(0, Math.min(effect.count, room, available));
        const energyAfter = self.energy - def.cost;
        score += drawn * (energyAfter >= 1 ? 2.5 : 0.8) * profile.drawWeight;
        break;
      }
      case 'applyBurn': {
        const added = burnTotal(opponent.burn + effect.amount) - burnTotal(opponent.burn);
        score += Math.min(added, opponent.hp) * 0.8 * profile.burnWeight;
        break;
      }
      case 'removeBurn':
        score += Math.min(burnTotal(self.burn), hp);
        break;
      case 'loseHp':
        if (effect.amount >= hp) return -Infinity; // would defeat itself
        score -= effect.amount * (hp <= 10 ? 3 : 1.2);
        hp -= effect.amount;
        break;
    }
  }
  return score;
}

/**
 * Chooses the next action for `view.side`, or null if it is not that side's
 * action phase. Only ever returns plays that are legal from the view's data.
 */
export function chooseBotAction(view: BotView, profile: Readonly<BotProfile> = DEFAULT_BOT_PROFILE): BotDecision | null {
  if (view.winner !== null || view.activeSide !== view.side || view.phase !== actionPhaseFor(view.side)) {
    return null;
  }

  const candidates: Candidate[] = view.self.hand.map((card) => ({ card, def: getCardDefinition(card.definitionId) }));
  const affordable = candidates.filter((c) => c.def.cost <= view.self.energy).sort(compareCandidates);
  if (affordable.length === 0) return { type: 'endTurn', reason: 'noEnergy' };

  // 1. Lethal.
  const lethal = findLethal(view, affordable);
  if (lethal) {
    return { type: 'play', instanceId: lethal.card.instanceId, reason: 'lethal', score: Infinity };
  }

  // 2. Cleanse significant Burn (or Burn that would kill at our next turn start).
  if (view.self.burn >= profile.cleanseBurnThreshold || view.self.burn >= view.self.hp) {
    const cleanse = affordable.find((c) => c.def.effects.some((e) => e.type === 'removeBurn'));
    if (cleanse) {
      return {
        type: 'play',
        instanceId: cleanse.card.instanceId,
        reason: 'cleanse',
        score: scoreCard(view, cleanse.def, profile),
      };
    }
  }

  // 3. Best scored play (heal when injured, block vs. plausible damage, attack...).
  let best: { c: Candidate; score: number } | null = null;
  for (const c of affordable) {
    const score = scoreCard(view, c.def, profile);
    if (!best || score > best.score) best = { c, score }; // ties keep the earlier (cheaper/alphabetical) card
  }
  if (best && best.score >= profile.minUsefulScore) {
    return { type: 'play', instanceId: best.c.card.instanceId, reason: 'bestValue', score: best.score };
  }
  return { type: 'endTurn', reason: 'noUsefulPlay' };
}
