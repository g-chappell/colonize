import './App.css';
import { GameCanvas } from './GameCanvas';
import { Hud } from './hud/Hud';

export function App() {
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
