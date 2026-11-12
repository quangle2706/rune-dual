import type { CardCategory, CardDefinition, Effect, RejectionReason, Side } from '../engine/types';

/**
 * All Vietnamese rules text is GENERATED from effect data, so the card face can
 * never drift from what the engine actually does. tests/cardText.test.ts locks
 * the exact strings for the twelve starter cards.
 */

export const TERMS = {
  hp: 'Máu',
  block: 'Giáp',
  burn: 'Thiêu đốt',
  energy: 'Năng lượng',
  deck: 'Chồng bài',
  discard: 'Bài đã dùng',
  hand: 'Trên tay',
} as const;

export const SIDE_NAMES: Record<Side, string> = {
  player: 'Bạn',
  bot: 'Đối thủ',
};

export const CATEGORY_LABELS: Record<CardCategory, string> = {
  attack: 'Tấn công',
  defense: 'Phòng thủ',
  heal: 'Hồi máu',
  burn: 'Thiêu đốt',
  utility: 'Hỗ trợ',
};

export function describeEffect(effect: Effect): string {
  switch (effect.type) {
    case 'damage': {
      const hits = effect.hits ?? 1;
      return hits > 1
        ? `gây ${effect.amount} sát thương ${hits} lần (mỗi lần là một đòn riêng)`
        : `gây ${effect.amount} sát thương`;
    }
    case 'block':
      return `nhận ${effect.amount} ${TERMS.block}`;
    case 'heal':
      return `hồi ${effect.amount} ${TERMS.hp}`;
    case 'draw':
      return `rút ${effect.count} thẻ`;
    case 'applyBurn':
      return `gây ${effect.amount} ${TERMS.burn} lên đối thủ`;
    case 'removeBurn':
      return `xóa toàn bộ ${TERMS.burn} trên bản thân`;
    case 'loseHp':
      return `mất ${effect.amount} ${TERMS.hp} (bỏ qua ${TERMS.block})`;
    case 'damageFromBlock':
      return `gây sát thương bằng số ${TERMS.block} bạn đang có`;
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('vi') + text.slice(1);
}

/** Full rules text in resolution order, e.g. "Nhận 3 Giáp, sau đó gây 3 sát thương." */
export function describeCard(card: Pick<CardDefinition, 'effects'>): string {
  const parts = card.effects.map(describeEffect);
  let text = capitalize(parts.join(', sau đó ')) + '.';
  const selfDamageIndex = card.effects.findIndex((e) => e.type === 'loseHp');
  if (selfDamageIndex >= 0 && selfDamageIndex < card.effects.length - 1) {
    text += ' Nếu bạn gục vì mất máu, các hiệu ứng sau không xảy ra.';
  }
  return text;
}

/** Keyword reminders shown on the enlarged card, so status meaning is never hover-only. */
export function keywordHints(card: Pick<CardDefinition, 'effects'>): string[] {
  const hints = new Set<string>();
  for (const effect of card.effects) {
    if (effect.type === 'block') {
      hints.add(`${TERMS.block}: chặn sát thương thường trước khi mất Máu. Mất khi bắt đầu lượt kế của bạn.`);
    }
    if (effect.type === 'damageFromBlock') {
      hints.add(`Sát thương bằng ${TERMS.block} hiện có, tính sau các hiệu ứng trước đó. ${TERMS.block} của bạn không bị tiêu hao.`);
    }
    if (effect.type === 'damage' || effect.type === 'damageFromBlock') {
      hints.add(`Sát thương thường bị ${TERMS.block} của đối thủ chặn trước, phần dư trừ vào Máu.`);
    }
    if (effect.type === 'loseHp') {
      hints.add(`Mất Máu trực tiếp: không bị ${TERMS.block} chặn.`);
    }
    if (effect.type === 'applyBurn' || effect.type === 'removeBurn') {
      hints.add(
        `${TERMS.burn}: đầu lượt của bên bị đốt, mất Máu bằng số Thiêu đốt (bỏ qua Giáp), rồi giảm 1.`,
      );
    }
    if (effect.type === 'draw') {
      hints.add('Tối đa 8 thẻ trên tay. Không rút thêm khi tay đã đầy.');
    }
  }
  return [...hints];
}

export const REJECTION_MESSAGES: Record<RejectionReason, string> = {
  battleOver: 'Trận đấu đã kết thúc.',
  wrongPhase: 'Không thể làm điều đó trong giai đoạn này.',
  notYourTurn: 'Chưa đến lượt của bạn.',
  cardNotInHand: 'Thẻ này không có trên tay.',
  notEnoughEnergy: 'Không đủ Năng lượng.',
  unknownCard: 'Thẻ không hợp lệ.',
};
