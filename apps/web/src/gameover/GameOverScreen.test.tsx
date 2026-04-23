import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnitType, type UnitJSON } from '@colonize/core';
import { getEpilogue } from '@colonize/content';
import { useGameStore } from '../store/game';
import { GameOverScreen } from './GameOverScreen';

const EMPTY_CARGO = { resources: {}, artifacts: [] } as const;

function makeUnit(id: string, faction: string): UnitJSON {
  return {
    id,
    faction,
    position: { x: 0, y: 0 },
    type: UnitType.Sloop,
    movement: 4,
    cargo: EMPTY_CARGO,
  };
}

describe('GameOverScreen', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders nothing when no endgame outcome is set', () => {
    const { container } = render(<GameOverScreen />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the victory heading and OTK epilogue for a sovereignty-victory', () => {
    useGameStore.setState({ faction: 'otk' });
    useGameStore.getState().declareEndgame({
      kind: 'victory',
      result: 'sovereignty-victory',
      turn: 42,
    });
    render(<GameOverScreen />);
    const heading = screen.getByTestId('game-over-heading');
    expect(heading).toHaveTextContent('Victory');
    const expected = getEpilogue('otk', 'sovereignty-victory');
    expect(screen.getByTestId('game-over-title')).toHaveTextContent(expected.title);
    expect(screen.getByTestId('game-over-body')).toHaveTextContent(expected.body);
    expect(screen.getByTestId('game-over-faction')).toHaveTextContent('Order of the Kraken');
    expect(screen.getByTestId('game-over-screen')).toHaveAttribute('data-outcome-kind', 'victory');
  });

  it('renders the defeat heading and Phantom epilogue on annihilation', () => {
    useGameStore.setState({ faction: 'phantom' });
    useGameStore.getState().declareEndgame({
      kind: 'defeat',
      result: 'annihilated',
      turn: 10,
    });
    render(<GameOverScreen />);
    expect(screen.getByTestId('game-over-heading')).toHaveTextContent('Defeat');
    const expected = getEpilogue('phantom', 'annihilated');
    expect(screen.getByTestId('game-over-title')).toHaveTextContent(expected.title);
    expect(screen.getByTestId('game-over-faction')).toHaveTextContent('Phantom Corsairs');
    expect(screen.getByTestId('game-over-screen')).toHaveAttribute('data-outcome-kind', 'defeat');
  });

  it('shows player-faction-filtered stat rows', () => {
    useGameStore.setState({
      faction: 'otk',
      units: [makeUnit('u1', 'otk'), makeUnit('u2', 'otk'), makeUnit('u3', 'ironclad')],
    });
    useGameStore.getState().declareEndgame({
      kind: 'victory',
      result: 'sovereignty-victory',
      turn: 33,
    });
    render(<GameOverScreen />);
    expect(screen.getByTestId('game-over-stat-turns')).toHaveTextContent('33');
    expect(screen.getByTestId('game-over-stat-fleet')).toHaveTextContent('2');
    expect(screen.getByTestId('game-over-stat-colonies')).toHaveTextContent('0');
    expect(screen.getByTestId('game-over-stat-charters')).toHaveTextContent('0');
  });

  it('Return to menu button resets the store and routes back to the main menu', () => {
    useGameStore.setState({ faction: 'bloodborne' });
    useGameStore.getState().declareEndgame({
      kind: 'defeat',
      result: 'annihilated',
      turn: 12,
    });
    render(<GameOverScreen />);
    fireEvent.click(screen.getByTestId('game-over-replay'));
    const state = useGameStore.getState();
    expect(state.endgame).toBeNull();
    expect(state.screen).toBe('menu');
    // Faction is reset to the default ('otk') on reset.
    expect(state.faction).toBe('otk');
  });
});
