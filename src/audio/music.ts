/**
 * Procedural ambient background music (Web Audio, no files). Presentation only.
 * A slow A-minor progression played as soft pads with a sparse pentatonic melody.
 * Schedules a little ahead with a timer and fades in/out on start/stop.
 */
import { getAudioContext } from './context';

const BAR_SECONDS = 4;
/** MIDI notes: Am, F, C, G (low pads). */
const PROGRESSION: readonly (readonly number[])[] = [
  [45, 52, 57, 60],
  [41, 48, 53, 57],
  [36, 43, 48, 52],
  [43, 50, 55, 59],
];
/** A-minor pentatonic melody notes, picked by a fixed pattern (no randomness). */
const MELODY = [69, 72, 74, 76, 79, 76, 74, 72];
const MELODY_PATTERN = [0, 2, 4, 3, 1, 5, 6, 2, 7, 4, 3, 0];

export function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export class MusicPlayer {
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBarTime = 0;
  private bar = 0;
  private volume = 0.4;

  get playing(): boolean {
    return this.timer !== null;
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    const ctx = getAudioContext();
    if (this.master && ctx) this.master.gain.setTargetAtTime(this.level(), ctx.currentTime, 0.3);
  }

  private level(): number {
    return 0.16 * this.volume;
  }

  /** Starts playback if the audio context is running. Returns whether music is playing. */
  start(): boolean {
    if (this.timer) return true;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return false;
    this.master = ctx.createGain();
    this.master.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.master.gain.exponentialRampToValueAtTime(Math.max(0.0002, this.level()), ctx.currentTime + 2);
    this.master.connect(ctx.destination);
    this.nextBarTime = ctx.currentTime + 0.1;
    this.bar = 0;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 500);
    return true;
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const ctx = getAudioContext();
    const master = this.master;
    this.master = null;
    if (!ctx || !master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
    setTimeout(() => master.disconnect(), 1500);
  }

  private schedule(): void {
    const ctx = getAudioContext();
    if (!ctx || !this.master) return;
    while (this.nextBarTime < ctx.currentTime + 1.5) {
      this.playBar(ctx, this.master, this.nextBarTime, this.bar);
      this.nextBarTime += BAR_SECONDS;
      this.bar += 1;
    }
  }

  private playBar(ctx: AudioContext, out: GainNode, t: number, bar: number): void {
    const chord = PROGRESSION[bar % PROGRESSION.length]!;
    for (const note of chord) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = midiToHz(note);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 1.2);
      g.gain.setValueAtTime(0.18, t + BAR_SECONDS - 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + BAR_SECONDS + 1);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + BAR_SECONDS + 1.1);
    }
    // Two soft plucks per bar.
    for (let i = 0; i < 2; i++) {
      const idx = MELODY_PATTERN[(bar * 2 + i) % MELODY_PATTERN.length]!;
      const start = t + 0.5 + i * 2;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = midiToHz(MELODY[idx]!);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 1.6);
      osc.connect(g).connect(out);
      osc.start(start);
      osc.stop(start + 1.7);
    }
  }
}

export const musicPlayer = new MusicPlayer();
