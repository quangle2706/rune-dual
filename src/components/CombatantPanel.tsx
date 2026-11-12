import { Archive, Bot, Flame, Heart, Layers, Shield, User, Zap, type LucideIcon } from 'lucide-react';
import type { BattleEvent, Combatant, Side } from '../engine/types';
import { SIDE_NAMES, TERMS } from '../content/text';

interface FloatChip {
  id: number;
  kind: 'damage' | 'heal' | 'block' | 'burn';
  text: string;
}

/** Derives transient floating numbers from the latest events. Display only. */
function chipsFor(side: Side, events: readonly BattleEvent[]): FloatChip[] {
  const chips: FloatChip[] = [];
  for (const e of events) {
    if (e.type === 'damageDealt' && e.target === side) {
      chips.push({ id: e.id, kind: 'damage', text: e.hpLoss > 0 ? `-${e.hpLoss}` : `Chặn ${e.blocked}` });
    } else if (e.type === 'hpLost' && e.side === side) {
      chips.push({ id: e.id, kind: 'damage', text: `-${e.amount}` });
    } else if (e.type === 'burnTicked' && e.side === side) {
      chips.push({ id: e.id, kind: 'burn', text: `-${e.damage}` });
    } else if (e.type === 'healed' && e.side === side && e.amount > 0) {
      chips.push({ id: e.id, kind: 'heal', text: `+${e.amount}` });
    } else if (e.type === 'blockGained' && e.side === side) {
      chips.push({ id: e.id, kind: 'block', text: `+${e.amount} Giáp` });
    }
  }
  return chips.slice(-4);
}

interface Props {
  side: Side;
  combatant: Combatant;
  active: boolean;
  events: readonly BattleEvent[];
  latestAction?: string | null;
  showEnergy?: boolean;
  energyPerTurn?: number;
  /** Display name (defaults: "Bạn" / "Đối thủ"). */
  name?: string;
  portrait?: LucideIcon;
}

export function CombatantPanel({
  side,
  combatant,
  active,
  events,
  latestAction,
  showEnergy,
  energyPerTurn = 3,
  name: displayName,
  portrait,
}: Props) {
  const c = combatant;
  const pct = Math.round((c.hp / c.maxHp) * 100);
  const chips = chipsFor(side, events);
  const hit = chips.some((ch) => ch.kind === 'damage' || ch.kind === 'burn');
  const Portrait = portrait ?? (side === 'bot' ? Bot : User);
  const name = displayName ?? (side === 'bot' ? 'Đối thủ' : 'Bạn');

  return (
    <section
      className={`combatant combatant--${side}${active ? ' is-active' : ''}`}
      aria-label={`${SIDE_NAMES[side]}: ${c.hp}/${c.maxHp} ${TERMS.hp}, ${c.block} ${TERMS.block}, ${c.burn} ${TERMS.burn}`}
    >
      <div className={`combatant__portrait${hit ? ' is-hit' : ''}`} key={hit ? chips[chips.length - 1]?.id : 'idle'} aria-hidden="true">
        <Portrait size={side === 'bot' ? 34 : 26} strokeWidth={1.5} />
      </div>
      <div className="combatant__body">
        <div className="combatant__title">
          <h2>{name}</h2>
          {active && <span className="combatant__turn">Đang hành động</span>}
        </div>
        <div className="hpbar" role="meter" aria-label={TERMS.hp} aria-valuemin={0} aria-valuemax={c.maxHp} aria-valuenow={c.hp}>
          <div className="hpbar__ghost" style={{ width: `${pct}%` }} />
          <div className="hpbar__fill" style={{ width: `${pct}%` }} />
          <span className="hpbar__text">
            <Heart size={14} aria-hidden="true" /> {c.hp}/{c.maxHp}
          </span>
        </div>
        <ul className="stats">
          <li className="stat stat--block" title={TERMS.block}>
            <Shield size={16} aria-hidden="true" />
            <span className="stat__label">{TERMS.block}</span>
            <strong>{c.block}</strong>
          </li>
          <li className={`stat stat--burn${c.burn > 0 ? ' is-on' : ''}`}>
            <Flame size={16} aria-hidden="true" />
            <span className="stat__label">{TERMS.burn}</span>
            <strong>{c.burn}</strong>
          </li>
          {showEnergy && (
            <li className="stat stat--energy">
              <Zap size={16} aria-hidden="true" />
              <span className="stat__label">{TERMS.energy}</span>
              <strong>
                {c.energy}/{energyPerTurn}
              </strong>
            </li>
          )}
          <li className="stat stat--pile">
            <Layers size={16} aria-hidden="true" />
            <span className="stat__label">{TERMS.deck}</span>
            <strong>{c.deck.length}</strong>
          </li>
          <li className="stat stat--pile">
            <Archive size={16} aria-hidden="true" />
            <span className="stat__label">{TERMS.discard}</span>
            <strong>{c.discard.length}</strong>
          </li>
          {side === 'bot' && (
            <li className="stat stat--pile">
              <span className="stat__label">{TERMS.hand}</span>
              <strong>{c.hand.length}</strong>
            </li>
          )}
        </ul>
        {latestAction !== undefined && (
          <p className="combatant__latest" aria-live="polite">
            {latestAction ?? 'Chưa hành động.'}
          </p>
        )}
      </div>
      <div className="floaters" aria-hidden="true">
        {chips.map((ch, i) => (
          <span key={ch.id} className={`floater floater--${ch.kind}`} style={{ animationDelay: `${i * 140}ms` }}>
            {ch.text}
          </span>
        ))}
      </div>
    </section>
  );
}
