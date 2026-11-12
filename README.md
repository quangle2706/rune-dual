# Rune Duel (Đấu Ấn)

An original single-player, turn-based card battle against a heuristic bot.
Built with React + TypeScript + Vite as a learning project. All player-facing text is Vietnamese.

**Status: Milestone 1 complete** — one full player-vs-bot match with 12 cards, fixed decks,
seeded shuffle, energy/HP/block/Burn, battle log, restart, responsive UI.

## Requirements

- Node.js 22.12+ or 24+ (required by Vitest 5 / Vite 8; developed on Node 24.19, npm 11.17)

## Commands

```bash
npm install        # install exact versions from package-lock.json
npm run dev        # dev server at http://localhost:5173
npm test           # Vitest: engine, bot, card text, UI integration tests
npm run typecheck  # TypeScript (tsc) with strict settings
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build locally
```

## Project layout

```
src/
  engine/     Pure battle rules: types, seeded RNG, commands (no React)
  content/    Card definitions, starter deck, generated Vietnamese text
  bot/        Public bot view, pure decision function, turn runner
  hooks/      useBattleController: useReducer + bot timing scheduler
  components/ Presentational pieces (cards, panels, log, help)
  screens/    BattleScreen (Milestone 1 opens directly into battle)
  styles/     global.css with design tokens (CSS variables)
tests/        Vitest + React Testing Library
docs/         Rules, architecture, card catalog, next steps
```

## Documentation

- [docs/GAME_RULES.md](docs/GAME_RULES.md) — exact battle rules
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — engine/bot/UI design and data flow
- [docs/CARD_CATALOG.md](docs/CARD_CATALOG.md) — the 12 cards and starter deck
- [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) — known limitations and future milestones
