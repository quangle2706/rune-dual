import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { RulesContent } from './RulesContent';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** In-battle rules dialog. The bot keeps playing while it is open; it only blocks pointer input to the board. */
export function HelpPanel({ open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h2 id="help-title">Luật chơi</h2>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Đóng luật chơi">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="modal__body">
          <RulesContent />
        </div>
      </div>
    </div>
  );
}
