import type { CardDefinition } from '../engine/types';

/**
 * The twelve original card definitions.
 * Behavior comes ONLY from `effects`; the engine never branches on card id or name.
 * Numbers are initial tuning, not proven balanced.
 */
export const CARD_DEFINITIONS: readonly CardDefinition[] = [
  {
    id: 'strike',
    name: 'Chém',
    cost: 1,
    category: 'attack',
    effects: [{ type: 'damage', amount: 6 }],
    flavor: 'Một nhát kiếm thẳng, không cầu kỳ.',
  },
  {
    id: 'guard',
    name: 'Phòng thủ',
    cost: 1,
    category: 'defense',
    effects: [{ type: 'block', amount: 5 }],
    flavor: 'Nâng khiên, giữ vững chân.',
  },
  {
    id: 'heavy_strike',
    name: 'Trọng kích',
    cost: 2,
    category: 'attack',
    effects: [{ type: 'damage', amount: 11 }],
    flavor: 'Dồn toàn lực vào một đòn duy nhất.',
  },
  {
    id: 'mend',
    name: 'Hồi phục',
    cost: 1,
    category: 'heal',
    effects: [{ type: 'heal', amount: 4 }],
    flavor: 'Ấn cổ phát sáng, vết thương khép lại.',
  },
  {
    id: 'insight',
    name: 'Sáng suốt',
    cost: 1,
    category: 'utility',
    effects: [{ type: 'draw', count: 2 }],
    flavor: 'Nhìn thấu nước đi kế tiếp.',
  },
  {
    id: 'ember',
    name: 'Tàn lửa',
    cost: 1,
    category: 'burn',
    effects: [{ type: 'applyBurn', amount: 3 }],
    flavor: 'Đốm lửa nhỏ, cháy âm ỉ thật lâu.',
  },
  {
    id: 'shield_bash',
    name: 'Khiên kích',
    cost: 1,
    category: 'defense',
    effects: [
      { type: 'block', amount: 3 },
      { type: 'damage', amount: 3 },
    ],
    flavor: 'Khiên vừa để đỡ, vừa để đánh.',
  },
  {
    id: 'fortify',
    name: 'Củng cố',
    cost: 2,
    category: 'defense',
    effects: [{ type: 'block', amount: 12 }],
    flavor: 'Dựng tường ấn đá quanh mình.',
  },
  {
    id: 'quick_cut',
    name: 'Chém nhanh',
    cost: 0,
    category: 'attack',
    effects: [{ type: 'damage', amount: 2 }],
    flavor: 'Nhanh hơn một cái chớp mắt.',
  },
  {
    id: 'twin_strike',
    name: 'Song kích',
    cost: 2,
    category: 'attack',
    effects: [{ type: 'damage', amount: 4, hits: 2 }],
    flavor: 'Hai lưỡi kiếm, hai vết chém.',
  },
  {
    id: 'cleanse',
    name: 'Thanh tẩy',
    cost: 1,
    category: 'heal',
    effects: [{ type: 'removeBurn' }, { type: 'heal', amount: 2 }],
    flavor: 'Nước suối thiêng dập tắt mọi tàn lửa.',
  },
  {
    id: 'desperate_blow',
    name: 'Liều lĩnh',
    cost: 1,
    category: 'attack',
    effects: [
      { type: 'loseHp', amount: 2 },
      { type: 'damage', amount: 10 },
    ],
    flavor: 'Đánh đổi máu thịt lấy một cơ hội.',
  },
];

const BY_ID: ReadonlyMap<string, CardDefinition> = new Map(
  CARD_DEFINITIONS.map((card) => [card.id, card]),
);

export function getCardDefinition(id: string): CardDefinition {
  const card = BY_ID.get(id);
  if (!card) throw new Error(`Unknown card definition: ${id}`);
  return card;
}

export function findCardDefinition(id: string): CardDefinition | undefined {
  return BY_ID.get(id);
}
