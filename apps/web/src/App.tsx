import { useEffect } from 'react';
import './App.css';
import { ColonyOverlay } from './colony/ColonyOverlay';
import { CombatOverlay } from './combat/CombatOverlay';
import { CouncilPickModal } from './council/CouncilPickModal';
import { DiplomacyScreen } from './diplomacy/DiplomacyScreen';
import { GameCanvas } from './GameCanvas';
import { Hud } from './hud/Hud';
import { RumourRevealModal } from './hud/RumourRevealModal';
import { GameOverScreen } from './gameover/GameOverScreen';
import { MainMenu } from './menu/MainMenu';
import { FactionSelect } from './menu/FactionSelect';
import { PauseOverlay } from './pause/PauseOverlay';
import { Prologue } from './prologue/Prologue';
import { SovereigntyBeatModal } from './sovereignty/SovereigntyBeatModal';
import { SovereigntyWarOverlay } from './sovereignty/SovereigntyWarOverlay';
import { TradeScreen } from './trade/TradeScreen';
import { CargoTransferScreen } from './transfer/CargoTransferScreen';
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

  if (screen === 'prologue') {
    return <Prologue />;
  }

  if (screen === 'faction-select') {
    return <FactionSelect />;
  }

  if (screen === 'game-over') {
    return <GameOverScreen />;
  }

  return (
    <main className="app-root">
      <h1>Colonize</h1>
      <p className="year">NW 2191 · Early Liberty Era</p>
      <p className="motto">Hic sunt dracones.</p>
      <div className="game-stage">
        <GameCanvas />
        <SovereigntyWarOverlay />
        <Hud />
        <RumourRevealModal />
        <CombatOverlay />
        <CouncilPickModal />
        <SovereigntyBeatModal />
        {screen === 'pause' && <PauseOverlay />}
        {screen === 'colony' && <ColonyOverlay />}
        {screen === 'trade' && <TradeScreen />}
        {screen === 'transfer' && <CargoTransferScreen />}
        {screen === 'diplomacy' && <DiplomacyScreen />}
      </div>
    </main>
  );
}
