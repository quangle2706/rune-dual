import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { BASE_RULES, createBattle } from '../src/engine/battle';
import { SAVE_KEY, emptyStats, loadSave, saveBattle } from '../src/persistence/save';
import { SETTINGS_KEY } from '../src/settings/settings';
import { cards } from './helpers';

function renderApp() {
  return render(
    <StrictMode>
      <App initialSeed={4242} seedSource={() => 777} botThinkDelay={300} botStepDelay={300} />
    </StrictMode>,
  );
}

function handButtons() {
  return within(screen.getByRole('group', { name: 'Thẻ trên tay' })).getAllByRole('button');
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('home and navigation', () => {
  it('opens on the home screen with Start / Rules / Settings and no resume button', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: /Rune Duel/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Luật chơi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cài đặt' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tiếp tục trận/ })).not.toBeInTheDocument();
  });

  it('starts a battle, saves it, and resumes the same state from home', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(screen.getByText('Lượt của bạn')).toBeInTheDocument();

    // Play one card so the saved state differs from a fresh battle.
    const first = handButtons().find((b) => !/^Sáng suốt/.test(b.getAttribute('aria-label') ?? ''))!;
    const playedLabel = first.getAttribute('aria-label');
    fireEvent.click(first);
    fireEvent.click(screen.getByRole('button', { name: 'Dùng thẻ' }));
    const handAfter = handButtons().map((b) => b.getAttribute('aria-label'));
    const saved = loadSave();
    expect(saved?.battle.combatants.player.hand).toHaveLength(handAfter.length);

    fireEvent.click(screen.getByRole('button', { name: 'Trang chủ' }));
    const resume = screen.getByRole('button', { name: /Tiếp tục trận/ });
    expect(resume).toHaveTextContent('Lượt 1');
    fireEvent.click(resume);

    expect(handButtons().map((b) => b.getAttribute('aria-label'))).toEqual(handAfter);
    expect(screen.getByRole('log').textContent).toContain('Bạn dùng thẻ');
    expect(playedLabel).toBeTruthy();
  });

  it('"Trận mới" from home replaces the saved battle', () => {
    saveBattle(createBattle(1).state, emptyStats());
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Trận mới' }));
    expect(loadSave()?.battle.seed).not.toBe(1);
  });

  it('resumes a battle saved during the bot turn and the bot finishes its turn', () => {
    const r = createBattle(5);
    const state = structuredClone(r.state);
    state.phase = 'BOT_ACTION';
    state.activeSide = 'bot';
    state.combatants.bot.hand = cards(['strike', 'guard'], 'bot');
    state.combatants.bot.energy = 3;
    saveBattle(state, emptyStats());
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục trận/ }));
    expect(screen.getByText('Lượt của Đối thủ')).toBeInTheDocument();
    for (let i = 0; i < 20 && !screen.queryByText('Lượt của bạn'); i++) {
      act(() => {
        vi.advanceTimersByTime(300);
      });
    }
    expect(screen.getByText('Lượt của bạn')).toBeInTheDocument();
  });

  it('rules screen lists all 12 cards and returns home', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Luật chơi' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Luật chơi' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Danh sách 12 thẻ' })).getAllByRole('listitem')).toHaveLength(12);
    expect(screen.getByText(/lượt đầu tiên của bạn chỉ có 2 Năng lượng/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Trang chủ' }));
    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeInTheDocument();
  });
});

describe('settings screen', () => {
  it('changes are saved and applied (bot speed, sound, reduced motion)', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Cài đặt' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Nhanh' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bật âm thanh' }));
    fireEvent.click(screen.getByRole('radio', { name: /Luôn giảm/ }));
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)!);
    expect(stored).toMatchObject({ botSpeed: 'fast', soundEnabled: false, motion: 'reduced' });
    expect(document.documentElement.dataset.motion).toBe('reduced');
    expect(screen.getByRole('slider')).toBeDisabled();
  });

  it('clears the saved battle', () => {
    saveBattle(createBattle(1).state, emptyStats());
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Cài đặt' }));
    fireEvent.click(screen.getByRole('button', { name: /Xóa trận đã lưu/ }));
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Đã xóa trận đã lưu.');
    fireEvent.click(screen.getByRole('button', { name: 'Trang chủ' }));
    expect(screen.queryByRole('button', { name: /Tiếp tục trận/ })).not.toBeInTheDocument();
  });
});

describe('result screen', () => {
  function setupNearWin() {
    const state = structuredClone(createBattle(9, BASE_RULES).state);
    state.combatants.bot.hp = 4;
    state.combatants.player.hand = cards(['strike']);
    saveBattle(state, { ...emptyStats(), damageDealt: { player: 26, bot: 3 } });
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục trận/ }));
    fireEvent.click(handButtons()[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Dùng thẻ' }));
  }

  it('shows victory with stats and clears the save', () => {
    setupNearWin();
    const dialog = screen.getByRole('dialog', { name: 'Chiến thắng!' });
    const damageRow = within(dialog).getByRole('row', { name: /Sát thương gây ra/ });
    expect(damageRow).toHaveTextContent('30');
    expect(within(dialog).getByRole('row', { name: /Thẻ đã dùng/ })).toHaveTextContent('1');
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('"Xem bàn đấu" closes the dialog to review; "Trang chủ" has no resume', () => {
    setupNearWin();
    const dialog = screen.getByRole('dialog', { name: 'Chiến thắng!' });
    fireEvent.click(within(dialog).getByRole('button', { name: /Xem bàn đấu/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('log').textContent).toContain('Bạn chiến thắng!');
    fireEvent.click(screen.getByRole('button', { name: 'Trang chủ' }));
    expect(screen.queryByRole('button', { name: /Tiếp tục trận/ })).not.toBeInTheDocument();
  });
});
