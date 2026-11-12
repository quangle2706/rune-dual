# Next Steps

## Done

- **Milestone 1**: playable match, pure engine, heuristic bot, tests, docs.
- **Milestone 2**: Home / Rules / Settings screens, result screen with stats, validated auto
  save & resume, synthesized sound, visual polish, simulation-driven opening-energy rule.
- **Milestone 3**: three opponent archetypes (deck + bot profile), player deck selection on a
  setup screen, adaptive bot damage estimate, matchup simulation, deployment preparation
  (relative base path, CI workflow, manual GitHub Pages workflow, DEPLOYMENT.md).

## Known limitations

- **Phòng ngự is the weakest player deck** in bot-vs-bot simulation (33–39%). Labeled in the UI.
- **Balance is bot-vs-bot only**; human win rates are unmeasured.
- **Bot**: greedy, no lookahead; archetypes differ only by weights and deck.
- **No new card mechanics**: archetypes reuse the original 12 cards.
- **One save slot**, browser-local. Resume mid-bot-turn restarts the bot's per-turn action cap.
- **Draw outcome** is implemented and unit-tested, but no card can produce one.
- **Artwork** is placeholder (Lucide icons on CSS gradients); sound is basic synthesized tones.
- Browser checks are manual (Chrome); no automated end-to-end suite yet.
- The GitHub Pages workflow exists but has **not been run**. Publishing needs the repository
  owner to enable Pages and trigger it (see DEPLOYMENT.md).

## Ideas beyond the planned milestones

- New cards that give archetypes real identity, e.g. "damage equal to your block" for
  Phòng ngự, or "deal damage equal to the target's Burn" for Thiêu đốt. Re-run
  `npm run simulate:matchups` after each.
- A Playwright smoke test in CI (start game, play a card, end turn, see the bot act).
- Deck builder (explicitly out of scope for the MVP).
- Simple lookahead for the bot (e.g. play draw cards first when energy remains).
- Illustrated card art via the `CARD_ART` / `OPPONENT_PORTRAITS` maps.
