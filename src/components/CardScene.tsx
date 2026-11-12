import { useId } from 'react';
import type { CardCategory } from '../engine/types';

/**
 * Original decorative background for card art (pure SVG, no assets).
 * One scene per category; the card's emblem icon is layered on top via CSS.
 */
const PALETTE: Record<CardCategory, [string, string, string]> = {
  attack: ['#c4565a', '#2a1420', '#ffd9c9'],
  defense: ['#4f86ad', '#141e2c', '#cfe6ff'],
  heal: ['#53966a', '#12241a', '#d7f5c9'],
  burn: ['#e0743a', '#2a120a', '#ffe08a'],
  utility: ['#8a68b0', '#171228', '#efe3ff'],
};

function Motif({ category, light }: { category: CardCategory; light: string }) {
  switch (category) {
    case 'attack':
      return (
        <g stroke={light} strokeLinecap="round" opacity="0.28">
          <line x1="8" y1="54" x2="44" y2="6" strokeWidth="2" />
          <line x1="24" y1="58" x2="62" y2="8" strokeWidth="1.2" />
          <line x1="78" y1="56" x2="112" y2="10" strokeWidth="1.6" />
          <line x1="92" y1="58" x2="118" y2="24" strokeWidth="0.9" />
        </g>
      );
    case 'defense': {
      const hex = (x: number, y: number) =>
        `M${x} ${y - 7} L${x + 6} ${y - 3.5} L${x + 6} ${y + 3.5} L${x} ${y + 7} L${x - 6} ${y + 3.5} L${x - 6} ${y - 3.5} Z`;
      const cells = [
        [12, 12], [24, 12], [96, 12], [108, 12], [18, 23], [102, 23], [12, 34], [108, 34], [18, 45], [102, 45], [24, 56], [96, 56],
      ];
      return (
        <g fill="none" stroke={light} strokeWidth="0.8" opacity="0.22">
          {cells.map(([x, y]) => (
            <path key={`${x}-${y}`} d={hex(x!, y!)} />
          ))}
        </g>
      );
    }
    case 'heal':
      return (
        <g fill={light}>
          {[
            [14, 48, 2.2], [26, 38, 1.4], [20, 20, 1.8], [100, 44, 2], [108, 26, 1.4], [92, 14, 1.2], [60, 54, 1.2], [40, 10, 1],
          ].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} opacity="0.45" />
          ))}
          <path d="M6 60 Q18 44 30 60 Z" opacity="0.18" />
          <path d="M90 60 Q104 40 118 60 Z" opacity="0.18" />
        </g>
      );
    case 'burn':
      return (
        <g>
          <path d="M0 60 Q10 42 18 52 Q24 36 34 50 Q40 40 46 60 Z" fill="#ff9a3c" opacity="0.35" />
          <path d="M74 60 Q82 40 90 52 Q98 34 106 50 Q112 42 120 60 Z" fill="#ff9a3c" opacity="0.35" />
          {[
            [20, 24, 1.4], [30, 14, 1], [96, 20, 1.6], [86, 10, 1], [108, 30, 1.2], [12, 36, 1],
          ].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={light} opacity="0.7" />
          ))}
        </g>
      );
    case 'utility':
      return (
        <g>
          <circle cx="60" cy="30" r="24" fill="none" stroke={light} strokeWidth="0.8" strokeDasharray="2 3" opacity="0.35" />
          <circle cx="60" cy="30" r="18" fill="none" stroke={light} strokeWidth="0.5" opacity="0.25" />
          {[
            [12, 10], [24, 48], [100, 12], [110, 40], [88, 52], [32, 22], [8, 32],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill={light} opacity="0.8" />
          ))}
        </g>
      );
  }
}

export function CardScene({ category }: { category: CardCategory }) {
  const id = useId().replace(/:/g, '');
  const [main, dark, light] = PALETTE[category];
  return (
    <svg className="card-scene" viewBox="0 0 120 60" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={main} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <radialGradient id={`glow-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={light} stopOpacity="0.45" />
          <stop offset="1" stopColor={light} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="60" fill={`url(#bg-${id})`} />
      <Motif category={category} light={light} />
      <ellipse cx="60" cy="30" rx="30" ry="22" fill={`url(#glow-${id})`} />
    </svg>
  );
}
