import { Eye, Handshake, Home, RotateCcw, Skull, Trophy } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Winner } from '../engine/types';
import type { MatchStats } from '../persistence/save';

interface Props {
  winner: Exclude<Winner, null>;
  opponentName: string;
  /** Shown after a defeat. */
  tip?: string;
  turns: number;
  stats: MatchStats;
  onRestart: () => void;
  /** Omitted = no home button. */
  onHome?: () => void;
  onReview: () => void;
}

const COPY = {
  player: { title: 'Chiến thắng!', sub: 'Bạn đã hạ gục {name}.', Icon: Trophy },
  bot: { title: 'Thất bại', sub: 'Máu của bạn đã cạn. Thử lại nhé!', Icon: Skull },
  draw: { title: 'Hòa', sub: 'Cả hai cùng gục ngã.', Icon: Handshake },
} as const;

/** Victory / Defeat / Draw screen, shown over the board. "Xem bàn đấu" closes it to review the log. */
export function ResultDialog({ winner, opponentName, tip, turns, stats, onRestart, onHome, onReview }: Props) {
  const { title, Icon } = COPY[winner];
  const sub = COPY[winner].sub.replace('{name}', opponentName);
  const primaryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => primaryRef.current?.focus(), []);

  return (
    <div className="modal-backdrop">
      <div className={`modal panel result result--${winner}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
        <div className="result__icon" aria-hidden="true">
          <Icon size={48} strokeWidth={1.5} />
        </div>
        <h2 id="result-title" className="result__title">
          {title}
        </h2>
        <p className="result__sub">{sub}</p>
        <table className="result__stats">
          <caption className="sr-only">Thống kê trận đấu</caption>
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">Bạn</th>
              <th scope="col">Đối thủ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Sát thương gây ra</th>
              <td>{stats.damageDealt.player}</td>
              <td>{stats.damageDealt.bot}</td>
            </tr>
            <tr>
              <th scope="row">Thẻ đã dùng</th>
              <td>{stats.cardsPlayed.player}</td>
              <td>{stats.cardsPlayed.bot}</td>
            </tr>
            <tr>
              <th scope="row">Máu đã hồi</th>
              <td>{stats.healed.player}</td>
              <td>{stats.healed.bot}</td>
            </tr>
          </tbody>
        </table>
        <p className="muted">Trận kéo dài {turns} lượt.</p>
        {winner === 'bot' && tip && (
          <p className="result__tip">
            <strong>Mẹo:</strong> {tip}
          </p>
        )}
        <div className="result__actions">
          <button ref={primaryRef} type="button" className="btn btn--gold" onClick={onRestart}>
            <RotateCcw size={18} aria-hidden="true" /> Chơi ván mới
          </button>
          <button type="button" className="btn" onClick={onReview}>
            <Eye size={18} aria-hidden="true" /> Xem bàn đấu
          </button>
          {onHome && (
            <button type="button" className="btn" onClick={onHome}>
              <Home size={18} aria-hidden="true" /> Trang chủ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
