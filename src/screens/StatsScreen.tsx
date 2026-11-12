import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PLAYER_DECKS } from '../content/decks';
import { OPPONENTS } from '../content/opponents';
import { clearRecords, loadRecords, totals, type RecordsFile } from '../persistence/records';
import { PageShell } from './PageShell';

function pct(wins: number, played: number): string {
  return played === 0 ? '—' : `${Math.round((wins / played) * 100)}%`;
}

/** Personal win/loss records per deck and opponent (browser-local). */
export function StatsScreen({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<RecordsFile>(() => loadRecords());
  const [confirming, setConfirming] = useState(false);
  const t = totals(records);

  return (
    <PageShell title="Thống kê" onBack={onBack}>
      <p className="muted">
        Kết quả các trận bạn đã chơi trên thiết bị này. So sánh với mô phỏng máy đấu máy (khoảng 45–55% mỗi cặp) để
        biết cân bằng có đúng với người chơi thật không.
      </p>
      <div className="stats-summary" role="group" aria-label="Tổng kết">
        <div>
          <strong>{t.played}</strong>
          <span>Trận</span>
        </div>
        <div>
          <strong>{t.wins}</strong>
          <span>Thắng</span>
        </div>
        <div>
          <strong>{t.losses}</strong>
          <span>Thua</span>
        </div>
        <div>
          <strong>{pct(t.wins, t.played)}</strong>
          <span>Tỉ lệ thắng</span>
        </div>
      </div>

      {t.played === 0 ? (
        <p>Chưa có trận nào kết thúc. Chơi một trận để bắt đầu ghi lại.</p>
      ) : (
        <div className="table-scroll">
          <table className="stats-table">
            <caption className="sr-only">Kết quả theo bộ bài và đối thủ</caption>
            <thead>
              <tr>
                <th scope="col">Bộ bài</th>
                <th scope="col">Đối thủ</th>
                <th scope="col">Thắng</th>
                <th scope="col">Thua</th>
                <th scope="col">Hòa</th>
                <th scope="col">Tỉ lệ thắng</th>
              </tr>
            </thead>
            <tbody>
              {PLAYER_DECKS.flatMap((d) =>
                OPPONENTS.map((o) => {
                  const r = records.matchups[`${d.id}|${o.id}`];
                  if (!r) return null;
                  const played = r.wins + r.losses + r.draws;
                  return (
                    <tr key={`${d.id}|${o.id}`}>
                      <th scope="row">{d.name}</th>
                      <td>{o.name}</td>
                      <td>{r.wins}</td>
                      <td>{r.losses}</td>
                      <td>{r.draws}</td>
                      <td>
                        {pct(r.wins, played)} <span className="muted">({played})</span>
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="stats-actions">
        {!confirming ? (
          <button type="button" className="btn btn--danger" disabled={t.played === 0} onClick={() => setConfirming(true)}>
            <Trash2 size={18} aria-hidden="true" /> Xóa thống kê
          </button>
        ) : (
          <>
            <span>Xóa toàn bộ thống kê? Không thể hoàn tác.</span>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                clearRecords();
                setRecords(loadRecords());
                setConfirming(false);
              }}
            >
              Xác nhận xóa
            </button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Hủy
            </button>
          </>
        )}
      </div>
    </PageShell>
  );
}
