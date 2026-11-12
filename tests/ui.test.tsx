import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { runBotTurn } from '../src/bot/runner';
import { createBattle, endTurn } from '../src/engine/battle';

const SEED = 4242;
const DELAY = 500;

function renderApp(seeds: number[] = [SEED, 777, 888]) {
  let i = 0;
  const seedSource = () => seeds[Math.min(i++, seeds.length - 1)]!;
  return render(
    <StrictMode>
      <App initialSeed={seeds[0]} seedSource={seedSource} botThinkDelay={DELAY} botStepDelay={DELAY} />
    </StrictMode>,
  );
}

function handButtons() {
  return within(screen.getByRole('group', { name: 'Thẻ trên tay' })).getAllByRole('button');
}

function logText() {
  return screen.getByRole('log').textContent ?? '';
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Advances time until the player's turn returns (or the battle ends). */
function runUntilPlayerTurn(maxSteps = 60) {
  for (let i = 0; i < maxSteps; i++) {
    if (screen.queryByText('Lượt của bạn') || screen.queryByText(/Chiến thắng!|Thất bại|^Hòa$/)) return;
    advance(DELAY);
  }
  throw new Error('Bot never returned control');
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Battle UI', () => {
  it('opens directly into the player turn with 5 cards', () => {
    renderApp();
    expect(screen.getByText('Lượt của bạn')).toBeInTheDocument();
    expect(handButtons()).toHaveLength(5);
    expect(screen.getByRole('heading', { name: 'Trên tay (5/8)' })).toBeInTheDocument();
  });

  it('selects a card, shows details, and plays it with the explicit button', () => {
    renderApp();
    // Pick a card without a draw effect so the hand shrinks by exactly one.
    const first = handButtons().find((b) => !/^Sáng suốt/.test(b.getAttribute('aria-label') ?? ''))!;
    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'true');
    const play = screen.getByRole('button', { name: 'Dùng thẻ' });
    expect(play).toBeEnabled();
    fireEvent.click(play);
    expect(handButtons()).toHaveLength(4);
    expect(logText()).toContain('Bạn dùng thẻ');
    expect(screen.getByText('Chạm vào một thẻ trên tay để xem chi tiết.')).toBeInTheDocument();
  });

  it('end turn hands control to the bot, which acts and returns control (StrictMode, no duplicates)', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc lượt' }));
    expect(screen.getByText('Lượt của Đối thủ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kết thúc lượt' })).toBeDisabled();

    runUntilPlayerTurn();
    expect(logText()).toContain('Đối thủ dùng thẻ');
    expect(screen.getByRole('button', { name: 'Kết thúc lượt' })).toBeEnabled();

    // The UI's bot turn must equal the pure engine + bot result exactly once.
    const afterPlayer = endTurn(createBattle(SEED).state, 'player');
    if (!afterPlayer.ok) throw new Error('unexpected');
    const expected = runBotTurn(afterPlayer.state, 'bot').state;
    const hp = expected.combatants.player.hp;
    const botPlays = expected.log.filter((e) => e.type === 'cardPlayed' && e.side === 'bot').length;
    const playerRegion = screen.getByRole('region', { name: /^Bạn:/ });
    expect(playerRegion).toHaveAccessibleName(new RegExp(`^Bạn: ${hp}/30 Máu`));
    expect((logText().match(/Đối thủ dùng thẻ/g) ?? []).length).toBe(botPlays);
  });

  it('keeps help readable during the bot turn while play controls are disabled', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc lượt' }));
    // The hand is discarded at turn end (rule), so check that help works and End Turn stays disabled.
    expect(screen.getByRole('button', { name: 'Kết thúc lượt' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Luật chơi' }));
    expect(screen.getByRole('dialog', { name: 'Luật chơi' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    runUntilPlayerTurn();
  });

  it('restart during the bot turn cancels stale bot actions', () => {
    renderApp([SEED, 999]);
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc lượt' }));
    advance(DELAY - 100); // bot is about to act
    fireEvent.click(screen.getByRole('button', { name: 'Ván mới' }));
    advance(DELAY * 20);

    expect(screen.getByText('Lượt của bạn')).toBeInTheDocument();
    expect(screen.getByText(/Lượt 1 ·/)).toBeInTheDocument();
    expect(handButtons()).toHaveLength(5);
    expect(logText()).not.toContain('Đối thủ dùng thẻ');
    expect(screen.getByRole('region', { name: /^Đối thủ:/ })).toHaveAccessibleName(/^Đối thủ: 30\/30 Máu/);

    // New battle uses the new seed.
    const expectedHand = createBattle(999).state.combatants.player.hand.length;
    expect(handButtons()).toHaveLength(expectedHand);
  });

  it('explains why a card cannot be played (not enough energy)', () => {
    // Find a seed whose opening hand contains a 2-cost card plus enough 1-cost cards.
    let seed = 1;
    for (; seed < 500; seed++) {
      const hand = createBattle(seed).state.combatants.player.hand.map((c) => c.definitionId);
      if (hand.includes('heavy_strike') && hand.filter((id) => id === 'strike' || id === 'guard').length >= 2) break;
    }
    renderApp([seed]);
    const playByName = (name: RegExp) => {
      const btn = handButtons().find((b) => name.test(b.getAttribute('aria-label') ?? ''));
      fireEvent.click(btn!);
      fireEvent.click(screen.getByRole('button', { name: 'Dùng thẻ' }));
    };
    playByName(/^(Chém|Phòng thủ),/);
    playByName(/^(Chém|Phòng thủ),/);
    const heavy = handButtons().find((b) => /^Trọng kích/.test(b.getAttribute('aria-label') ?? ''))!;
    expect(within(heavy).getByText('Thiếu năng lượng')).toBeInTheDocument();
    fireEvent.click(heavy);
    expect(screen.getByRole('button', { name: 'Dùng thẻ' })).toBeDisabled();
    expect(screen.getByRole('note')).toHaveTextContent('Không đủ Năng lượng.');
  });

  it('plays a full match to completion via repeated end turns', () => {
    renderApp();
    for (let turn = 0; turn < 200; turn++) {
      if (screen.queryByText(/Chiến thắng!|Thất bại|^Hòa$/)) break;
      // Play every affordable card, then end the turn.
      for (let n = 0; n < 10; n++) {
        const playable = handButtons().find((b) => !(b.getAttribute('aria-label') ?? '').includes('Thiếu năng lượng'));
        if (!playable || screen.queryByText(/Chiến thắng!|Thất bại|^Hòa$/)) break;
        fireEvent.click(playable);
        const play = screen.getByRole('button', { name: 'Dùng thẻ' });
        if ((play as HTMLButtonElement).disabled) break;
        fireEvent.click(play);
      }
      if (screen.queryByText(/Chiến thắng!|Thất bại|^Hòa$/)) break;
      fireEvent.click(screen.getByRole('button', { name: 'Kết thúc lượt' }));
      runUntilPlayerTurn();
    }
    expect(screen.getByText(/Chiến thắng!|Thất bại|^Hòa$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kết thúc lượt' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Chơi ván mới/ }));
    expect(screen.getByText('Lượt của bạn')).toBeInTheDocument();
  });
});
