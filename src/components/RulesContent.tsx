import { CARD_DEFINITIONS } from '../content/cards';
import { DEFAULT_RULES } from '../engine/battle';
import { CardFace } from './CardView';

/** Rules text shared by the Rules screen and the in-battle help dialog. Numbers come from DEFAULT_RULES. */
export function RulesContent({ headingLevel = 3, showCards = false }: { headingLevel?: 2 | 3; showCards?: boolean }) {
  const r = DEFAULT_RULES;
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className="rules">
      <p>
        Hạ Máu của Đối thủ về 0 để thắng. Nếu Máu của bạn về 0, bạn thua. Nếu cả hai cùng về 0 trong một hiệu ứng,
        trận hòa.
      </p>
      <H>Mỗi lượt</H>
      <ol>
        <li>Giáp cũ của bên đang tới lượt biến mất.</li>
        <li>Thiêu đốt gây sát thương (bỏ qua Giáp), rồi giảm 1.</li>
        <li>Năng lượng hồi về {r.energyPerTurn}.</li>
        <li>
          Rút thẻ cho đến khi có {r.turnDrawTarget} thẻ trên tay (không rút nếu đã có từ {r.turnDrawTarget} thẻ).
        </li>
        <li>Dùng thẻ bằng Năng lượng, rồi bấm “Kết thúc lượt”. Thẻ còn trên tay bị bỏ.</li>
      </ol>
      {(r.firstTurnEnergy !== r.energyPerTurn || r.secondPlayerFirstTurnEnergyBonus > 0) && (
        <>
          <H>Lượt mở đầu</H>
          <p>
            Bạn đi trước, nên lượt đầu tiên của bạn chỉ có {r.firstTurnEnergy} Năng lượng. Lượt đầu tiên của Đối thủ có{' '}
            {r.energyPerTurn + r.secondPlayerFirstTurnEnergyBonus} Năng lượng. Từ đó trở đi, mỗi lượt có{' '}
            {r.energyPerTurn} Năng lượng.
          </p>
        </>
      )}
      <H>Trạng thái</H>
      <ul>
        <li>
          <strong>Máu</strong>: tối đa {r.maxHp}. Hồi máu không vượt quá tối đa.
        </li>
        <li>
          <strong>Giáp</strong>: chặn sát thương thường trước khi trừ Máu. Giữ đến đầu lượt kế tiếp của bạn.
        </li>
        <li>
          <strong>Thiêu đốt</strong>: đầu lượt của bên bị đốt, mất Máu bằng số Thiêu đốt (bỏ qua Giáp), rồi giảm 1.
          Cộng dồn.
        </li>
        <li>
          <strong>Năng lượng</strong>: không tích lũy sang lượt sau.
        </li>
      </ul>
      <H>Thẻ</H>
      <ul>
        <li>Chạm vào thẻ để xem chi tiết, rồi bấm “Dùng thẻ”.</li>
        <li>Tối đa {r.handLimit} thẻ trên tay. Hết chồng bài thì xáo bài đã dùng thành chồng mới.</li>
        <li>Hiệu ứng xảy ra theo thứ tự ghi trên thẻ. Nếu trận kết thúc giữa chừng, các hiệu ứng sau bị bỏ qua.</li>
        <li>Mỗi bộ bài có 20 thẻ. Bạn chọn bộ bài và Đối thủ ở màn hình “Chuẩn bị trận”.</li>
      </ul>
      {showCards && (
        <>
          <H>Tất cả thẻ</H>
          <ul className="rules__cards" aria-label={`Danh sách ${CARD_DEFINITIONS.length} thẻ`}>
            {CARD_DEFINITIONS.map((c) => (
              <li key={c.id}>
                <CardFace definitionId={c.id} />
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="muted">Đối thủ là máy, ra quyết định theo quy tắc đơn giản và chỉ dùng thông tin công khai.</p>
    </div>
  );
}
