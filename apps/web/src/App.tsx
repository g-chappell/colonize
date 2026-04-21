import './App.css';
import { GameCanvas } from './GameCanvas';
import { Hud } from './hud/Hud';
import { MainMenu } from './menu/MainMenu';
import { FactionSelect } from './menu/FactionSelect';
import { useGameStore } from './store/game';

export function App() {
  const screen = useGameStore((s) => s.screen);

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
      </div>
    </main>
  );
}
