# Rune Duel (Đấu Ấn)

An original single-player, turn-based card battle against a heuristic bot.
Built with React + TypeScript + Vite as a learning project. All player-facing text is Vietnamese.

**Status: Milestone 3 complete.**

- Milestone 1: full player-vs-bot match with 12 cards, fixed decks, seeded shuffle,
  energy/HP/block/Burn, battle log, restart, responsive UI.
- Milestone 2: Home / Rules / Settings screens, Victory/Defeat/Draw result screen, automatic
  save & resume, synthesized sound effects, visual polish, and a simulation-driven balance fix
  (first-player win rate 84.5% → 47.7% in bot-vs-bot play).
- Milestone 3: three opponent archetypes (Người Gác Ấn, Hỏa Ấn Sư, Hộ Vệ Đá), player deck
  selection (Cân bằng, Thiêu đốt, Phòng ngự), a smarter bot damage estimate, matchup
  simulation, and deployment preparation (CI + optional GitHub Pages workflow).

## Requirements

- Node.js 22.12+ or 24+ (required by Vitest 5 / Vite 8; developed on Node 24.19, npm 11.17)

## Commands

```bash
npm install        # install exact versions from package-lock.json
npm run dev        # dev server at http://localhost:5173
npm test           # Vitest: engine, bot, persistence, sound mapping, UI/screen tests
npm run typecheck  # TypeScript (tsc) with strict settings
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build locally
npm run simulate   # bot-vs-bot balance report (default 2000 games per variant; ~1.5 min)
npm run simulate -- 300   # quicker run with 300 games per variant
npm run simulate:matchups # every deck vs every opponent (default 1000 games per cell; ~1 min)
```

Deploying: see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). `dist/` is a static site that
works from any path.

## Project layout

```
src/
  engine/       Pure battle rules: types, seeded RNG, commands, save validation (no React)
  content/      Card definitions, starter deck, generated Vietnamese text
  bot/          Public bot view, pure decision function, turn runner
  sim/          Headless bot-vs-bot simulation (rules variants, matchups)
  persistence/  Safe localStorage wrapper, battle save/resume
  settings/     Settings model (bot speed, sound, motion) and storage
  audio/        Web Audio synthesized sound effects (no audio files)
  hooks/        useBattleController: useReducer + bot timing scheduler
  components/   Presentational pieces (cards, panels, log, help, result dialog)
  screens/      Home, Setup, Battle, Rules, Settings
  styles/       global.css with design tokens (CSS variables)
scripts/        simulate.ts, matchups.ts (balance reports)
.github/        CI and manual GitHub Pages workflows
tests/          Vitest + React Testing Library
docs/           Rules, architecture, card catalog, balance, next steps
```

## Documentation

- [docs/GAME_RULES.md](docs/GAME_RULES.md): exact battle rules
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): engine/bot/UI design and data flow
- [docs/CARD_CATALOG.md](docs/CARD_CATALOG.md): the 12 cards and starter deck
- [docs/BALANCE.md](docs/BALANCE.md): simulation method, results, and the chosen rule change
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): build, CI, and optional GitHub Pages publishing
- [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md): known limitations and ideas
