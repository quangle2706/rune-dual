# Game Rules

Implemented in `src/engine/battle.ts`. Vietnamese terms in parentheses.

## Goal

- Both sides start at **30 HP** (Máu), max 30.
- Reduce the opponent to 0 HP to win. Reach 0 HP yourself and you lose.
- If both sides reach 0 HP during the **same atomic effect step**, the battle is a **draw**
  (Hòa). No current card can cause this, but the rule is implemented (`outcomeFor`) and tested.

## Components per side

HP, block (Giáp), Burn (Thiêu đốt), energy (Năng lượng), a 20-card deck (Chồng bài),
a hand (Trên tay, max 8), a discard pile (Bài đã dùng).

## Phases

| Phase | Meaning |
|---|---|
| `SETUP` | Decks are being built/shuffled (only inside `createBattle`) |
| `TURN_START` | Transient, inside a command |
| `PLAYER_ACTION` | Player may play cards / end turn |
| `BOT_ACTION` | Bot may play cards / end turn |
| `TURN_END` | Transient, inside a command |
| `GAME_OVER` | Terminal; every command is rejected |

Between commands, the state always rests in `PLAYER_ACTION`, `BOT_ACTION`, or `GAME_OVER`.
Exactly one side is active. The **player takes the first turn**.

## Setup

1. Each side's 20 starter cards get unique instance ids (`player-01` … `bot-20`).
2. Player deck is shuffled, then bot deck, using the seeded RNG.
3. No opening-hand draw: the player's turn 1 starts with the normal turn-start rule.

## Turn start (active side)

1. Clear that side's remaining block.
2. If Burn > 0: lose HP equal to Burn (**bypasses block**), then Burn −1.
3. Check battle end (a Burn tick can end the game; steps 4–5 are then skipped).
4. Set energy to 3 (unspent energy does not carry over).
5. Draw until hand size is 5. If the hand already holds 5+, draw nothing.

## Playing a card

Validation order (first failure is returned, with a Vietnamese message):
`battleOver` → `notYourTurn` → `wrongPhase` → `cardNotInHand` → `unknownCard` → `notEnoughEnergy`.

On success:
1. Remove that exact instance from the hand (held aside — not in discard yet).
2. Deduct energy.
3. Resolve effects in listed order. After **every atomic step** (each hit, each heal, etc.)
   check battle end; if the battle ended, skip remaining effects.
4. Move the played card to the discard pile.

Rejected commands return the same state object: no mutation, no randomness consumed,
no energy spent, no cards moved.

## Damage, block, healing

- Normal damage is absorbed by the target's block first; the rest reduces HP.
- Block never goes negative; HP is clamped to `[0, maxHp]`.
- Block lasts until consumed or until its owner's next turn start.
- Self HP loss (`loseHp`) bypasses block.
- Healing never exceeds max HP and cannot revive a combatant at 0 HP.

## Burn

- Non-negative integer; applying Burn adds stacks.
- Ticks at the **afflicted side's** turn start (see above): damage = stacks, bypass block, then −1.
- Example: 3 Burn deals 3, then 2, then 1 over three turns (6 total).

## Drawing, hand limit, reshuffle

- Hand limit 8. A draw that would exceed it stops; the deck is untouched.
- If a draw needs a card and the deck is empty, the discard pile is shuffled (seeded) into
  a new deck. If both are empty, nothing is drawn. No fatigue damage.
- The card being played is not in the discard pile while it resolves, so it can never be
  reshuffled into its own draw.

## Turn end

1. Discard every card left in the active hand.
2. (No end-of-turn card effects exist yet.)
3. Switch active side and run turn start for the other side.

## Determinism

`createBattle(seed)` + the same sequence of commands always yields an identical state.
All randomness is mulberry32 with its state stored in `BattleState.rngState`.
