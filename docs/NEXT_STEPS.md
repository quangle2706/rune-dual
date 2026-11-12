# Next Steps

## Known limitations (Milestone 1)

- **Balance**: bot-vs-bot simulation (500 seeds, same heuristic on both sides) gave
  first player 431 wins, second player 69, 0 draws; average 9 turns, max 30.
  Moving first is a big advantage (and the human always moves first). Candidate fixes:
  second player draws 6 on its first turn, first player gets 2 energy on turn 1, or higher HP.
- **Bot**: greedy heuristic, no lookahead; see ARCHITECTURE.md → "Bot limitations".
- **Draw outcome** is implemented and unit-tested via `outcomeFor`, but no current card
  can produce one in play.
- **Artwork** is placeholder (Lucide icon on a CSS gradient), replaceable via `CARD_ART`.
- **Player hand is empty during the bot turn**, because the hand is discarded at turn end
  (rule). Players can still read the log, the played-card panel, and help.
- **No persistence**: refreshing the page starts a new battle.
- Browser verification was done manually in Chrome (desktop ~1344×876 and a 390px-wide
  frame); no automated end-to-end (Playwright) suite yet.

## Milestone 2

- Home screen (Start / Rules / Settings), dedicated Rules and Settings screens.
- Settings: bot speed, reduced motion override.
- Optional save/resume: `BattleState` is already serializable JSON (store in localStorage
  with a schema version).
- Sound and visual polish (card play motion driven by events).
- Balance pass using a simulation script built on `runBotTurn` (win rate by seat, game length,
  card usage).

## Milestone 3

- Additional opponent archetypes (e.g. a Burn-focused deck, a defensive deck) with
  per-archetype bot weights.
- Optional deck selection.
- Deployment preparation (static hosting of `dist/`, base path config, CI running
  `npm test && npm run build`).
