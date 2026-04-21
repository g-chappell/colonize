import './App.css';
import { GameCanvas } from './GameCanvas';

export function App() {
  return (
    <main className="app-root">
      <h1>Colonize</h1>
      <p className="year">NW 2191 · Early Liberty Era</p>
      <p className="motto">Hic sunt dracones.</p>
      <GameCanvas />
    </main>
  );
}
