# Architecture

## Layers

```
content/  (data)      cards.ts, decks.ts, text.ts, logText.ts
   ▲
engine/   (rules)     types.ts, rng.ts, battle.ts          ← pure, no React, no timers
   ▲
bot/      (AI)        view.ts → decide.ts → runner.ts       ← pure, no timers
   ▲
hooks/    (control)   useBattleController.ts                ← useReducer + timing
   ▲
screens/, components/ (rendering, animations)               ← never authoritative
```

Dependencies only point downward/upward as drawn: the engine never imports React,
and no component computes rule outcomes.

## Engine

- **State** (`BattleState`) is plain serializable JSON: combatants, phase, active side,
  winner, RNG state, bounded event log (`LOG_LIMIT = 100`), next event id.
- **Commands**: `createBattle(seed)`, `playCard(state, side, instanceId)`, `endTurn(state, side)`.
  Each returns `{ ok: true, state, events }` or `{ ok: false, state, reason, message }`.
- **Immutability**: validate first (on the original state); if valid, `structuredClone` the
  state into a draft and mutate the draft inside the command. Simple and safe for a state
  this small. Rejections return the original object untouched.
- **Effects**: a discriminated union (`damage`, `block`, `heal`, `draw`, `applyBurn`,
  `removeBurn`, `loseHp`). `resolveEffect` switches on effect type — never on card id/name.
  `damage` has optional `hits`; each hit is its own atomic step with its own event.
- **Events**: every state change emits a typed event with a unique increasing id. The UI uses
  them for the log and floating numbers. Animations read events; they can't change outcomes.
- **Helpers for UI/bot**: `getPlayRejection`, `getEndTurnRejection` expose the exact same
  validation the commands use, so "why can't I play this?" can never disagree with the engine.

## Card text

`content/text.ts` generates Vietnamese rules text from `effects`
(e.g. `[block 3, damage 3]` → "Nhận 3 Giáp, sau đó gây 3 sát thương.").
`tests/cardText.test.ts` locks the exact strings for all 12 cards, so changing a number in
`cards.ts` automatically changes the card face — and the test tells you it changed.

## Bot

- `buildBotView(state, side)` produces a `BotView` with only public info plus the bot's own
  hand and energy. It omits the opponent's hand, both decks' order, the RNG state, and the
  opponent's `cardDrawn` events. The decision function can't cheat because it never receives
  hidden data.
- `chooseBotAction(view)` is pure and deterministic:
  1. **Lethal**: enumerate subsets of affordable damage cards (≤ 2^10); if total damage ≥
     opponent HP + block (without killing itself), play the biggest hitter from that set.
  2. **Cleanse** if own Burn ≥ 3 or Burn ≥ own HP.
  3. Otherwise **score** each affordable card: HP damage (+ a little for stripping block),
     block up to an estimated 10 incoming damage (weighted up when low HP), healing (weighted
     up below half HP), draws (worth more with energy left), Burn by total future damage,
     self HP loss as a penalty (and never if it would be suicide).
  4. Play the best card if its score ≥ 1.5, else end the turn.
  Ties break by cost, then card id, then instance id.
- `applyBotStep` applies exactly one decision; a safety cap (`MAX_ACTIONS_PER_TURN = 25`)
  forces `endTurn`, and an engine rejection also falls back to `endTurn` — no loops possible.
- `runBotTurn` runs a whole turn synchronously (tests and simulations).

### Bot limitations (it is not optimal)

- Greedy one-card-at-a-time choices; no lookahead or sequencing (e.g. it won't plan
  "Sáng suốt first, then see what I draw").
- Lethal check ignores Burn that will tick on the opponent's next turn start and ignores
  draw cards that might find more damage.
- Incoming damage is a fixed estimate (10), not inferred from the player's history.
- Weights are hand-tuned, not trained or validated by large simulations.
- Under Milestone 1 rules, bot-vs-bot strongly favored whoever moved first (84.5%). The
  Milestone 2 opening-energy rule brings that to 47.7% (see BALANCE.md).

## UI controller

`useBattleController` holds `UiState` in `useReducer`:
`{ battleId, version, battle, selectedId, lastEvents, notice, botActionsThisTurn, lastBotDecision }`.

- The reducer is pure (engine commands are pure), so StrictMode's double reducer calls are harmless.
- **Bot scheduling**: a `useEffect` runs when `phase === 'BOT_ACTION'` and the page is visible.
  It sets a timeout that dispatches `{ type: 'botStep', battleId, version }`.
  The reducer ignores the step unless both ids match the current state. Effect cleanup
  clears the timer on restart/unmount/re-render. StrictMode's mount→unmount→mount cycle
  can't double-play, because a stale or duplicate request fails the version check.
- **Hidden tab**: `visibilitychange` sets `pageHidden`; the scheduler doesn't arm while
  hidden and simply re-arms on return. The bot turn resumes coherently.
- Effects never apply damage, draw cards, or award victory — they only *ask* the reducer.

## Data flow: selecting and playing a card

1. Tap a `HandCard` → `dispatch({type:'select'})` → `selectedId` set. `CardDetail` shows the
   enlarged card and asks `getPlayRejection` whether "Dùng thẻ" is enabled (and why not).
2. Tap "Dùng thẻ" → `dispatch({type:'play', instanceId})`.
3. Reducer calls `playCard(battle, 'player', id)`; the engine validates.
4. If valid: clone → remove from hand → spend energy → resolve effects with battle-end checks →
   discard → return new state + events.
5. Reducer stores the new state, increments `version`, saves `lastEvents`.
6. React re-renders: HP bars/stats from state, floating numbers and shake from `lastEvents`,
   log from `state.log`, banner from `phase`/`winner`.

## Milestone 2 additions

### Rules as data

`BattleRules` (max HP, energy, draw target, hand limit, first-turn energy/draw, second-player
bonuses) is stored in `BattleState.rules`. `createBattle(seed, rules = DEFAULT_RULES)`.
The engine reads numbers from `state.rules`, never from constants, so a saved battle keeps
its rules and simulations can compare variants. The bot reads `handLimit`/`energyPerTurn`
from its `BotView` (rule numbers are public).

### Simulation

`src/sim/simulate.ts` runs `runBotTurn` for both seats until a winner (turn cap 200) and
collects seat win rates, game length and card plays. `scripts/simulate.ts` prints a report
(`npm run simulate`). Pure and seed-driven, so results are reproducible. See BALANCE.md.

### Screens and navigation

`App` holds `screen: 'home' | 'battle' | 'rules' | 'settings'` in state; no router.
Each new or resumed battle remounts `BattleScreen` via a `key`, so no timer or reducer
state can leak between battles.

### Save / resume

- `persistence/storage.ts` wraps localStorage in try/catch (private mode, quota, blocked storage).
- `BattleScreen` saves `{ schema: 1, savedAt, battle, stats }` in an effect after every state
  change, and clears the save when the battle ends. Saving is a side effect of the new
  state, not part of the rules.
- `loadSave` parses and validates with `engine/validate.ts` (shape, ranges, known card ids,
  unique instance ids, resting phase, phase/winner/side consistency). Invalid, unreadable, or
  finished saves are removed instead of loaded.
- Resume uses `resumeUiState`: no events are replayed, so nothing animates or plays a sound
  on load. If the save was taken during the bot's turn, the scheduler simply continues it
  (the per-turn action counter restarts from 0; the engine state is unaffected).
- Because the RNG state is saved, a resumed battle continues exactly as it would have.

### Match stats

`UiState.stats` accumulates damage dealt, cards played and healing from each command's events
(the event log is bounded, so it can't be recomputed later). Presentation-only; saved with
the battle; shown on the result dialog.

### Settings

`settings/settings.ts`: `botSpeed` (delay pairs in `BOT_DELAYS`), `soundEnabled`, `volume`,
`motion` (`system` | `reduced`). Loaded values are sanitized; unknown values fall back to
defaults. `motion: 'reduced'` sets `data-motion="reduced"` on `<html>`, which applies the
same CSS overrides as `prefers-reduced-motion`.

### Sound

`audio/sound.ts` synthesizes short tones with Web Audio (no files, no network).
`soundsForEvents(events)` is a pure mapping (tested); `BattleScreen` plays the sounds for each
new batch of events. A ref holding the last sounded event id keeps sounds from playing
twice under StrictMode or on re-render. The AudioContext is created/resumed on the first
pointer or key press (browser autoplay policy). Where Web Audio is missing it's a silent no-op.

### Visual polish

All derived from state/events, never changing them: HP damage trail (a delayed "ghost" bar),
turn banner entrance, "thinking" dots during the bot turn, played-card pop-in, result dialog.
All are disabled by reduced motion.
