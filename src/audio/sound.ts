/**
 * Tiny synthesized sound effects (Web Audio). No audio files, no network.
 * Presentation only: sounds are derived from engine events after the fact.
 */
import type { BattleEvent } from '../engine/types';

export type SoundName = 'card' | 'hit' | 'block' | 'heal' | 'burn' | 'turn' | 'victory' | 'defeat' | 'draw';

type Ctor = typeof AudioContext;

function getAudioContextCtor(): Ctor | null {
  const g = globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

interface Tone {
  freq: number;
  /** Frequency at the end of the tone (glide). */
  to?: number;
  start: number;
  dur: number;
  type: OscillatorType;
  gain: number;
}

const RECIPES: Record<SoundName, Tone[]> = {
  card: [{ freq: 520, to: 780, start: 0, dur: 0.09, type: 'triangle', gain: 0.25 }],
  hit: [
    { freq: 160, to: 55, start: 0, dur: 0.22, type: 'sine', gain: 0.6 },
    { freq: 90, to: 40, start: 0, dur: 0.12, type: 'square', gain: 0.08 },
  ],
  block: [
    { freq: 880, to: 660, start: 0, dur: 0.12, type: 'square', gain: 0.07 },
    { freq: 1320, start: 0.02, dur: 0.1, type: 'sine', gain: 0.12 },
  ],
  heal: [
    { freq: 523, start: 0, dur: 0.12, type: 'sine', gain: 0.22 },
    { freq: 659, start: 0.08, dur: 0.12, type: 'sine', gain: 0.22 },
    { freq: 784, start: 0.16, dur: 0.18, type: 'sine', gain: 0.22 },
  ],
  burn: [
    { freq: 300, to: 180, start: 0, dur: 0.25, type: 'sawtooth', gain: 0.06 },
    { freq: 220, to: 120, start: 0.05, dur: 0.25, type: 'triangle', gain: 0.15 },
  ],
  turn: [
    { freq: 660, start: 0, dur: 0.15, type: 'sine', gain: 0.15 },
    { freq: 990, start: 0.1, dur: 0.22, type: 'sine', gain: 0.1 },
  ],
  victory: [
    { freq: 523, start: 0, dur: 0.18, type: 'triangle', gain: 0.25 },
    { freq: 659, start: 0.15, dur: 0.18, type: 'triangle', gain: 0.25 },
    { freq: 784, start: 0.3, dur: 0.18, type: 'triangle', gain: 0.25 },
    { freq: 1047, start: 0.45, dur: 0.45, type: 'triangle', gain: 0.25 },
  ],
  defeat: [
    { freq: 392, start: 0, dur: 0.25, type: 'triangle', gain: 0.22 },
    { freq: 330, start: 0.22, dur: 0.25, type: 'triangle', gain: 0.22 },
    { freq: 262, start: 0.44, dur: 0.55, type: 'triangle', gain: 0.22 },
  ],
  draw: [
    { freq: 440, start: 0, dur: 0.3, type: 'triangle', gain: 0.2 },
    { freq: 440, start: 0.3, dur: 0.4, type: 'triangle', gain: 0.15 },
  ],
};

export class SoundPlayer {
  private ctx: AudioContext | null = null;
  enabled = true;
  volume = 0.6;

  /** Must be called from a user gesture at least once (browser autoplay rules). */
  unlock(): void {
    const ctx = this.context();
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      return null;
    }
    return this.ctx;
  }

  play(name: SoundName, delaySeconds = 0): void {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.context();
    if (!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + delaySeconds;
    for (const tone of RECIPES[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.freq, t0 + tone.start);
      if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, t0 + tone.start + tone.dur);
      const peak = tone.gain * this.volume;
      gain.gain.setValueAtTime(0.0001, t0 + tone.start);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + tone.start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.start + tone.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + tone.start);
      osc.stop(t0 + tone.start + tone.dur + 0.02);
    }
  }
}

/** Shared instance for the app. */
export const soundPlayer = new SoundPlayer();

/**
 * Maps one command's events to a short, ordered list of sounds (max 4).
 * Pure, so it's unit-testable.
 */
export function soundsForEvents(events: readonly BattleEvent[]): SoundName[] {
  const out: SoundName[] = [];
  const push = (s: SoundName) => {
    if (out[out.length - 1] !== s) out.push(s);
  };
  for (const e of events) {
    switch (e.type) {
      case 'cardPlayed':
        push('card');
        break;
      case 'damageDealt':
        push(e.hpLoss > 0 ? 'hit' : 'block');
        break;
      case 'hpLost':
        push('hit');
        break;
      case 'blockGained':
        push('block');
        break;
      case 'healed':
        if (e.amount > 0) push('heal');
        break;
      case 'burnApplied':
      case 'burnTicked':
        push('burn');
        break;
      case 'turnStarted':
        if (e.side === 'player') push('turn');
        break;
      case 'battleEnded':
        push(e.winner === 'player' ? 'victory' : e.winner === 'bot' ? 'defeat' : 'draw');
        break;
      default:
        break;
    }
  }
  // Keep the battle-end sound if present; cap the rest.
  const end = out.find((s) => s === 'victory' || s === 'defeat' || s === 'draw');
  const rest = out.filter((s) => s !== end).slice(0, end ? 3 : 4);
  return end ? [...rest, end] : rest;
}
