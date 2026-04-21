import { useEffect, useState } from 'react';
import { bus } from '../bus';
import { useGameStore, type AudioBus } from '../store/game';
import styles from './PauseOverlay.module.css';

type View = 'root' | 'settings';

// Mounts while `screen === 'pause'`. The mount/unmount effect owns the
// Phaser scene pause/resume lifecycle so pressing Esc, clicking Resume,
// clicking Quit-to-menu, or anything else that flips the screen all
// route through the same pair of bus emits.
export function PauseOverlay(): JSX.Element {
  const [view, setView] = useState<View>('root');
  const [status, setStatus] = useState<string>('');
  const setScreen = useGameStore((s) => s.setScreen);
  const reset = useGameStore((s) => s.reset);

  useEffect(() => {
    bus.emit('game:pause', {});
    return () => {
      bus.emit('game:resume', {});
    };
  }, []);

  const handleResume = (): void => setScreen('game');
  const handleQuitToMenu = (): void => {
    reset();
    setScreen('menu');
  };
  const handleSave = (): void => {
    setStatus('Saved (stub)');
  };

  return (
    <div className={styles.backdrop} data-testid="pause-overlay">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Game paused"
        data-testid="pause-overlay-panel"
      >
        <h2 className={styles.title}>Paused</h2>
        {view === 'root' ? (
          <RootView
            onResume={handleResume}
            onOpenSettings={() => {
              setStatus('');
              setView('settings');
            }}
            onSave={handleSave}
            onQuitToMenu={handleQuitToMenu}
            status={status}
          />
        ) : (
          <SettingsView onBack={() => setView('root')} />
        )}
      </div>
    </div>
  );
}

interface RootViewProps {
  readonly onResume: () => void;
  readonly onOpenSettings: () => void;
  readonly onSave: () => void;
  readonly onQuitToMenu: () => void;
  readonly status: string;
}

function RootView({
  onResume,
  onOpenSettings,
  onSave,
  onQuitToMenu,
  status,
}: RootViewProps): JSX.Element {
  return (
    <>
      <ul className={styles.items} data-testid="pause-overlay-items">
        <li>
          <button
            type="button"
            className={styles.item}
            onClick={onResume}
            data-testid="pause-overlay-resume"
          >
            Resume
          </button>
        </li>
        <li>
          <button
            type="button"
            className={styles.item}
            onClick={onOpenSettings}
            data-testid="pause-overlay-settings"
          >
            Settings
          </button>
        </li>
        <li>
          <button
            type="button"
            className={styles.item}
            onClick={onSave}
            data-testid="pause-overlay-save"
          >
            Save
          </button>
        </li>
        <li>
          <button
            type="button"
            className={styles.item}
            onClick={onQuitToMenu}
            data-testid="pause-overlay-quit"
          >
            Quit to Menu
          </button>
        </li>
      </ul>
      <div className={styles.status} data-testid="pause-overlay-status" aria-live="polite">
        {status}
      </div>
    </>
  );
}

interface SettingsViewProps {
  readonly onBack: () => void;
}

function SettingsView({ onBack }: SettingsViewProps): JSX.Element {
  const settings = useGameStore((s) => s.settings);
  const setAudioVolume = useGameStore((s) => s.setAudioVolume);
  const setAudioMuted = useGameStore((s) => s.setAudioMuted);

  const handleSlider = (bus: AudioBus) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(event.target.value);
    setAudioVolume(bus, pct / 100);
  };

  return (
    <div className={styles.settings} data-testid="pause-overlay-settings-view">
      <VolumeSlider
        bus="bgm"
        label="Music"
        value={settings.bgmVolume}
        onChange={handleSlider('bgm')}
      />
      <VolumeSlider
        bus="sfx"
        label="Effects"
        value={settings.sfxVolume}
        onChange={handleSlider('sfx')}
      />
      <label className={styles.muteRow}>
        <input
          type="checkbox"
          checked={settings.muted}
          onChange={(e) => setAudioMuted(e.target.checked)}
          data-testid="pause-overlay-mute"
        />
        Mute all audio
      </label>
      <button
        type="button"
        className={styles.item}
        onClick={onBack}
        data-testid="pause-overlay-settings-back"
      >
        Back
      </button>
    </div>
  );
}

interface VolumeSliderProps {
  readonly bus: AudioBus;
  readonly label: string;
  readonly value: number;
  readonly onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function VolumeSlider({ bus, label, value, onChange }: VolumeSliderProps): JSX.Element {
  const pct = Math.round(value * 100);
  return (
    <div className={styles.sliderRow}>
      <div className={styles.sliderLabel}>
        <span>{label}</span>
        <span data-testid={`pause-overlay-${bus}-value`}>{pct}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={onChange}
        className={styles.slider}
        data-testid={`pause-overlay-${bus}-slider`}
        aria-label={`${label} volume`}
      />
    </div>
  );
}
