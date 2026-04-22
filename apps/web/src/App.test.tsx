import { afterEach, describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
});
