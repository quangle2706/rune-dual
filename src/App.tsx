import { useCallback, useEffect, useState } from 'react';
import { soundPlayer } from './audio/sound';
import { getOpponent } from './content/opponents';
import type { BattleSetup } from './content/setup';
import type { ControllerOptions } from './hooks/useBattleController';
import { clearSave, loadSave, type SaveFile } from './persistence/save';
import { BattleScreen } from './screens/BattleScreen';
import { HomeScreen } from './screens/HomeScreen';
import { RulesScreen } from './screens/RulesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SetupScreen } from './screens/SetupScreen';
import { StatsScreen } from './screens/StatsScreen';
import {
  BOT_DELAYS,
  loadLastSetup,
  loadSettings,
  saveLastSetup,
  saveSettings,
  type Settings,
} from './settings/settings';

export type Screen = 'home' | 'setup' | 'battle' | 'rules' | 'settings' | 'stats';

export interface AppProps
  extends Pick<ControllerOptions, 'initialSeed' | 'seedSource' | 'botThinkDelay' | 'botStepDelay'> {
  initialScreen?: Screen;
}

/**
 * Screen navigation via plain state (no router needed for five screens).
 * Each new battle (or resume) remounts BattleScreen through `battleKey`, so
 * no timers or state leak between battles.
 */
export function App({ initialScreen = 'home', initialSeed, seedSource, botThinkDelay, botStepDelay }: AppProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [save, setSave] = useState<SaveFile | null>(() => loadSave());
  const [resume, setResume] = useState<SaveFile | null>(null);
  const [setup, setSetup] = useState<BattleSetup>(() => loadLastSetup());
  const [battleKey, setBattleKey] = useState(0);

  // Apply settings to presentation systems.
  useEffect(() => {
    soundPlayer.enabled = settings.soundEnabled;
    soundPlayer.volume = settings.volume;
    if (settings.motion === 'reduced') document.documentElement.dataset.motion = 'reduced';
    else delete document.documentElement.dataset.motion;
  }, [settings]);

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const goHome = useCallback(() => {
    setSave(loadSave());
    setScreen('home');
  }, []);

  const startNew = useCallback((chosen: BattleSetup) => {
    clearSave();
    saveLastSetup(chosen);
    setSetup(chosen);
    setResume(null);
    setBattleKey((k) => k + 1);
    setScreen('battle');
  }, []);

  const resumeSaved = useCallback(() => {
    const current = loadSave();
    if (!current) {
      setSave(null);
      return;
    }
    setResume(current);
    setBattleKey((k) => k + 1);
    setScreen('battle');
  }, []);

  const [think, step] = BOT_DELAYS[settings.botSpeed];

  switch (screen) {
    case 'battle':
      return (
        <BattleScreen
          key={battleKey}
          onExit={goHome}
          // Tests pass a fixed seed for the first battle only.
          initialSeed={battleKey <= 1 ? initialSeed : undefined}
          seedSource={seedSource}
          setup={setup}
          resume={resume ? { battle: resume.battle, stats: resume.stats, setup: resume.setup } : undefined}
          botThinkDelay={botThinkDelay ?? think}
          botStepDelay={botStepDelay ?? step}
          tutorial={!settings.tutorialDone}
          onTutorialDone={() => updateSettings({ ...settings, tutorialDone: true })}
        />
      );
    case 'setup':
      return <SetupScreen initial={setup} onStart={startNew} onBack={goHome} />;
    case 'rules':
      return <RulesScreen onBack={goHome} />;
    case 'stats':
      return <StatsScreen onBack={goHome} />;
    case 'settings':
      return (
        <SettingsScreen
          settings={settings}
          onChange={updateSettings}
          hasSave={save !== null}
          onClearSave={() => {
            clearSave();
            setSave(null);
          }}
          onBack={goHome}
        />
      );
    case 'home':
      return (
        <HomeScreen
          canResume={save !== null}
          resumeLabel={save ? `Lượt ${save.battle.turnNumber} · ${getOpponent(save.setup.opponentId).name}` : null}
          onStart={() => setScreen('setup')}
          onResume={resumeSaved}
          onRules={() => setScreen('rules')}
          onStats={() => setScreen('stats')}
          onSettings={() => setScreen('settings')}
        />
      );
  }
}
