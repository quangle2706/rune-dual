# Next Steps

## Done

- **Milestone 1**: playable match, pure engine, heuristic bot, tests, docs.
- **Milestone 2**: Home / Rules / Settings, result screen, validated save & resume, sound,
  polish, opening-energy rule from simulations.
- **Milestone 3**: three opponent archetypes, deck selection, adaptive bot estimate, matchup
  simulation, deployment preparation.
- **Milestone 4**: Lá chắn gai + rebalanced Phòng ngự (all matchups 45–55%), personal stats,
  first-battle tutorial, SVG card scenes and portraits, optional music, installable/offline
  app, Playwright browser tests in CI, automatic deploys from `main`.

## Known limitations

- **Balance is bot-vs-bot**; collect real results on the Thống kê page and compare.
- **Bot**: greedy, no lookahead; archetypes differ only by weights and deck.
- **One save slot**, browser-local; stats are browser-local too (no accounts by design).
- **Art** is original but simple (SVG shapes + icons); music is a short procedural loop.
  Audio output was checked for errors, not listened to, in automated checks.
- **Draw outcome** is implemented and unit-tested, but no card can produce one.
- Service worker updates apply on the next visit after a deploy (network-first pages);
  there is no in-app "new version available" prompt.

## Ideas

- Review real stats after ~20 games per matchup; retune with `npm run simulate:matchups`.
- More cards with archetype identity (e.g. "damage equal to the target's Burn").
- Bot difficulty levels (e.g. an easier bot that ignores lethal, a harder one with lookahead).
- Deck builder (out of scope for the MVP).
- Illustrated art via `CARD_ART`, `CardScene` and `OPPONENT_PORTRAITS`.
