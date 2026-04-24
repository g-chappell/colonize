import { afterEach, describe, it, expect, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CombatActionType, CombatResult, type CombatOutcome } from '@colonize/core';
import { App } from './App';
import { bus } from './bus';
import { useGameStore } from './store/game';

describe('App', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  afterEach(() => {
    bus.clear();
  });

  it('renders the main menu by default', () => {
    render(<App />);
    expect(screen.getByTestId('main-menu')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Colonize' })).toBeInTheDocument();
  });

  it('shows the faction select screen when the screen advances', () => {
    useGameStore.getState().setScreen('faction-select');
    render(<App />);
    expect(screen.getByTestId('faction-select')).toBeInTheDocument();
    expect(screen.getByTestId('faction-card-otk')).toBeInTheDocument();
  });

  it('shows the prologue screen when screen is prologue', () => {
    useGameStore.getState().setScreen('prologue');
    render(<App />);
    expect(screen.getByTestId('prologue')).toBeInTheDocument();
    expect(screen.queryByTestId('main-menu')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hud')).not.toBeInTheDocument();
  });

  it('mounts the HUD over the game stage once the game starts', () => {
    useGameStore.getState().setScreen('game');
    render(<App />);
    expect(screen.getByTestId('hud')).toBeInTheDocument();
    expect(screen.getByTestId('hud-end-turn')).toBeInTheDocument();
    expect(screen.getByText(/NW 2191/)).toBeInTheDocument();
    expect(screen.getByText(/Early Liberty Era/)).toBeInTheDocument();
    expect(screen.getByText(/Hic sunt dracones/i)).toBeInTheDocument();
  });

  describe('pause', () => {
    it('keeps the HUD mounted behind the pause overlay', () => {
      useGameStore.getState().setScreen('pause');
      render(<App />);
      expect(screen.getByTestId('hud')).toBeInTheDocument();
      expect(screen.getByTestId('pause-overlay')).toBeInTheDocument();
    });

    it('opens the pause overlay when Esc is pressed in-game', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.queryByTestId('pause-overlay')).not.toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(useGameStore.getState().screen).toBe('pause');
      expect(screen.getByTestId('pause-overlay')).toBeInTheDocument();
    });

    it('closes the pause overlay when Esc is pressed again', () => {
      useGameStore.getState().setScreen('pause');
      render(<App />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(useGameStore.getState().screen).toBe('game');
      expect(screen.queryByTestId('pause-overlay')).not.toBeInTheDocument();
    });

    it('does not trigger pause from the main menu', () => {
      useGameStore.getState().setScreen('menu');
      render(<App />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(useGameStore.getState().screen).toBe('menu');
    });

    it('opens the pause overlay from the HUD menu button', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      fireEvent.click(screen.getByTestId('hud-menu-button'));
      expect(useGameStore.getState().screen).toBe('pause');
      expect(screen.getByTestId('pause-overlay')).toBeInTheDocument();
    });

    it('emits game:pause and game:resume around the overlay lifecycle', () => {
      const received: string[] = [];
      bus.on('game:pause', () => received.push('pause'));
      bus.on('game:resume', () => received.push('resume'));
      useGameStore.getState().setScreen('game');
      render(<App />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(received).toEqual(['pause']);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(received).toEqual(['pause', 'resume']);
    });
  });

  describe('colony overlay', () => {
    it('mounts the colony overlay over the game stage', () => {
      useGameStore.getState().setColonies([
        {
          id: 'driftwatch',
          faction: 'otk',
          position: { x: 1, y: 1 },
          population: 1,
          crew: [],
          buildings: [],
          stocks: { resources: {}, artifacts: [] },
        },
      ]);
      useGameStore.getState().setSelectedColony('driftwatch');
      useGameStore.getState().setScreen('colony');
      render(<App />);
      expect(screen.getByTestId('hud')).toBeInTheDocument();
      expect(screen.getByTestId('colony-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('colony-overlay-title')).toHaveTextContent('driftwatch');
    });

    it('does not mount the colony overlay outside the colony screen', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.queryByTestId('colony-overlay')).not.toBeInTheDocument();
    });
  });

  describe('trade screen', () => {
    it('mounts the trade screen over the game stage when screen is trade', () => {
      useGameStore.getState().setScreen('trade');
      render(<App />);
      expect(screen.getByTestId('hud')).toBeInTheDocument();
      expect(screen.getByTestId('trade-screen')).toBeInTheDocument();
    });

    it('does not mount the trade screen outside the trade screen', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.queryByTestId('trade-screen')).not.toBeInTheDocument();
    });
  });

  describe('cargo-transfer screen', () => {
    it('mounts the transfer screen over the game stage when screen is transfer', () => {
      useGameStore.getState().setScreen('transfer');
      render(<App />);
      expect(screen.getByTestId('hud')).toBeInTheDocument();
      expect(screen.getByTestId('transfer-screen')).toBeInTheDocument();
    });

    it('does not mount the transfer screen outside the transfer screen', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.queryByTestId('transfer-screen')).not.toBeInTheDocument();
    });
  });

  describe('diplomacy screen', () => {
    it('mounts the diplomacy screen over the game stage when screen is diplomacy', () => {
      useGameStore.getState().setScreen('diplomacy');
      render(<App />);
      expect(screen.getByTestId('hud')).toBeInTheDocument();
      expect(screen.getByTestId('diplomacy-screen')).toBeInTheDocument();
    });

    it('does not mount the diplomacy screen outside the diplomacy screen', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.queryByTestId('diplomacy-screen')).not.toBeInTheDocument();
    });
  });

  describe('route screen', () => {
    it('mounts the route screen over the game stage when screen is routes', () => {
      useGameStore.getState().setScreen('routes');
      render(<App />);
      expect(screen.getByTestId('hud')).toBeInTheDocument();
      expect(screen.getByTestId('route-screen')).toBeInTheDocument();
    });

    it('does not mount the route screen outside the routes screen', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.queryByTestId('route-screen')).not.toBeInTheDocument();
    });
  });

  describe('codex viewer', () => {
    it('mounts the codex viewer over the game stage when screen is codex', () => {
      useGameStore.getState().setScreen('codex');
      render(<App />);
      expect(screen.getByTestId('hud')).toBeInTheDocument();
      expect(screen.getByTestId('codex-viewer')).toBeInTheDocument();
    });

    it('does not mount the codex viewer outside the codex screen', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.queryByTestId('codex-viewer')).not.toBeInTheDocument();
    });

    it('closes the codex viewer when Esc is pressed', () => {
      useGameStore.getState().setScreen('codex');
      render(<App />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(useGameStore.getState().screen).toBe('game');
      expect(screen.queryByTestId('codex-viewer')).not.toBeInTheDocument();
    });
  });

  describe('combat overlay', () => {
    const sampleOutcome: CombatOutcome = {
      action: CombatActionType.Broadside,
      result: CombatResult.DefenderSunk,
      attacker: {
        id: 'a',
        faction: 'otk',
        hull: 50,
        maxHull: 50,
        guns: 12,
        crew: 50,
        maxCrew: 50,
        movement: 4,
        maxMovement: 4,
      },
      defender: {
        id: 'd',
        faction: 'ironclad',
        hull: 0,
        maxHull: 50,
        guns: 10,
        crew: 50,
        maxCrew: 50,
        movement: 3,
        maxMovement: 3,
      },
      events: [{ kind: 'broadside-volley', firer: 'attacker', damage: 50, targetHullAfter: 0 }],
    };

    it('mounts the combat overlay over the game stage when an outcome is set', () => {
      useGameStore.getState().setScreen('game');
      useGameStore.getState().showCombatOutcome(sampleOutcome);
      render(<App />);
      expect(screen.getByTestId('hud')).toBeInTheDocument();
      expect(screen.getByTestId('combat-overlay')).toBeInTheDocument();
    });

    it('does not mount the combat overlay when no outcome is pending', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.queryByTestId('combat-overlay')).not.toBeInTheDocument();
    });
  });

  describe('council pick modal', () => {
    it('mounts the Council pick modal over the game stage when a session is active', () => {
      useGameStore.getState().setScreen('game');
      useGameStore.setState({
        councilPick: {
          factionId: 'otk',
          threshold: 50,
          hand: ['pirata-codex-fragment', 'bloodline-writ'],
        },
      });
      render(<App />);
      expect(screen.getByTestId('hud')).toBeInTheDocument();
      expect(screen.getByTestId('council-pick')).toBeInTheDocument();
    });

    it('does not mount the Council pick modal when no session is active', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.queryByTestId('council-pick')).not.toBeInTheDocument();
    });
  });

  describe('sovereignty war overlay', () => {
    const sampleCampaign = {
      difficulty: 'standard',
      turnsRequired: 20,
      turnsElapsed: 5,
      waves: [
        {
          spawnTurn: 0,
          ships: ['frigate'],
          groundTroops: ['marines'],
        },
      ],
      spawnedWaveIndices: [],
    } as const;

    it('mounts the war overlay over the game stage while a campaign is active', () => {
      useGameStore.getState().setScreen('game');
      useGameStore.getState().startSovereigntyWar(sampleCampaign);
      render(<App />);
      expect(screen.getByTestId('hud')).toBeInTheDocument();
      expect(screen.getByTestId('sovereignty-war-overlay')).toBeInTheDocument();
    });

    it('does not mount the war overlay when no campaign is active', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.queryByTestId('sovereignty-war-overlay')).not.toBeInTheDocument();
    });

    it('mounts the beat modal on top of the game stage when a milestone is pending', () => {
      useGameStore.getState().setScreen('game');
      useGameStore.getState().startSovereigntyWar(sampleCampaign);
      useGameStore.getState().showSovereigntyBeat(50);
      render(<App />);
      expect(screen.getByTestId('sovereignty-war-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('sovereignty-beat')).toBeInTheDocument();
    });
  });

  describe('tithe payment modal', () => {
    it('mounts the modal over the game stage when a tithe notification is pending', () => {
      useGameStore.getState().setScreen('game');
      useGameStore.getState().showTitheNotification({ amount: 35 });
      render(<App />);
      expect(screen.getByTestId('hud')).toBeInTheDocument();
      expect(screen.getByTestId('tithe-payment')).toBeInTheDocument();
    });

    it('does not mount the modal when no tithe notification is pending', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.queryByTestId('tithe-payment')).not.toBeInTheDocument();
    });
  });

  describe('game-over terminal screen', () => {
    it('replaces the game stage with the game-over screen when declared', () => {
      useGameStore.getState().declareEndgame({
        kind: 'victory',
        result: 'sovereignty-victory',
        turn: 42,
      });
      render(<App />);
      expect(screen.getByTestId('game-over-screen')).toBeInTheDocument();
      expect(screen.queryByTestId('hud')).not.toBeInTheDocument();
      expect(screen.queryByTestId('main-menu')).not.toBeInTheDocument();
    });
  });

  describe('tutorial engine', () => {
    it('fires the welcome step on the first game render when the tutorial is enabled', () => {
      useGameStore.getState().setTutorialEnabled(true);
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.getByTestId('tutorial-step')).toBeInTheDocument();
      expect(screen.getByTestId('tutorial-step-title')).toHaveTextContent('Welcome aboard');
      expect(useGameStore.getState().tutorialStep).toBe('welcome');
      expect(useGameStore.getState().firedTutorialSteps).toEqual(['welcome']);
    });

    it('does not mount the tutorial modal when tutorial is disabled', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.queryByTestId('tutorial-step')).not.toBeInTheDocument();
    });

    it('does not fire tutorial steps while the player is on the main menu', () => {
      useGameStore.getState().setTutorialEnabled(true);
      useGameStore.getState().setScreen('menu');
      render(<App />);
      expect(screen.queryByTestId('tutorial-step')).not.toBeInTheDocument();
      expect(useGameStore.getState().tutorialStep).toBeNull();
    });

    it('dismissing a step advances to the next pending step after the turn ticks', () => {
      useGameStore.getState().setTutorialEnabled(true);
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.getByTestId('tutorial-step-title')).toHaveTextContent('Welcome aboard');
      fireEvent.click(screen.getByTestId('tutorial-step-next'));
      expect(useGameStore.getState().tutorialStep).toBeNull();
      act(() => {
        useGameStore.getState().setCurrentTurn(1);
      });
      expect(useGameStore.getState().tutorialStep).toBe('end-turn');
      expect(screen.getByTestId('tutorial-step-title')).toHaveTextContent('Ending a turn');
    });

    it('does not re-fire an already-fired step', () => {
      useGameStore.getState().setTutorialEnabled(true);
      useGameStore.getState().setScreen('game');
      render(<App />);
      fireEvent.click(screen.getByTestId('tutorial-step-next'));
      expect(useGameStore.getState().tutorialStep).toBeNull();
      act(() => {
        useGameStore.setState({ currentTurn: 0 });
      });
      expect(useGameStore.getState().tutorialStep).toBeNull();
    });

    it('the skip button disables the tutorial and hides the modal', () => {
      useGameStore.getState().setTutorialEnabled(true);
      useGameStore.getState().setScreen('game');
      render(<App />);
      fireEvent.click(screen.getByTestId('tutorial-step-skip'));
      expect(useGameStore.getState().tutorialEnabled).toBe(false);
      expect(useGameStore.getState().tutorialStep).toBeNull();
      expect(screen.queryByTestId('tutorial-step')).not.toBeInTheDocument();
    });

    it('renders the highlight arrow when a step has a targetTestId', () => {
      useGameStore.getState().setTutorialEnabled(true);
      useGameStore.getState().setScreen('game');
      render(<App />);
      fireEvent.click(screen.getByTestId('tutorial-step-next'));
      act(() => {
        useGameStore.getState().setCurrentTurn(1);
      });
      expect(screen.getByTestId('tutorial-step-highlight')).toBeInTheDocument();
      expect(screen.getByTestId('tutorial-step-arrow')).toBeInTheDocument();
    });

    it('does not render the highlight for steps without a targetTestId', () => {
      useGameStore.getState().setTutorialEnabled(true);
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.getByTestId('tutorial-step-title')).toHaveTextContent('Welcome aboard');
      expect(screen.queryByTestId('tutorial-step-highlight')).not.toBeInTheDocument();
    });
  });
});
