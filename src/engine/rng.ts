/**
 * Seeded, pure pseudo-random number generation (mulberry32).
 * The RNG state is a single uint32 stored inside BattleState, so battles are
 * reproducible and serializable. Never use Math.random() in game rules.
 */

export interface RandomResult {
  /** Float in [0, 1). */
  value: number;
  nextState: number;
}

export function normalizeSeed(seed: number): number {
  return (Math.floor(seed) >>> 0) || 0x9e3779b9;
}

export function nextRandom(state: number): RandomResult {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextState };
}

/**
 * Fisher–Yates shuffle. Returns a new array and the advanced RNG state.
 * Consumes exactly (length - 1) random numbers.
 */
export function shuffle<T>(items: readonly T[], state: number): { items: T[]; nextState: number } {
  const result = items.slice();
  let rng = state;
  for (let i = result.length - 1; i > 0; i--) {
    const r = nextRandom(rng);
    rng = r.nextState;
    const j = Math.floor(r.value * (i + 1));
    const tmp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = tmp;
  }
  return { items: result, nextState: rng };
}
