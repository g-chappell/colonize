import './App.css';
import { GameCanvas } from './GameCanvas';
import { Hud } from './hud/Hud';
import { MainMenu } from './menu/MainMenu';
import { useGameStore } from './store/game';

export function App() {
  const screen = useGameStore((s) => s.screen);

  if (screen === 'menu') {
    return <MainMenu />;
  }

  if (screen === 'faction-select') {
    return <FactionSelectPlaceholder />;
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

function FactionSelectPlaceholder(): JSX.Element {
  const setScreen = useGameStore((s) => s.setScreen);
  return (
    <main className="app-root" data-testid="faction-select-placeholder">
      <h1>Choose your faction</h1>
      <p className="motto">The tide runs out.</p>
      <button type="button" onClick={() => setScreen('menu')}>
        Back
      </button>
    </main>
  );
}
