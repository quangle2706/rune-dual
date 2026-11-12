# Next Steps

## Done

- **Milestone 1**: playable match, engine, bot, tests, docs.
- **Milestone 2**: Home / Rules / Settings screens, result screen with stats, auto save &
  resume (validated), synthesized sound, visual polish, simulation-driven balance fix
  (see BALANCE.md).

## Known limitations

- **Balance is bot-vs-bot only.** First-seat win rate is 47.7% with the same heuristic on both
  sides. Human-vs-bot win rate is unmeasured. Card-level observations (guard overplayed,
  twin strike weaker than heavy strike, cleanse rarely useful) are recorded but not acted on.
- **Bot**: greedy heuristic, no lookahead (see ARCHITECTURE.md → "Bot limitations").
- **One save slot**, stored only in this browser. Clearing site data removes it.
- **Resume mid-bot-turn** restarts the bot's per-turn action counter (safety cap) from 0.
- **Draw outcome** is implemented and unit-tested via `outcomeFor`, but no card can produce one.
- **Artwork** is placeholder (Lucide icon on a CSS gradient), replaceable via `CARD_ART`.
- **Sound** is basic synthesized tones; no music.
- Browser checks are manual (Chrome); no automated end-to-end suite (e.g. Playwright).

## Milestone 3

- Additional opponent archetypes (e.g. Burn-focused, defensive) with per-archetype decks and
  bot weights. Re-run the balance simulation per matchup.
- Optional deck selection.
- Deployment preparation: static hosting of `dist/`, base path config, CI running
  `npm test && npm run build`, maybe a Playwright smoke test.
