import { Trash2, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { soundPlayer } from '../audio/sound';
import type { BotSpeed, MotionPreference, Settings } from '../settings/settings';
import { PageShell } from './PageShell';

interface Props {
  settings: Settings;
  onChange: (next: Settings) => void;
  hasSave: boolean;
  onClearSave: () => void;
  onBack: () => void;
}

const SPEEDS: Array<[BotSpeed, string]> = [
  ['slow', 'Chậm'],
  ['normal', 'Vừa'],
  ['fast', 'Nhanh'],
];

const MOTIONS: Array<[MotionPreference, string, string]> = [
  ['system', 'Theo hệ thống', 'Dùng thiết lập giảm chuyển động của thiết bị.'],
  ['reduced', 'Luôn giảm', 'Tắt rung lắc và hiệu ứng bay, giữ nguyên thông tin.'],
];

export function SettingsScreen({ settings, onChange, hasSave, onClearSave, onBack }: Props) {
  const [cleared, setCleared] = useState(false);
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  return (
    <PageShell title="Cài đặt" onBack={onBack}>
      <form className="settings" onSubmit={(e) => e.preventDefault()}>
        <fieldset className="settings__group">
          <legend>Tốc độ của Đối thủ</legend>
          <div className="segmented">
            {SPEEDS.map(([value, label]) => (
              <label key={value} className={`segmented__option${settings.botSpeed === value ? ' is-checked' : ''}`}>
                <input
                  type="radio"
                  name="botSpeed"
                  value={value}
                  checked={settings.botSpeed === value}
                  onChange={() => set({ botSpeed: value })}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="settings__group">
          <legend>Âm thanh</legend>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => {
                soundPlayer.unlock();
                set({ soundEnabled: e.target.checked });
              }}
            />
            <span>Bật âm thanh</span>
          </label>
          <label className="slider">
            <span>Âm lượng: {Math.round(settings.volume * 100)}%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(settings.volume * 100)}
              disabled={!settings.soundEnabled}
              onChange={(e) => set({ volume: Number(e.target.value) / 100 })}
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={!settings.soundEnabled}
            onClick={() => {
              soundPlayer.unlock();
              soundPlayer.enabled = settings.soundEnabled;
              soundPlayer.volume = settings.volume;
              // Give a freshly resumed AudioContext a moment before playing.
              setTimeout(() => soundPlayer.play('heal'), 60);
            }}
          >
            <Volume2 size={18} aria-hidden="true" /> Nghe thử
          </button>
        </fieldset>

        <fieldset className="settings__group">
          <legend>Chuyển động</legend>
          {MOTIONS.map(([value, label, hint]) => (
            <label key={value} className="radio-row">
              <input
                type="radio"
                name="motion"
                value={value}
                checked={settings.motion === value}
                onChange={() => set({ motion: value })}
              />
              <span>
                <strong>{label}</strong>
                <span className="muted radio-row__hint">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="settings__group">
          <legend>Hướng dẫn</legend>
          <p className="muted">Hướng dẫn hiện trong trận đầu tiên. Bạn có thể xem lại ở trận kế tiếp.</p>
          <button
            type="button"
            className="btn"
            disabled={!settings.tutorialDone}
            onClick={() => set({ tutorialDone: false })}
          >
            Xem lại hướng dẫn
          </button>
          {!settings.tutorialDone && <p className="muted">Hướng dẫn sẽ hiện ở trận tiếp theo.</p>}
        </fieldset>

        <fieldset className="settings__group">
          <legend>Trận đã lưu</legend>
          <p className="muted">Trận đang chơi được tự động lưu trên thiết bị này.</p>
          <button
            type="button"
            className="btn btn--danger"
            disabled={!hasSave}
            onClick={() => {
              onClearSave();
              setCleared(true);
            }}
          >
            <Trash2 size={18} aria-hidden="true" /> Xóa trận đã lưu
          </button>
          <p className="muted" role="status">
            {cleared ? 'Đã xóa trận đã lưu.' : hasSave ? '' : 'Không có trận nào đang lưu.'}
          </p>
        </fieldset>
        <p className="muted">Cài đặt được lưu tự động.</p>
      </form>
    </PageShell>
  );
}
