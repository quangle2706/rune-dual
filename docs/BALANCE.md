# Balance Review (Milestone 2)

## Method

`npm run simulate` (source: `scripts/simulate.ts`, `src/sim/simulate.ts`) plays bot vs bot
games on seeds 1–2000 for each rule variant. Both seats use the same heuristic bot, so the
numbers measure the rules **under that bot's play style**, not under human play.
Rule numbers live in `BattleRules` (stored in every `BattleState`), so variants are data, not code.

## Finding

Milestone 1 rules: the first player won **84.5%** of games. With ~9 turns per game, moving
first means one extra full turn of damage, and 30 HP races are short.

## Variants tested (2000 seeds each)

| Variant | First-seat win rate | Avg turns | Max turns |
|---|---|---|---|
| A. Milestone 1 (no adjustment) | 84.5% | 9.1 | 35 |
| B. First turn: 2 energy | 62.6% | 9.9 | 44 |
| C. First turn: draw 4 | 81.0% | 9.7 | 35 |
| D. Second player: +1 card on first turn | 83.9% | 9.3 | 40 |
| E. B + D | 61.1% | 9.8 | 38 |
| F. First turn: 2 energy, draw 4 | 62.7% | 10.4 | 42 |
| G. 40 HP | 82.0% | 14.0 | 51 |
| H. 40 HP + B | 63.3% | 15.1 | 51 |
| I. First turn: 1 energy | 40.7% | 9.7 | 44 |
| **J. B + second player +1 energy on its first turn** | **47.7%** | 10.2 | 44 |

No variant produced a draw or hit the 200-turn cap.

Takeaways: energy is the lever; extra cards barely matter (the bot is energy-limited, not
card-limited). More HP lengthens games without fixing the seat advantage.

## Decision

`DEFAULT_RULES` = variant **J**:
- First player's turn 1: **2 energy**.
- Second player's first turn (battle turn 2): **4 energy**.
- Every later turn: 3 energy.

It is easy to explain, keeps game length almost unchanged, and lands near 50%. The human
always moves first, so this gives the bot a slight edge — reasonable because humans usually
outplay this heuristic. Tests for core rules use `BASE_RULES` (Milestone 1 numbers) so they
don't depend on this tuning.

## Card usage under DEFAULT_RULES (2000 games)

| Card | Plays per game |
|---|---|
| guard | 7.31 |
| strike | 5.73 |
| fortify | 2.14 |
| heavy_strike | 1.69 |
| ember | 1.69 |
| mend | 1.37 |
| desperate_blow | 1.35 |
| shield_bash | 1.25 |
| quick_cut | 1.22 |
| insight | 1.03 |
| twin_strike | 0.91 |
| cleanse | 0.67 |

Counts mostly follow deck copies (5 strike, 5 guard). Observations for future card tuning
(not changed yet):
- Guard is played more than strike despite equal copies — the bot's block weighting may be high,
  or block is simply efficient against a 10-damage estimate.
- Twin strike (8 damage for 2) is played less than heavy strike (11 for 2); it's strictly
  weaker unless block-related effects are added.
- Cleanse is the least played; Burn only comes from one Ember per deck.

## Caveats

- Bot-vs-bot only; human win rates will differ.
- One deck for both sides; new archetypes (Milestone 3) need a new review.
- Re-run `npm run simulate` after any card or rule change.
