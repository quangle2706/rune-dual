import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Non-blocking-to-the-rules help dialog. The bot keeps playing while it is open. */
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
          <p>Hạ Máu của Đối thủ về 0 để thắng. Nếu Máu của bạn về 0, bạn thua. Nếu cả hai cùng về 0 trong một hiệu ứng, trận hòa.</p>
          <h3>Mỗi lượt</h3>
          <ol>
            <li>Giáp cũ của bên đang tới lượt biến mất.</li>
            <li>Thiêu đốt gây sát thương (bỏ qua Giáp), rồi giảm 1.</li>
            <li>Năng lượng hồi về 3.</li>
            <li>Rút thẻ cho đến khi có 5 thẻ trên tay (không rút nếu đã có từ 5 thẻ).</li>
            <li>Dùng thẻ bằng Năng lượng, rồi bấm “Kết thúc lượt”. Thẻ còn trên tay bị bỏ.</li>
          </ol>
          <h3>Trạng thái</h3>
          <ul>
            <li><strong>Máu</strong>: tối đa 30. Hồi máu không vượt quá tối đa.</li>
            <li><strong>Giáp</strong>: chặn sát thương thường trước khi trừ Máu. Giữ đến đầu lượt kế tiếp của bạn.</li>
            <li><strong>Thiêu đốt</strong>: đầu lượt của bên bị đốt, mất Máu bằng số Thiêu đốt (bỏ qua Giáp), rồi giảm 1. Cộng dồn.</li>
            <li><strong>Năng lượng</strong>: 3 mỗi lượt, không tích lũy.</li>
          </ul>
          <h3>Thẻ</h3>
          <ul>
            <li>Chạm vào thẻ để xem chi tiết, rồi bấm “Dùng thẻ”.</li>
            <li>Tối đa 8 thẻ trên tay. Hết chồng bài thì xáo bài đã dùng thành chồng mới.</li>
            <li>Hiệu ứng xảy ra theo thứ tự ghi trên thẻ. Nếu trận kết thúc giữa chừng, các hiệu ứng sau bị bỏ qua.</li>
          </ul>
          <p className="muted">Đối thủ là máy, ra quyết định theo quy tắc đơn giản và chỉ dùng thông tin công khai.</p>
        </div>
      </div>
    </div>
  );
}
