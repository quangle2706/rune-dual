import { getCardDefinition } from '../content/cards';
import { CATEGORY_LABELS, describeCard } from '../content/text';
import { CARD_ART, CATEGORY_ICONS } from './icons';

interface CardFaceProps {
  definitionId: string;
  size?: 'hand' | 'large' | 'mini';
}

/** Pure presentational card face. Text is generated from effect definitions. */
export function CardFace({ definitionId, size = 'hand' }: CardFaceProps) {
  const def = getCardDefinition(definitionId);
  const Art = CARD_ART[def.id] ?? CATEGORY_ICONS[def.category];
  const CategoryIcon = CATEGORY_ICONS[def.category];
  return (
    <div className={`card-face card-face--${size} cat-${def.category}`}>
      <div className="card-face__header">
        <span className="card-face__cost" aria-label={`Chi phí ${def.cost} năng lượng`}>
          {def.cost}
        </span>
        <span className="card-face__name">{def.name}</span>
      </div>
      <div className="card-face__art" aria-hidden="true">
        <Art size={size === 'large' ? 56 : size === 'mini' ? 28 : 34} strokeWidth={1.6} />
      </div>
      <div className="card-face__type">
        <CategoryIcon size={14} aria-hidden="true" />
        <span>{CATEGORY_LABELS[def.category]}</span>
      </div>
      {size !== 'mini' && <p className="card-face__text">{describeCard(def)}</p>}
    </div>
  );
}

interface HandCardProps {
  instanceId: string;
  definitionId: string;
  selected: boolean;
  unavailableLabel: string | null;
  onSelect: (instanceId: string) => void;
}

export function HandCard({ instanceId, definitionId, selected, unavailableLabel, onSelect }: HandCardProps) {
  const def = getCardDefinition(definitionId);
  const label = `${def.name}, chi phí ${def.cost}. ${describeCard(def)}${unavailableLabel ? ` ${unavailableLabel}.` : ''}`;
  return (
    <button
      type="button"
      className={`hand-card${selected ? ' is-selected' : ''}${unavailableLabel ? ' is-unavailable' : ''}`}
      aria-pressed={selected}
      aria-label={label}
      onClick={() => onSelect(instanceId)}
    >
      <CardFace definitionId={definitionId} />
      {unavailableLabel && <span className="hand-card__badge">{unavailableLabel}</span>}
    </button>
  );
}
