/** One shared Web Audio context for sound effects and music (created lazily). */
type Ctor = typeof AudioContext;

let shared: AudioContext | null = null;
let failed = false;

export function getAudioContext(): AudioContext | null {
  if (shared || failed) return shared;
  const g = globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  const C = g.AudioContext ?? g.webkitAudioContext;
  if (!C) {
    failed = true;
    return null;
  }
  try {
    shared = new C();
  } catch {
    failed = true;
  }
  return shared;
}

/** Resume after a user gesture (browser autoplay policy). Safe to call often. */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
}
