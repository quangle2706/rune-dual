import { useCallback, useEffect, useState } from 'react';
import { soundPlayer } from './audio/sound';
import type { ControllerOptions } from './hooks/useBattleController';
import { clearSave, loadSave, type SaveFile } from './persistence/save';
import { BattleScreen } from './screens/BattleScreen';
import { HomeScreen } from './screens/HomeScreen';
import { RulesScreen } from './screens/RulesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { BOT_DELAYS, loadSettings, saveSettings, type Settings } from './settings/settings';

export type Screen = 'home' | 'battle' | 'rules' | 'settings';

export interface AppProps extends Pick<ControllerOptions, 'initialSeed' | 'seedSource' | 'botThinkDelay' | 'botStepDelay'> {
  initialScreen?: Screen;
}

/**
 * Screen navigation via plain state (no router needed for four screens).
 * Each new battle (or resume) remounts BattleScreen through `battleKey`, so
 * no timers or state leak between battles.
 */
export function App({ initialScreen = 'home', initialSeed, seedSource, botThinkDelay, botStepDelay }: AppProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [save, setSave] = useState<SaveFile | null>(() => loadSave());
  const [resume, setResume] = useState<SaveFile | null>(null);
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

  const startNew = useCallback(() => {
    clearSave();
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
          initialSeed={battleKey <= 1 ? initialSeed : undefined}
          seedSource={seedSource}
          resume={resume ? { battle: resume.battle, stats: resume.stats } : undefined}
          botThinkDelay={botThinkDelay ?? think}
          botStepDelay={botStepDelay ?? step}
        />
      );
    case 'rules':
      return <RulesScreen onBack={goHome} />;
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
          resumeTurn={save?.battle.turnNumber ?? null}
          onStart={startNew}
          onResume={resumeSaved}
          onRules={() => setScreen('rules')}
          onSettings={() => setScreen('settings')}
        />
      );
  }
}
