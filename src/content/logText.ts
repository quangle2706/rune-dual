import type { BattleEvent, Side } from '../engine/types';
import { getCardDefinition } from './cards';
import { SIDE_NAMES } from './text';

function who(side: Side): string {
  return SIDE_NAMES[side];
}

/**
 * Turns an engine event into a Vietnamese battle-log line, or null for
 * low-signal events. The opponent's drawn cards are never named.
 */
export function formatEvent(event: BattleEvent): string | null {
  switch (event.type) {
    case 'battleStarted':
      return 'Trận đấu bắt đầu!';
    case 'turnStarted':
      return `— Lượt ${event.turnNumber}: ${event.side === 'player' ? 'lượt của Bạn' : 'lượt của Đối thủ'} —`;
    case 'blockCleared':
      return `${who(event.side)} mất ${event.amount} Giáp cũ.`;
    case 'burnTicked':
      return `${who(event.side)} chịu ${event.damage} sát thương Thiêu đốt (còn ${event.burnAfter} Thiêu đốt).`;
    case 'energyRefilled':
      return null;
    case 'cardDrawn':
      return event.side === 'player'
        ? `Bạn rút thẻ ${getCardDefinition(event.definitionId).name}.`
        : 'Đối thủ rút một thẻ.';
    case 'drawSkipped':
      return event.reason === 'handFull'
        ? `${who(event.side)} không rút thêm: tay đã đầy.`
        : `${who(event.side)} không còn thẻ để rút.`;
    case 'reshuffled':
      return `${who(event.side)} xáo ${event.count} thẻ đã dùng vào chồng bài.`;
    case 'cardPlayed':
      return `${who(event.side)} dùng thẻ ${getCardDefinition(event.definitionId).name}.`;
    case 'energySpent':
      return null;
    case 'damageDealt': {
      const blocked = event.blocked > 0 ? ` (Giáp chặn ${event.blocked})` : '';
      return `${who(event.target)} mất ${event.hpLoss} Máu${blocked}.`;
    }
    case 'hpLost':
      return `${who(event.side)} tự mất ${event.amount} Máu.`;
    case 'blockGained':
      return `${who(event.side)} nhận ${event.amount} Giáp.`;
    case 'healed':
      return `${who(event.side)} hồi ${event.amount} Máu.`;
    case 'burnApplied':
      return `${who(event.target)} bị thêm ${event.amount} Thiêu đốt (tổng ${event.burnAfter}).`;
    case 'burnRemoved':
      return event.amount > 0 ? `${who(event.side)} xóa ${event.amount} Thiêu đốt.` : `${who(event.side)} không có Thiêu đốt để xóa.`;
    case 'turnEnded':
      return `${who(event.side)} kết thúc lượt${event.discarded > 0 ? `, bỏ ${event.discarded} thẻ trên tay` : ''}.`;
    case 'battleEnded':
      return event.winner === 'draw' ? 'Hòa!' : event.winner === 'player' ? 'Bạn chiến thắng!' : 'Bạn đã thua.';
  }
}
