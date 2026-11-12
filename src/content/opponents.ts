import { DEFAULT_BOT_PROFILE, type BotProfile } from '../bot/decide';

/**
 * Opponent archetypes: a deck plus a bot weight profile. All three use the same
 * decision algorithm (src/bot/decide.ts); only the weights and deck differ.
 */
export interface OpponentDefinition {
  id: string;
  /** Vietnamese display name. */
  name: string;
  /** Short Vietnamese epithet shown under the name. */
  title: string;
  description: string;
  deckId: string;
  profile: Readonly<BotProfile>;
  /** Short Vietnamese hint about how to beat this opponent. */
  tip: string;
}

export const OPPONENTS: readonly OpponentDefinition[] = [
  {
    id: 'warden',
    name: 'Người Gác Ấn',
    title: 'Cân bằng',
    description: 'Đánh, đỡ và hồi máu đúng lúc. Đối thủ tiêu chuẩn.',
    deckId: 'balanced',
    profile: DEFAULT_BOT_PROFILE,
    tip: 'Giữ nhịp tấn công đều và đừng để Máu xuống quá thấp.',
  },
  {
    id: 'pyromancer',
    name: 'Hỏa Ấn Sư',
    title: 'Thiêu đốt',
    description: 'Rải Thiêu đốt rồi tấn công nhanh. Trận đấu ngắn và dữ dội.',
    deckId: 'burn',
    profile: {
      ...DEFAULT_BOT_PROFILE,
      burnWeight: 1.3,
    },
    tip: 'Thiêu đốt bỏ qua Giáp — giữ Thanh tẩy khi bị đốt nặng, và kết thúc trận trước khi Thiêu đốt cộng dồn.',
  },
  {
    id: 'golem',
    name: 'Hộ Vệ Đá',
    title: 'Phòng ngự',
    description: 'Vừa đỡ vừa đánh bằng Khiên kích, dập Thiêu đốt sớm.',
    deckId: 'stoneguard',
    profile: {
      ...DEFAULT_BOT_PROFILE,
      healWeight: 1.1,
      cleanseBurnThreshold: 2,
    },
    tip: 'Giáp của nó mất vào đầu lượt của nó — Thiêu đốt bỏ qua Giáp, và đòn lớn giúp xuyên phòng thủ.',
  },
];

export const DEFAULT_OPPONENT_ID = 'warden';

export function findOpponent(id: string): OpponentDefinition | undefined {
  return OPPONENTS.find((o) => o.id === id);
}

export function getOpponent(id: string): OpponentDefinition {
  const o = findOpponent(id);
  if (!o) throw new Error(`Unknown opponent: ${id}`);
  return o;
}

/** Which opponent's play style best fits each player deck (for simulating the player's seat). */
const DECK_STYLE: Record<string, string> = { balanced: 'warden', burn: 'pyromancer', fortress: 'golem', stoneguard: 'golem' };

/** The bot profile that best fits a deck (used when simulating the player's seat). */
export function profileForDeck(deckId: string): Readonly<BotProfile> {
  const id = DECK_STYLE[deckId];
  return (id ? findOpponent(id)?.profile : undefined) ?? DEFAULT_BOT_PROFILE;
}
