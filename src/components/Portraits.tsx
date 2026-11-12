import { useId, type ComponentType } from 'react';

/** Original placeholder portraits (inline SVG). Swap for illustrations later. */
export type PortraitComponent = ComponentType<{ size?: number }>;

function useGlow() {
  const id = `glow-${useId().replace(/:/g, '')}`;
  const def = (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.4" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
  return { id, def };
}

export function WardenPortrait({ size = 48 }: { size?: number }) {
  const glow = useGlow();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>{glow.def}</defs>
      <path d="M32 7C18 7 12 21 12 34v24h40V34C52 21 46 7 32 7Z" fill="#2b2140" stroke="#d8b66a" strokeWidth="1.5" />
      <path d="M32 7c-5 6-7 12-7 18" fill="none" stroke="#d8b66a" strokeWidth="0.8" opacity="0.5" />
      <ellipse cx="32" cy="32" rx="11" ry="13" fill="#0d0b14" />
      <g filter={`url(#${glow.id})`} fill="#f3d27a">
        <ellipse cx="27" cy="31" rx="2.4" ry="1.4" />
        <ellipse cx="37" cy="31" rx="2.4" ry="1.4" />
      </g>
      <path d="M32 44l4 5-4 5-4-5Z" fill="none" stroke="#d8b66a" strokeWidth="1.4" />
    </svg>
  );
}

export function PyromancerPortrait({ size = 48 }: { size?: number }) {
  const glow = useGlow();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>{glow.def}</defs>
      <g filter={`url(#${glow.id})`}>
        <path d="M22 16c0-5 3-8 4-11 1 4 4 6 3 11Z" fill="#ff9a3c" />
        <path d="M30 13c0-6 2-9 2-12 2 4 4 7 3 12Z" fill="#ffd36b" />
        <path d="M37 16c0-4 2-7 3-10 1 4 4 6 2 10Z" fill="#ff9a3c" />
      </g>
      <path d="M32 12C19 12 13 24 13 36v22h38V36C51 24 45 12 32 12Z" fill="#3a1712" stroke="#e0743a" strokeWidth="1.5" />
      <ellipse cx="32" cy="35" rx="10.5" ry="12" fill="#120706" />
      <g filter={`url(#${glow.id})`} fill="#ffb347">
        <path d="M24.5 34l5-1.6-1 2.6Z" />
        <path d="M39.5 34l-5-1.6 1 2.6Z" />
      </g>
      <g fill="#ffd36b" opacity="0.85">
        <circle cx="16" cy="50" r="1" />
        <circle cx="49" cy="46" r="1.2" />
        <circle cx="45" cy="54" r="0.8" />
      </g>
    </svg>
  );
}

export function GolemPortrait({ size = 48 }: { size?: number }) {
  const glow = useGlow();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>{glow.def}</defs>
      <path d="M17 17l29-3 5 24-6 18H20l-7-17Z" fill="#4a5566" stroke="#9fb3c8" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18 27h28" stroke="#2e3644" strokeWidth="3" />
      <g filter={`url(#${glow.id})`} fill="#7fd1ff">
        <rect x="22" y="30" width="7" height="3" rx="1" />
        <rect x="35" y="30" width="7" height="3" rx="1" />
      </g>
      <path d="M26 42h12" stroke="#2e3644" strokeWidth="2" strokeLinecap="round" />
      <g fill="none" stroke="#2e3644" strokeWidth="1">
        <path d="M40 16l-3 6 3 3" />
        <path d="M18 38l5 3-1 6" />
        <path d="M46 44l-4 4" />
      </g>
    </svg>
  );
}

export function PlayerPortrait({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M32 6c6 2 9 6 10 11" fill="none" stroke="#d8b66a" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 24Q32 4 46 24l2 20Q32 58 16 44Z" fill="#6c7a89" stroke="#d8b66a" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="20" y="29" width="24" height="4" rx="2" fill="#151923" />
      <path d="M32 33v16" stroke="#151923" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M22 22Q32 12 42 22" fill="none" stroke="#c9d3dd" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

export const OPPONENT_PORTRAITS: Record<string, PortraitComponent> = {
  warden: WardenPortrait,
  pyromancer: PyromancerPortrait,
  golem: GolemPortrait,
};
