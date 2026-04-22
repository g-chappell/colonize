import { useEffect } from 'react';
import './App.css';
import { ColonyOverlay } from './colony/ColonyOverlay';
import { GameCanvas } from './GameCanvas';
import { Hud } from './hud/Hud';
import { RumourRevealModal } from './hud/RumourRevealModal';
import { MainMenu } from './menu/MainMenu';
import { FactionSelect } from './menu/FactionSelect';
import { PauseOverlay } from './pause/PauseOverlay';
import { TradeScreen } from './trade/TradeScreen';
import { useGameStore } from './store/game';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);

  // Global Esc-key shortcut: toggles between 'game' and 'pause'. Other
  // screens (menu, faction-select) ignore Esc — they have their own
  // navigation. Attached at the document level so the key works even
  // when focus is on the Phaser canvas.
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      if (screen === 'game') {
        event.preventDefault();
        setScreen('pause');
      } else if (screen === 'pause') {
        event.preventDefault();
        setScreen('game');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [screen, setScreen]);

  if (screen === 'menu') {
    return <MainMenu />;
  }

  if (screen === 'faction-select') {
    return <FactionSelect />;
  }

  return (
    <main className="app-root">
      <h1>Colonize</h1>
      <p className="year">NW 2191 · Early Liberty Era</p>
      <p className="motto">Hic sunt dracones.</p>
      <div className="game-stage">
        <GameCanvas />
        <Hud />
        <RumourRevealModal />
        {screen === 'pause' && <PauseOverlay />}
        {screen === 'colony' && <ColonyOverlay />}
        {screen === 'trade' && <TradeScreen />}
      </div>
    </main>
  );
}
