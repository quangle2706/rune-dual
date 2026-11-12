import { describe, expect, it } from 'vitest';
import { CARD_DEFINITIONS, getCardDefinition } from '../src/content/cards';
import { describeCard } from '../src/content/text';

describe('generated Vietnamese card text', () => {
  const expected: Record<string, string> = {
    strike: 'Gây 6 sát thương.',
    guard: 'Nhận 5 Giáp.',
    heavy_strike: 'Gây 11 sát thương.',
    mend: 'Hồi 4 Máu.',
    insight: 'Rút 2 thẻ.',
    ember: 'Gây 3 Thiêu đốt lên đối thủ.',
    shield_bash: 'Nhận 3 Giáp, sau đó gây 3 sát thương.',
    fortify: 'Nhận 12 Giáp.',
    quick_cut: 'Gây 2 sát thương.',
    twin_strike: 'Gây 4 sát thương 2 lần (mỗi lần là một đòn riêng).',
    cleanse: 'Xóa toàn bộ Thiêu đốt trên bản thân, sau đó hồi 2 Máu.',
    thorn_shield: 'Nhận 2 Giáp, sau đó gây sát thương bằng số Giáp bạn đang có.',
    desperate_blow:
      'Mất 2 Máu (bỏ qua Giáp), sau đó gây 10 sát thương. Nếu bạn gục vì mất máu, các hiệu ứng sau không xảy ra.',
  };

  it('covers every definition', () => {
    expect(Object.keys(expected).sort()).toEqual(CARD_DEFINITIONS.map((c) => c.id).sort());
  });

  for (const [id, text] of Object.entries(expected)) {
    it(`${id} text matches its effects`, () => {
      expect(describeCard(getCardDefinition(id))).toBe(text);
    });
  }
});
