import { useEffect } from 'react';
import { TUTORIAL_STEPS } from '@colonize/content';
import './App.css';
import { BlackMarketModal } from './blackmarket/BlackMarketModal';
import { ColonyOverlay } from './colony/ColonyOverlay';
import { CombatOverlay } from './combat/CombatOverlay';
import { CouncilPickModal } from './council/CouncilPickModal';
import { DiplomacyScreen } from './diplomacy/DiplomacyScreen';
import { GameCanvas } from './GameCanvas';
import { Hud } from './hud/Hud';
import { RumourRevealModal } from './hud/RumourRevealModal';
import { TidewaterPartyModal } from './hud/TidewaterPartyModal';
import { TithePaymentModal } from './hud/TithePaymentModal';
import { GameOverScreen } from './gameover/GameOverScreen';
import { MainMenu } from './menu/MainMenu';
import { FactionSelect } from './menu/FactionSelect';
import { PauseOverlay } from './pause/PauseOverlay';
import { Prologue } from './prologue/Prologue';
import { RouteScreen } from './routes/RouteScreen';
import { SovereigntyBeatModal } from './sovereignty/SovereigntyBeatModal';
import { SovereigntyWarOverlay } from './sovereignty/SovereigntyWarOverlay';
import { TavernModal } from './tavern/TavernModal';
import { TradeScreen } from './trade/TradeScreen';
import { CargoTransferScreen } from './transfer/CargoTransferScreen';
import { TutorialStepModal } from './tutorial/TutorialStepModal';
import { nextTutorialStep } from './tutorial/tutorial-trigger';
import { useGameStore } from './store/game';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const tutorialEnabled = useGameStore((s) => s.tutorialEnabled);
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const firedTutorialSteps = useGameStore((s) => s.firedTutorialSteps);
  const showTutorialStep = useGameStore((s) => s.showTutorialStep);

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

  // Tutorial trigger orchestrator. `currentTurn` in the store is
  // 0-indexed relative to TurnManager (ctx.turn - 1), so the 1-indexed
  // tutorial step triggerTurns map to `currentTurn + 1`. Fires on:
  //   - game-stage mount (screen becomes 'game' while tutorialEnabled)
  //   - each turn advance (currentTurn changes)
  // Guarded on `tutorialStep === null` so a re-render mid-modal does
  // not re-enqueue the same step; the pure sibling's fired-set rule
  // prevents re-fire across turns. Only the 'game' screen fires — the
  // menu/faction-select/prologue screens don't mount the HUD the
  // callouts point at.
  useEffect(() => {
    if (!tutorialEnabled) return;
    if (tutorialStep !== null) return;
    if (screen !== 'game') return;
    const fired = new Set(firedTutorialSteps);
    const step = nextTutorialStep(currentTurn + 1, fired, TUTORIAL_STEPS);
    if (step) showTutorialStep(step.id);
  }, [screen, currentTurn, tutorialEnabled, tutorialStep, firedTutorialSteps, showTutorialStep]);

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
        <BlackMarketModal />
        <TavernModal />
        <SovereigntyBeatModal />
        <TithePaymentModal />
        <TidewaterPartyModal />
        <TutorialStepModal />
        {screen === 'pause' && <PauseOverlay />}
        {screen === 'colony' && <ColonyOverlay />}
        {screen === 'trade' && <TradeScreen />}
        {screen === 'transfer' && <CargoTransferScreen />}
        {screen === 'diplomacy' && <DiplomacyScreen />}
        {screen === 'routes' && <RouteScreen />}
      </div>
    </main>
  );
}
