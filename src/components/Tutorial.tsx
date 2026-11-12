import { GraduationCap, X } from 'lucide-react';
import type { Phase } from '../engine/types';

export type TutorialStep = 'select' | 'play' | 'end' | 'bot' | 'done';

export interface TutorialInput {
  phase: Phase;
  turnNumber: number;
  hasSelection: boolean;
  /** Cards the player has played this battle. */
  playerCardsPlayed: number;
}

/**
 * Which tutorial hint to show, derived purely from battle/UI state.
 * Returns null when there is nothing to say (e.g. battle over).
 */
export function tutorialStep(input: TutorialInput): TutorialStep | null {
  const { phase, turnNumber, hasSelection, playerCardsPlayed } = input;
  if (phase === 'GAME_OVER') return null;
  if (phase === 'BOT_ACTION') return 'bot';
  if (phase !== 'PLAYER_ACTION') return null;
  if (turnNumber >= 3) return 'done';
  if (playerCardsPlayed === 0) return hasSelection ? 'play' : 'select';
  return 'end';
}

const TEXT: Record<TutorialStep, { title: string; body: string }> = {
  select: {
    title: 'Bước 1: Chọn thẻ',
    body: 'Chạm vào một thẻ trên tay để xem chi tiết. Số trong vòng tròn vàng là Năng lượng cần dùng.',
  },
  play: {
    title: 'Bước 2: Dùng thẻ',
    body: 'Bấm “Dùng thẻ”. Lượt đầu bạn có 2 Năng lượng, các lượt sau có 3.',
  },
  end: {
    title: 'Bước 3: Kết thúc lượt',
    body: 'Dùng thêm thẻ nếu còn Năng lượng, rồi bấm “Kết thúc lượt”. Thẻ còn trên tay sẽ bị bỏ, lượt sau rút lại đủ 5.',
  },
  bot: {
    title: 'Đối thủ đang đi',
    body: 'Đối thủ đang hành động. Giáp bạn tạo ra sẽ chặn đòn của nó, rồi mất vào đầu lượt kế của bạn. Bạn vẫn có thể đọc nhật ký và luật chơi.',
  },
  done: {
    title: 'Bạn đã nắm cơ bản!',
    body: 'Mẹo: tạo Giáp trước khi kết thúc lượt, dùng Thiêu đốt để gây sát thương xuyên Giáp, và để ý Máu khi dùng Liều lĩnh.',
  },
};

/** Targets to highlight for each step (CSS hook on BattleScreen). */
export const TUTORIAL_HIGHLIGHT: Record<TutorialStep, 'hand' | 'play' | 'end' | null> = {
  select: 'hand',
  play: 'play',
  end: 'end',
  bot: null,
  done: null,
};

interface Props {
  step: TutorialStep;
  onSkip: () => void;
  onFinish: () => void;
}

/** Non-blocking coach panel. Never prevents play. */
export function TutorialPanel({ step, onSkip, onFinish }: Props) {
  const { title, body } = TEXT[step];
  return (
    <section className="tutorial" role="status" aria-live="polite" aria-label="Hướng dẫn">
      <GraduationCap size={22} aria-hidden="true" className="tutorial__icon" />
      <div className="tutorial__text">
        <p className="tutorial__title">{title}</p>
        <p className="tutorial__body">{body}</p>
      </div>
      {step === 'done' ? (
        <button type="button" className="btn btn--gold" onClick={onFinish}>
          Đã hiểu
        </button>
      ) : (
        <button type="button" className="icon-btn" onClick={onSkip} aria-label="Bỏ qua hướng dẫn">
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
