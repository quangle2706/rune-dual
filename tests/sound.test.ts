import { describe, expect, it } from 'vitest';
import { SoundPlayer, soundsForEvents } from '../src/audio/sound';
import { playCard } from '../src/engine/battle';
import type { BattleEvent } from '../src/engine/types';
import { makeState } from './helpers';

function eventsOf(hand: string[], botHp = 30): BattleEvent[] {
  const state = makeState({ player: { hand }, bot: { hp: botHp } });
  const r = playCard(state, 'player', state.combatants.player.hand[0]!.instanceId);
  if (!r.ok) throw new Error(r.reason);
  return r.events;
}

describe('soundsForEvents', () => {
  it('maps a strike to card + hit', () => {
    expect(soundsForEvents(eventsOf(['strike']))).toEqual(['card', 'hit']);
  });

  it('maps block, heal and burn cards', () => {
    expect(soundsForEvents(eventsOf(['guard']))).toEqual(['card', 'block']);
    expect(soundsForEvents(eventsOf(['ember']))).toEqual(['card', 'burn']);
  });

  it('collapses repeats and always keeps the battle-end sound last', () => {
    expect(soundsForEvents(eventsOf(['twin_strike']))).toEqual(['card', 'hit']);
    expect(soundsForEvents(eventsOf(['strike'], 3))).toEqual(['card', 'hit', 'victory']);
  });
});

describe('SoundPlayer', () => {
  it('is a silent no-op where Web Audio is unavailable (jsdom)', () => {
    const p = new SoundPlayer();
    expect(() => {
      p.unlock();
      p.play('hit');
    }).not.toThrow();
  });
});
