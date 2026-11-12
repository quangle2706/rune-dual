import { fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { tutorialStep } from '../src/components/Tutorial';
import { BASE_RULES, createBattle } from '../src/engine/battle';
import { RECORDS_KEY, clearRecords, loadRecords, recordResult, totals } from '../src/persistence/records';
import { emptyStats, saveBattle } from '../src/persistence/save';
import type { KeyValueStore } from '../src/persistence/storage';
import { SETTINGS_KEY } from '../src/settings/settings';
import { cards } from './helpers';

function memoryStore(): KeyValueStore {
  const data: Record<string, string> = {};
  return {
    get: (k) => data[k] ?? null,
    set: (k, v) => ((data[k] = v), true),
    remove: (k) => void delete data[k],
  };
}

const SETUP = { playerDeckId: 'balanced', opponentId: 'warden' };

describe('match records', () => {
  it('counts wins, losses and draws per matchup, once per battle token', () => {
    const store = memoryStore();
    expect(recordResult(SETUP, 'player', 'a', store)).toBe(true);
    expect(recordResult(SETUP, 'player', 'a', store)).toBe(false); // duplicate token
    recordResult(SETUP, 'bot', 'b', store);
    recordResult({ playerDeckId: 'burn', opponentId: 'golem' }, 'draw', 'c', store);
    const r = loadRecords(store);
    expect(r.matchups['balanced|warden']).toEqual({ wins: 1, losses: 1, draws: 0 });
    expect(r.matchups['burn|golem']).toEqual({ wins: 0, losses: 0, draws: 1 });
    expect(totals(r)).toEqual({ wins: 1, losses: 1, draws: 1, played: 3 });
    clearRecords(store);
    expect(totals(loadRecords(store)).played).toBe(0);
  });

  it('ignores malformed stored data', () => {
    const store = memoryStore();
    store.set(RECORDS_KEY, JSON.stringify({ matchups: { 'x|y': { wins: -1, losses: 'a', draws: 0 } }, recent: [1, 'ok'] }));
    expect(loadRecords(store)).toEqual({ matchups: {}, recent: ['ok'] });
    store.set(RECORDS_KEY, '{broken');
    expect(loadRecords(store)).toEqual({ matchups: {}, recent: [] });
  });
});

describe('tutorialStep', () => {
  const base = { phase: 'PLAYER_ACTION' as const, turnNumber: 1, hasSelection: false, playerCardsPlayed: 0 };
  it('walks select → play → end → bot → done', () => {
    expect(tutorialStep(base)).toBe('select');
    expect(tutorialStep({ ...base, hasSelection: true })).toBe('play');
    expect(tutorialStep({ ...base, playerCardsPlayed: 1 })).toBe('end');
    expect(tutorialStep({ ...base, phase: 'BOT_ACTION', turnNumber: 2 })).toBe('bot');
    expect(tutorialStep({ ...base, turnNumber: 3, playerCardsPlayed: 2 })).toBe('done');
    expect(tutorialStep({ ...base, phase: 'GAME_OVER' })).toBeNull();
  });
});

function renderApp() {
  return render(
    <StrictMode>
      <App initialSeed={4242} seedSource={() => 777} botThinkDelay={300} botStepDelay={300} />
    </StrictMode>,
  );
}

function startBattle() {
  fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
  fireEvent.click(screen.getByRole('button', { name: /Vào trận/ }));
}

describe('tutorial UI', () => {
  it('guides the first battle and can be skipped (remembered)', () => {
    renderApp();
    startBattle();
    const coach = screen.getByRole('status', { name: 'Hướng dẫn' });
    expect(coach).toHaveTextContent('Bước 1: Chọn thẻ');
    const hand = within(screen.getByRole('group', { name: 'Thẻ trên tay' })).getAllByRole('button');
    fireEvent.click(hand[0]!);
    expect(coach).toHaveTextContent('Bước 2: Dùng thẻ');

    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua hướng dẫn' }));
    expect(screen.queryByRole('status', { name: 'Hướng dẫn' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).tutorialDone).toBe(true);
  });

  it('does not show once done, and "Xem lại hướng dẫn" brings it back', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ tutorialDone: true }));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Cài đặt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem lại hướng dẫn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trang chủ' }));
    startBattle();
    expect(screen.getByRole('status', { name: 'Hướng dẫn' })).toBeInTheDocument();
  });
});

describe('stats screen', () => {
  it('records a finished battle and shows it', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ tutorialDone: true }));
    const state = structuredClone(createBattle(9, BASE_RULES).state);
    state.combatants.bot.hp = 4;
    state.combatants.player.hand = cards(['strike']);
    saveBattle(state, emptyStats());
    renderApp();
    expect(screen.getByRole('button', { name: 'Thống kê' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục trận/ }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Thẻ trên tay' })).getAllByRole('button')[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Dùng thẻ' }));
    expect(screen.getByRole('dialog', { name: 'Chiến thắng!' })).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Trang chủ/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Thống kê' }));
    const row = screen.getByRole('row', { name: /Cân bằng/ });
    expect(row).toHaveTextContent('Người Gác Ấn');
    expect(row).toHaveTextContent('100%');
    expect(totals(loadRecords()).played).toBe(1); // StrictMode did not double count

    fireEvent.click(screen.getByRole('button', { name: /Xóa thống kê/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));
    expect(screen.getByText(/Chưa có trận nào kết thúc/)).toBeInTheDocument();
  });
});
