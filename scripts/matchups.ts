/**
 * Matchup matrix: every player deck vs every opponent archetype, bot vs bot.
 * Usage: npm run simulate:matchups [-- <games>]
 */
import { DECKS } from '../src/content/decks';
import { OPPONENTS } from '../src/content/opponents';
import { seedRange, simulateMatchups } from '../src/sim/simulate';

const games = Number(process.argv[2] ?? 1000);
const results = simulateMatchups({ seeds: seedRange(games), playerDeckIds: DECKS.map((d) => d.id) });

console.log(`Player win rate (player moves first), ${games} games per cell\n`);
console.log('Player deck \ Opponent'.padEnd(24) + OPPONENTS.map((o) => o.name.padStart(16)).join(''));
for (const deck of DECKS) {
  const row = OPPONENTS.map((o) => {
    const r = results.find((x) => x.playerDeckId === deck.id && x.opponentId === o.id)!;
    return `${(r.playerWinRate * 100).toFixed(1)}% (${r.averageTurns.toFixed(1)}t)`.padStart(16);
  });
  console.log(deck.name.padEnd(24) + row.join(''));
}
const unfinished = results.reduce((n, r) => n + r.unfinished, 0);
const maxTurns = Math.max(...results.map((r) => r.maxTurns));
console.log(`\nUnfinished games: ${unfinished}. Longest game: ${maxTurns} turns.`);
