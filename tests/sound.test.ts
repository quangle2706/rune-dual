import { describe, expect, it } from 'vitest';
import { MusicPlayer, midiToHz } from '../src/audio/music';
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

describe('MusicPlayer', () => {
  it('converts MIDI to Hz', () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(57)).toBeCloseTo(220);
  });

  it('does not start (and does not throw) without a running AudioContext', () => {
    const m = new MusicPlayer();
    expect(m.start()).toBe(false);
    expect(m.playing).toBe(false);
    expect(() => m.stop()).not.toThrow();
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
