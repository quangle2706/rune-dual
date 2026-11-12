# Card Catalog

Source of truth: `src/content/cards.ts`. Text below is the exact generated card text
(verified by `tests/cardText.test.ts`). Numbers are initial tuning, not proven balanced.

| # | id | Name | Cost | Category | Effects (in order) | Card text |
|---|---|---|---|---|---|---|
| 1 | `strike` | Chém | 1 | Tấn công | damage 6 | Gây 6 sát thương. |
| 2 | `guard` | Phòng thủ | 1 | Phòng thủ | block 5 | Nhận 5 Giáp. |
| 3 | `heavy_strike` | Trọng kích | 2 | Tấn công | damage 11 | Gây 11 sát thương. |
| 4 | `mend` | Hồi phục | 1 | Hồi máu | heal 4 | Hồi 4 Máu. |
| 5 | `insight` | Sáng suốt | 1 | Hỗ trợ | draw 2 | Rút 2 thẻ. |
| 6 | `ember` | Tàn lửa | 1 | Thiêu đốt | applyBurn 3 | Gây 3 Thiêu đốt lên đối thủ. |
| 7 | `shield_bash` | Khiên kích | 1 | Phòng thủ | block 3, damage 3 | Nhận 3 Giáp, sau đó gây 3 sát thương. |
| 8 | `fortify` | Củng cố | 2 | Phòng thủ | block 12 | Nhận 12 Giáp. |
| 9 | `quick_cut` | Chém nhanh | 0 | Tấn công | damage 2 | Gây 2 sát thương. |
| 10 | `twin_strike` | Song kích | 2 | Tấn công | damage 4 ×2 hits | Gây 4 sát thương 2 lần (mỗi lần là một đòn riêng). |
| 11 | `cleanse` | Thanh tẩy | 1 | Hồi máu | removeBurn, heal 2 | Xóa toàn bộ Thiêu đốt trên bản thân, sau đó hồi 2 Máu. |
| 12 | `desperate_blow` | Liều lĩnh | 1 | Tấn công | loseHp 2, damage 10 | Mất 2 Máu (bỏ qua Giáp), sau đó gây 10 sát thương. Nếu bạn gục vì mất máu, các hiệu ứng sau không xảy ra. |

Category is shown as a text label + icon on every card (not color alone):
Tấn công (sword, red), Phòng thủ (shield, blue), Hồi máu (heart, green),
Thiêu đốt (flame, orange), Hỗ trợ (sparkles, purple).

## Starter deck (both sides, 20 cards)

| Card | Copies |
|---|---|
| Chém (`strike`) | 5 |
| Phòng thủ (`guard`) | 5 |
| Each of the other ten cards | 1 |

## Adding a card

1. Add a `CardDefinition` to `CARD_DEFINITIONS` using existing effect types.
2. Add an icon to `CARD_ART` in `src/components/icons.ts` (optional; falls back to category icon).
3. Add it to `STARTER_DECK_RECIPE` if it should appear in decks.
4. Update the expected text in `tests/cardText.test.ts`.
5. If you need a new effect type: extend the `Effect` union, `resolveEffect`, `describeEffect`,
   and `scoreCard` (TypeScript's exhaustive switches will point at every place).

## Decks (Milestone 3)

Source: `src/content/decks.ts`. Each deck has exactly 20 cards from the 12 above.
The player chooses one on the setup screen; each opponent uses one.

| Deck | Recipe | Used by opponent |
|---|---|---|
| Cân bằng | 5 Chém, 5 Phòng thủ, 1 of each other card | Người Gác Ấn |
| Thiêu đốt | 4 Chém, 4 Phòng thủ, 3 Tàn lửa, 3 Chém nhanh, 2 Sáng suốt, 1 Trọng kích, 1 Liều lĩnh, 1 Thanh tẩy, 1 Hồi phục | Hỏa Ấn Sư |
| Phòng ngự | 7 Khiên kích, 5 Chém, 3 Trọng kích, 2 Củng cố, 2 Thanh tẩy, 1 Hồi phục | Hộ Vệ Đá |

Win rates per matchup are in BALANCE.md.
