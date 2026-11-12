import { CircleHelp, Handshake, Hourglass, Play, RotateCcw, SkipForward, Sparkles, Trophy, Skull } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BattleLog } from '../components/BattleLog';
import { CardFace, HandCard } from '../components/CardView';
import { CombatantPanel } from '../components/CombatantPanel';
import { HelpPanel } from '../components/HelpPanel';
import { getCardDefinition } from '../content/cards';
import { REJECTION_MESSAGES, describeCard, keywordHints } from '../content/text';
import { getEndTurnRejection, getPlayRejection } from '../engine/battle';
import type { BattleEvent, BattleState } from '../engine/types';
import { useBattleController, type ControllerOptions } from '../hooks/useBattleController';

function latestBotAction(log: readonly BattleEvent[]): string | null {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!;
    if (e.type === 'cardPlayed' && e.side === 'bot') return `Vừa dùng: ${getCardDefinition(e.definitionId).name}`;
    if (e.type === 'turnEnded' && e.side === 'bot') return 'Đã kết thúc lượt.';
  }
  return null;
}

function latestPlayed(log: readonly BattleEvent[]) {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!;
    if (e.type === 'cardPlayed') return e;
  }
  return null;
}

function PhaseBanner({ battle, paused, onRestart }: { battle: BattleState; paused: boolean; onRestart: () => void }) {
  if (battle.phase === 'GAME_OVER') {
    const w = battle.winner;
    const Icon = w === 'player' ? Trophy : w === 'bot' ? Skull : Handshake;
    const title = w === 'player' ? 'Chiến thắng!' : w === 'bot' ? 'Thất bại' : 'Hòa';
    const sub =
      w === 'player' ? 'Bạn đã hạ gục Người Gác Ấn.' : w === 'bot' ? 'Máu của bạn đã cạn.' : 'Cả hai cùng gục ngã.';
    return (
      <div className={`banner banner--over banner--${w}`} role="status">
        <Icon size={32} aria-hidden="true" />
        <div>
          <p className="banner__title">{title}</p>
          <p className="banner__sub">{sub}</p>
        </div>
        <button type="button" className="btn btn--gold" onClick={onRestart}>
          <RotateCcw size={18} aria-hidden="true" /> Chơi ván mới
        </button>
      </div>
    );
  }
  const mine = battle.activeSide === 'player';
  return (
    <div className={`banner ${mine ? 'banner--player' : 'banner--bot'}`} role="status" aria-live="polite">
      {mine ? <Sparkles size={22} aria-hidden="true" /> : <Hourglass size={22} aria-hidden="true" className="spin-slow" />}
      <div>
        <p className="banner__title">{mine ? 'Lượt của bạn' : 'Lượt của Đối thủ'}</p>
        <p className="banner__sub">
          Lượt {battle.turnNumber} ·{' '}
          {mine ? 'Chọn thẻ rồi bấm “Dùng thẻ”.' : paused ? 'Tạm dừng khi bạn rời tab.' : 'Đối thủ đang suy nghĩ…'}
        </p>
      </div>
    </div>
  );
}

const UNAVAILABLE_SHORT: Partial<Record<string, string>> = {
  notEnoughEnergy: 'Thiếu năng lượng',
};

export function BattleScreen(props: ControllerOptions) {
  const { ui, select, play, endTurn, restart, dismissNotice, pageHidden } = useBattleController(props);
  const [helpOpen, setHelpOpen] = useState(false);
  const { battle } = ui;
  const player = battle.combatants.player;
  const playerTurn = battle.phase === 'PLAYER_ACTION';

  const selected = ui.selectedId ? player.hand.find((c) => c.instanceId === ui.selectedId) ?? null : null;
  const selectedRejection = selected ? getPlayRejection(battle, 'player', selected.instanceId) : null;
  const endTurnRejection = getEndTurnRejection(battle, 'player');
  const played = latestPlayed(battle.log);
  const botAction = useMemo(() => latestBotAction(battle.log), [battle.log]);
  const detailRef = useRef<HTMLElement>(null);

  // Presentation only: on narrow screens, bring the inspected card into view above the sticky hand.
  useEffect(() => {
    if (!ui.selectedId || typeof window.matchMedia !== 'function') return;
    if (!window.matchMedia('(max-width: 600px)').matches) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    detailRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [ui.selectedId]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">◆</span>
          <h1>
            Rune Duel <span className="brand__sub">Đấu Ấn</span>
          </h1>
        </div>
        <div className="topbar__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setHelpOpen(true)}>
            <CircleHelp size={18} aria-hidden="true" /> <span>Luật chơi</span>
          </button>
          <button type="button" className="btn btn--ghost" onClick={restart}>
            <RotateCcw size={18} aria-hidden="true" /> <span>Ván mới</span>
          </button>
        </div>
      </header>

      <main className="battle">
        <CombatantPanel
          side="bot"
          combatant={battle.combatants.bot}
          active={battle.activeSide === 'bot' && battle.phase !== 'GAME_OVER'}
          events={ui.lastEvents}
          latestAction={botAction}
        />

        <section className="center" aria-label="Khu vực giữa trận">
          <div className="center__grid">
            <PhaseBanner battle={battle} paused={pageHidden} onRestart={restart} />
            <section className="panel played" aria-label="Thẻ vừa dùng">
              <h2 className="panel__title">Thẻ vừa dùng</h2>
              {played ? (
                <div className="played__body" key={played.id}>
                  <CardFace definitionId={played.definitionId} size="mini" />
                  <div>
                    <p className="played__who">{played.side === 'player' ? 'Bạn' : 'Đối thủ'}</p>
                    <p className="played__text">{describeCard(getCardDefinition(played.definitionId))}</p>
                  </div>
                </div>
              ) : (
                <p className="muted">Chưa có thẻ nào được dùng.</p>
              )}
            </section>
            <BattleLog log={battle.log} />
          </div>
        </section>

        <section className="player-area" aria-label="Khu vực của bạn">
          <CombatantPanel
            side="player"
            combatant={player}
            active={playerTurn}
            events={ui.lastEvents}
            showEnergy
          />

          <section ref={detailRef} className="panel detail" aria-labelledby="detail-title">
            <h2 id="detail-title" className="panel__title">Chi tiết thẻ</h2>
            {selected ? (
              <div className="detail__body">
                <CardFace definitionId={selected.definitionId} size="large" />
                <div className="detail__info">
                  <ul className="detail__hints">
                    {keywordHints(getCardDefinition(selected.definitionId)).map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="btn btn--play"
                    disabled={selectedRejection !== null}
                    onClick={() => play(selected.instanceId)}
                  >
                    <Play size={18} aria-hidden="true" /> Dùng thẻ
                  </button>
                  {selectedRejection && (
                    <p className="detail__reason" role="note">
                      {REJECTION_MESSAGES[selectedRejection]}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="muted">Chạm vào một thẻ trên tay để xem chi tiết.</p>
            )}
          </section>

          <section className="hand-area" aria-labelledby="hand-title">
            <div className="hand-area__head">
              <h2 id="hand-title" className="panel__title">
                Trên tay ({player.hand.length}/8)
              </h2>
              <button
                type="button"
                className="btn btn--end"
                onClick={endTurn}
                disabled={endTurnRejection !== null}
              >
                <SkipForward size={18} aria-hidden="true" /> Kết thúc lượt
              </button>
            </div>
            <div className="hand" role="group" aria-label="Thẻ trên tay">
              {player.hand.length === 0 && <p className="muted hand__empty">Không có thẻ trên tay.</p>}
              {player.hand.map((c) => {
                const reason = playerTurn ? getPlayRejection(battle, 'player', c.instanceId) : null;
                return (
                  <HandCard
                    key={c.instanceId}
                    instanceId={c.instanceId}
                    definitionId={c.definitionId}
                    selected={c.instanceId === ui.selectedId}
                    unavailableLabel={reason ? UNAVAILABLE_SHORT[reason] ?? null : null}
                    onSelect={(id) => select(id === ui.selectedId ? null : id)}
                  />
                );
              })}
            </div>
          </section>
        </section>
      </main>

      {ui.notice && (
        <div className="toast" role="alert">
          <span>{ui.notice}</span>
          <button type="button" className="icon-btn" onClick={dismissNotice} aria-label="Đóng thông báo">
            ×
          </button>
        </div>
      )}

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
