/**
 * Balance review: compares rule variants with bot-vs-bot simulations.
 * Usage: npm run simulate [-- <games>]
 */
import { BASE_RULES, DEFAULT_RULES } from '../src/engine/battle';
import type { BattleRules } from '../src/engine/types';
import { seedRange, simulate } from '../src/sim/simulate';

const games = Number(process.argv[2] ?? 2000);
const seeds = seedRange(games);

const variants: Array<[string, BattleRules]> = [
  ['A. Milestone 1 (no adjustment)', { ...BASE_RULES }],
  ['B. First turn: 2 energy', { ...BASE_RULES, firstTurnEnergy: 2 }],
  ['C. First turn: draw 4', { ...BASE_RULES, firstTurnDrawTarget: 4 }],
  ['D. Second player: +1 card', { ...BASE_RULES, secondPlayerFirstTurnDrawBonus: 1 }],
  ['E. B + D', { ...BASE_RULES, firstTurnEnergy: 2, secondPlayerFirstTurnDrawBonus: 1 }],
  ['F. First turn: 2 energy, draw 4', { ...BASE_RULES, firstTurnEnergy: 2, firstTurnDrawTarget: 4 }],
  ['G. 40 HP', { ...BASE_RULES, maxHp: 40 }],
  ['H. 40 HP + B', { ...BASE_RULES, maxHp: 40, firstTurnEnergy: 2 }],
  ['I. First 1 energy', { ...BASE_RULES, firstTurnEnergy: 1 }],
  ['J. B + second player +1 energy', { ...BASE_RULES, firstTurnEnergy: 2, secondPlayerFirstTurnEnergyBonus: 1 }],
  ['* Current DEFAULT_RULES', { ...DEFAULT_RULES }],
];

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
console.log(`Bot vs bot, ${games} seeds per variant\n`);
console.log('Variant'.padEnd(36), 'First seat', 'Draws', 'Avg turns', 'Max', 'Unfinished');
for (const [name, rules] of variants) {
  const r = simulate({ rules, seeds });
  console.log(
    name.padEnd(36),
    pct(r.firstSeatWinRate).padStart(10),
    String(r.draws).padStart(5),
    r.averageTurns.toFixed(1).padStart(9),
    String(r.maxTurns).padStart(4),
    String(r.unfinished).padStart(10),
  );
}

const current = simulate({ rules: { ...DEFAULT_RULES }, seeds });
console.log('\nCard plays under DEFAULT_RULES:');
for (const [id, n] of Object.entries(current.cardPlays).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${id.padEnd(16)} ${String(n).padStart(7)}  (${(n / games).toFixed(2)} per game)`);
}
