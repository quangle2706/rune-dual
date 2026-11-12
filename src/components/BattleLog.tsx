import { ScrollText } from 'lucide-react';
import { useMemo } from 'react';
import { formatEvent } from '../content/logText';
import type { BattleEvent } from '../engine/types';

const VISIBLE_LINES = 40;

export function BattleLog({ log }: { log: readonly BattleEvent[] }) {
  const lines = useMemo(() => {
    const out: { id: number; text: string; kind: string }[] = [];
    for (const e of log) {
      const text = formatEvent(e);
      if (text) out.push({ id: e.id, text, kind: e.type });
    }
    return out.slice(-VISIBLE_LINES).reverse();
  }, [log]);

  return (
    <section className="panel log" aria-labelledby="log-title">
      <h2 id="log-title" className="panel__title">
        <ScrollText size={16} aria-hidden="true" /> Nhật ký trận
      </h2>
      <ol className="log__list" role="log" aria-live="off" tabIndex={0} aria-label="Nhật ký trận, mới nhất ở trên">
        {lines.map((l) => (
          <li key={l.id} className={`log__line log__line--${l.kind}`}>
            {l.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
