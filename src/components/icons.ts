import {
  Castle,
  Droplets,
  Eye,
  Flame,
  Hammer,
  HeartPulse,
  Shield,
  ShieldHalf,
  Skull,
  Sparkles,
  Sword,
  Swords,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { CardCategory } from '../engine/types';

/**
 * Placeholder artwork: one icon per card on a CSS gradient.
 * Replace this map (or add an image field) to swap in illustrated art later.
 */
export const CARD_ART: Record<string, LucideIcon> = {
  strike: Sword,
  guard: Shield,
  heavy_strike: Hammer,
  mend: HeartPulse,
  insight: Eye,
  ember: Flame,
  shield_bash: ShieldHalf,
  fortify: Castle,
  quick_cut: Wind,
  twin_strike: Swords,
  cleanse: Droplets,
  desperate_blow: Skull,
};

export const CATEGORY_ICONS: Record<CardCategory, LucideIcon> = {
  attack: Sword,
  defense: Shield,
  heal: HeartPulse,
  burn: Flame,
  utility: Sparkles,
};
