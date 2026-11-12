import { RulesContent } from '../components/RulesContent';
import { PageShell } from './PageShell';

export function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <PageShell title="Luật chơi" onBack={onBack}>
      <RulesContent headingLevel={2} showCards />
    </PageShell>
  );
}
