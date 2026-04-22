import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BuildingType, type ColonyJSON } from '@colonize/core';
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

  it('shows the tile-yield placeholder until TASK-042 lands', () => {
    render(<ColonyOverlay />);
    expect(screen.getByTestId('colony-overlay-tiles')).toHaveTextContent(/TASK-042/);
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

  describe('production queue', () => {
    const emptyColony: ColonyJSON = {
      id: 'colony-q',
      faction: 'otk',
      position: { x: 0, y: 0 },
      population: 3,
      crew: [],
      buildings: [],
      stocks: { resources: {}, artifacts: [] },
    };

    beforeEach(() => {
      useGameStore.getState().setColonies([emptyColony]);
      useGameStore.getState().setSelectedColony('colony-q');
      useGameStore.getState().setScreen('colony');
    });

    it('shows an empty-queue placeholder when nothing is queued', () => {
      render(<ColonyOverlay />);
      expect(screen.getByTestId('colony-overlay-queue-empty')).toBeInTheDocument();
    });

    it('lists available zero-prereq buildings with human-readable names', () => {
      render(<ColonyOverlay />);
      const tavernButton = screen.getByTestId(`colony-overlay-available-${BuildingType.Tavern}`);
      expect(tavernButton).toHaveTextContent('Tavern');
    });

    it('hides buildings whose prerequisites are unmet', () => {
      render(<ColonyOverlay />);
      expect(
        screen.queryByTestId(`colony-overlay-available-${BuildingType.Shipyard}`),
      ).not.toBeInTheDocument();
    });

    it('clicking an available building enqueues it', () => {
      render(<ColonyOverlay />);
      fireEvent.click(screen.getByTestId(`colony-overlay-available-${BuildingType.Tavern}`));
      const queue = useGameStore.getState().colonyQueues['colony-q'];
      expect(queue).toBeDefined();
      expect(queue!.map((q) => q.buildingId)).toEqual([BuildingType.Tavern]);
    });

    it('enqueued buildings disappear from the available list', () => {
      useGameStore.getState().enqueueBuilding('colony-q', BuildingType.Tavern);
      render(<ColonyOverlay />);
      expect(
        screen.queryByTestId(`colony-overlay-available-${BuildingType.Tavern}`),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId(`colony-overlay-queue-${BuildingType.Tavern}`)).toBeInTheDocument();
    });

    it('renders a progress indicator with progress / effort', () => {
      useGameStore.getState().enqueueBuilding('colony-q', BuildingType.Tavern);
      render(<ColonyOverlay />);
      const progress = screen.getByTestId(`colony-overlay-queue-progress-${BuildingType.Tavern}`);
      expect(progress).toHaveTextContent(/0 \/ \d+/);
    });

    it('cancel button removes the queue item', () => {
      useGameStore.getState().enqueueBuilding('colony-q', BuildingType.Tavern);
      render(<ColonyOverlay />);
      fireEvent.click(screen.getByTestId(`colony-overlay-queue-cancel-${BuildingType.Tavern}`));
      expect(useGameStore.getState().colonyQueues['colony-q']).toBeUndefined();
    });

    it('up and down buttons reorder queue items', () => {
      useGameStore.getState().enqueueBuilding('colony-q', BuildingType.Tavern);
      useGameStore.getState().enqueueBuilding('colony-q', BuildingType.Warehouse);
      render(<ColonyOverlay />);
      fireEvent.click(screen.getByTestId(`colony-overlay-queue-up-${BuildingType.Warehouse}`));
      expect(useGameStore.getState().colonyQueues['colony-q']!.map((q) => q.buildingId)).toEqual([
        BuildingType.Warehouse,
        BuildingType.Tavern,
      ]);
    });

    it('disables up on first item and down on last item', () => {
      useGameStore.getState().enqueueBuilding('colony-q', BuildingType.Tavern);
      useGameStore.getState().enqueueBuilding('colony-q', BuildingType.Warehouse);
      render(<ColonyOverlay />);
      expect(screen.getByTestId(`colony-overlay-queue-up-${BuildingType.Tavern}`)).toBeDisabled();
      expect(
        screen.getByTestId(`colony-overlay-queue-down-${BuildingType.Warehouse}`),
      ).toBeDisabled();
    });
  });
});
