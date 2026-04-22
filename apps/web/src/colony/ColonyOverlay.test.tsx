import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ColonyJSON } from '@colonize/core';
import { useGameStore } from '../store/game';
import { ColonyOverlay } from './ColonyOverlay';

const sampleColony: ColonyJSON = {
  id: 'driftwatch',
  faction: 'otk',
  position: { x: 12, y: 7 },
  population: 4,
  crew: ['settler-alpha', 'gunner-bravo'],
  buildings: ['tavern', 'shipyard'],
  stocks: {
    resources: { rum: 8, salt: 0, iron: 3 },
    artifacts: ['kraken-totem'],
  },
};

describe('ColonyOverlay', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().setColonies([sampleColony]);
    useGameStore.getState().setSelectedColony('driftwatch');
    useGameStore.getState().setScreen('colony');
  });

  it('renders the colony summary for the selected colony', () => {
    render(<ColonyOverlay />);
    expect(screen.getByTestId('colony-overlay-title')).toHaveTextContent('driftwatch');
    expect(screen.getByTestId('colony-overlay-faction')).toHaveTextContent('Order of the Kraken');
    expect(screen.getByTestId('colony-overlay-position')).toHaveTextContent('12,7');
    expect(screen.getByTestId('colony-overlay-population')).toHaveTextContent('4');
    expect(screen.getByTestId('colony-overlay-crew-count')).toHaveTextContent('2');
  });

  it('lists assigned crew as chips', () => {
    render(<ColonyOverlay />);
    expect(screen.getByTestId('colony-overlay-crew-settler-alpha')).toBeInTheDocument();
    expect(screen.getByTestId('colony-overlay-crew-gunner-bravo')).toBeInTheDocument();
  });

  it('lists buildings as chips', () => {
    render(<ColonyOverlay />);
    expect(screen.getByTestId('colony-overlay-building-tavern')).toBeInTheDocument();
    expect(screen.getByTestId('colony-overlay-building-shipyard')).toBeInTheDocument();
  });

  it('renders only resources with non-zero quantity', () => {
    render(<ColonyOverlay />);
    expect(screen.getByTestId('colony-overlay-stock-rum')).toHaveTextContent(/rum.*8/);
    expect(screen.getByTestId('colony-overlay-stock-iron')).toHaveTextContent(/iron.*3/);
    expect(screen.queryByTestId('colony-overlay-stock-salt')).not.toBeInTheDocument();
  });

  it('renders artifacts in the stocks panel', () => {
    render(<ColonyOverlay />);
    expect(screen.getByTestId('colony-overlay-artifact-kraken-totem')).toBeInTheDocument();
  });

  it('shows tile + queue placeholder panels until those tasks land', () => {
    render(<ColonyOverlay />);
    expect(screen.getByTestId('colony-overlay-tiles')).toHaveTextContent(/TASK-042/);
    expect(screen.getByTestId('colony-overlay-queue')).toHaveTextContent(/TASK-041/);
  });

  it('returns to the game screen + clears selection on close', () => {
    render(<ColonyOverlay />);
    fireEvent.click(screen.getByTestId('colony-overlay-close'));
    expect(useGameStore.getState().screen).toBe('game');
    expect(useGameStore.getState().selectedColonyId).toBeNull();
  });

  it('closes when Esc is pressed', () => {
    render(<ColonyOverlay />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useGameStore.getState().screen).toBe('game');
    expect(useGameStore.getState().selectedColonyId).toBeNull();
  });

  it('renders an empty-stockpile placeholder when nothing is stocked', () => {
    useGameStore.getState().setColonies([
      {
        ...sampleColony,
        stocks: { resources: {}, artifacts: [] },
      },
    ]);
    render(<ColonyOverlay />);
    expect(screen.getByTestId('colony-overlay-stocks-empty')).toBeInTheDocument();
  });

  it('renders empty-state placeholders for crew + buildings when none assigned', () => {
    useGameStore.getState().setColonies([
      {
        ...sampleColony,
        crew: [],
        buildings: [],
      },
    ]);
    render(<ColonyOverlay />);
    expect(screen.getByTestId('colony-overlay-crew-empty')).toBeInTheDocument();
    expect(screen.getByTestId('colony-overlay-buildings-empty')).toBeInTheDocument();
  });

  it('shows a missing-colony placeholder if the selected id no longer exists', () => {
    useGameStore.getState().setColonies([]);
    render(<ColonyOverlay />);
    expect(screen.getByTestId('colony-overlay-missing')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('colony-overlay-close'));
    expect(useGameStore.getState().screen).toBe('game');
  });
});
