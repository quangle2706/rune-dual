import { Swords } from 'lucide-react';
import { useState } from 'react';
import { OPPONENT_PORTRAITS } from '../components/icons';
import { getCardDefinition } from '../content/cards';
import { DECKS, type DeckRecipe } from '../content/decks';
import { OPPONENTS } from '../content/opponents';
import type { BattleSetup } from '../content/setup';
import { PageShell } from './PageShell';

interface Props {
  initial: BattleSetup;
  onStart: (setup: BattleSetup) => void;
  onBack: () => void;
}

function recipeSummary(recipe: DeckRecipe): string {
  return [...recipe]
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `${n}× ${getCardDefinition(id).name}`)
    .join(', ');
}

/** Pre-battle choices: opponent archetype and the player's deck. Defaults keep a one-click start. */
export function SetupScreen({ initial, onStart, onBack }: Props) {
  const [setup, setSetup] = useState<BattleSetup>(initial);

  return (
    <PageShell title="Chuẩn bị trận" onBack={onBack}>
      <form
        className="setup"
        onSubmit={(e) => {
          e.preventDefault();
          onStart(setup);
        }}
      >
        <fieldset className="setup__group">
          <legend>Chọn đối thủ</legend>
          <div className="choice-grid">
            {OPPONENTS.map((o) => {
              const Portrait = OPPONENT_PORTRAITS[o.id];
              const checked = setup.opponentId === o.id;
              return (
                <label key={o.id} className={`choice${checked ? ' is-checked' : ''}`}>
                  <input
                    type="radio"
                    name="opponent"
                    value={o.id}
                    checked={checked}
                    onChange={() => setSetup({ ...setup, opponentId: o.id })}
                  />
                  <span className="choice__head">
                    {Portrait && (
                      <span className="choice__portrait" aria-hidden="true">
                        <Portrait size={24} strokeWidth={1.6} />
                      </span>
                    )}
                    <span>
                      <span className="choice__name">{o.name}</span>
                      <span className="choice__tag">{o.title}</span>
                    </span>
                  </span>
                  <span className="choice__desc">{o.description}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="setup__group">
          <legend>Bộ bài của bạn</legend>
          <div className="choice-grid">
            {DECKS.map((d) => {
              const checked = setup.playerDeckId === d.id;
              return (
                <label key={d.id} className={`choice${checked ? ' is-checked' : ''}`}>
                  <input
                    type="radio"
                    name="deck"
                    value={d.id}
                    checked={checked}
                    onChange={() => setSetup({ ...setup, playerDeckId: d.id })}
                  />
                  <span className="choice__name">{d.name}</span>
                  <span className="choice__desc">{d.description}</span>
                  <span className="choice__list">{recipeSummary(d.recipe)}</span>
                  {d.note && <span className="choice__note">{d.note}</span>}
                </label>
              );
            })}
          </div>
        </fieldset>

        <button type="submit" className="btn btn--gold setup__start">
          <Swords size={20} aria-hidden="true" /> Vào trận
        </button>
      </form>
    </PageShell>
  );
}
