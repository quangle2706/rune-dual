import { BattleScreen } from './screens/BattleScreen';
import type { ControllerOptions } from './hooks/useBattleController';

/** Milestone 1: the battle opens directly. Home/Rules/Settings screens come in Milestone 2. */
export function App(props: ControllerOptions) {
  return <BattleScreen {...props} />;
}
