import { BarChart3, BookOpen, Play, RotateCcw, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Props {
  canResume: boolean;
  /** e.g. "Lượt 5 · Hỏa Ấn Sư" */
  resumeLabel: string | null;
  onStart: () => void;
  onResume: () => void;
  onRules: () => void;
  onStats: () => void;
  onSettings: () => void;
}

export function HomeScreen({ canResume, resumeLabel, onStart, onResume, onRules, onStats, onSettings }: Props) {
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => firstRef.current?.focus(), []);

  return (
    <main className="home">
      <div className="home__emblem" aria-hidden="true">
        <div className="home__ring" />
        <div className="home__ring home__ring--inner" />
        <span className="home__glyph">◆</span>
      </div>
      <h1 className="home__title">
        Rune Duel
        <span className="home__subtitle">Đấu Ấn</span>
      </h1>
      <p className="home__tagline">Đấu thẻ theo lượt với ba Đối thủ ấn thuật. Chọn bộ bài, dùng Năng lượng khôn ngoan, giữ Giáp, đốt cháy đối thủ.</p>
      <nav className="home__menu" aria-label="Menu chính">
        {canResume && (
          <button ref={firstRef} type="button" className="btn btn--gold home__btn" onClick={onResume}>
            <RotateCcw size={20} aria-hidden="true" /> Tiếp tục trận
            {resumeLabel && <span className="home__hint">{resumeLabel}</span>}
          </button>
        )}
        <button
          ref={canResume ? undefined : firstRef}
          type="button"
          className={`btn home__btn ${canResume ? '' : 'btn--gold'}`}
          onClick={onStart}
        >
          <Play size={20} aria-hidden="true" /> {canResume ? 'Trận mới' : 'Bắt đầu'}
        </button>
        <button type="button" className="btn home__btn" onClick={onRules}>
          <BookOpen size={20} aria-hidden="true" /> Luật chơi
        </button>
        <button type="button" className="btn home__btn" onClick={onStats}>
          <BarChart3 size={20} aria-hidden="true" /> Thống kê
        </button>
        <button type="button" className="btn home__btn" onClick={onSettings}>
          <SettingsIcon size={20} aria-hidden="true" /> Cài đặt
        </button>
      </nav>
    </main>
  );
}
