import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  BuildingType,
  HomePort,
  UnitType,
  type ColonyJSON,
  type HomePortJSON,
  type UnitJSON,
} from '@colonize/core';
import { useGameStore, type SurroundingTile } from '../store/game';
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

  it('shows an empty-surroundings placeholder until a snapshot lands', () => {
    render(<ColonyOverlay />);
    expect(screen.getByTestId('colony-overlay-tiles-empty')).toBeInTheDocument();
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

  describe('tile-work drag and drop', () => {
    const surroundings: readonly SurroundingTile[] = [
      { coord: { x: 11, y: 6 }, type: 'ocean' },
      { coord: { x: 13, y: 7 }, type: 'island' },
      { coord: { x: 12, y: 6 }, type: 'red-tide' },
    ];

    beforeEach(() => {
      useGameStore.getState().setColonySurroundings('driftwatch', surroundings);
    });

    it('renders a slot per surrounding tile with its type + coord', () => {
      render(<ColonyOverlay />);
      expect(screen.getByTestId('colony-overlay-tile-11-6')).toHaveTextContent(/Ocean/);
      expect(screen.getByTestId('colony-overlay-tile-11-6')).toHaveTextContent('11,6');
      expect(screen.getByTestId('colony-overlay-tile-13-7')).toHaveTextContent(/Island/);
    });

    it('shows pre/post yield on an unworked slot', () => {
      render(<ColonyOverlay />);
      const oceanSlot = screen.getByTestId('colony-overlay-tile-11-6');
      expect(oceanSlot).toHaveTextContent(/now: none/);
      expect(oceanSlot).toHaveTextContent(/worked: provisions \+1/);
    });

    it('drag-drops a crew chip onto a tile to assign', () => {
      render(<ColonyOverlay />);
      const crewChip = screen.getByTestId('colony-overlay-crew-settler-alpha');
      const oceanSlot = screen.getByTestId('colony-overlay-tile-11-6');
      const dataTransfer = {
        data: new Map<string, string>(),
        setData(type: string, value: string) {
          this.data.set(type, value);
        },
        getData(type: string) {
          return this.data.get(type) ?? '';
        },
        effectAllowed: '',
        dropEffect: '',
      };
      fireEvent.dragStart(crewChip, { dataTransfer });
      fireEvent.dragOver(oceanSlot, { dataTransfer });
      fireEvent.drop(oceanSlot, { dataTransfer });

      expect(useGameStore.getState().tileAssignments['driftwatch']).toEqual({
        '11,6': 'settler-alpha',
      });
    });

    it('removes the assigned crew from the pool', () => {
      useGameStore.getState().assignCrewToTile('driftwatch', 'settler-alpha', { x: 11, y: 6 });
      render(<ColonyOverlay />);
      const oceanSlot = screen.getByTestId('colony-overlay-tile-11-6');
      // The crew chip is now inside the tile slot, not listed in the pool's <ul>.
      expect(oceanSlot).toContainElement(screen.getByTestId('colony-overlay-crew-settler-alpha'));
      // Pool still contains the other crew member.
      expect(screen.getByTestId('colony-overlay-crew-gunner-bravo')).toBeInTheDocument();
    });

    it('shows the post-assignment yield on a worked slot', () => {
      useGameStore.getState().assignCrewToTile('driftwatch', 'settler-alpha', { x: 11, y: 6 });
      render(<ColonyOverlay />);
      const oceanSlot = screen.getByTestId('colony-overlay-tile-11-6');
      expect(oceanSlot).toHaveTextContent(/now: provisions \+1/);
      expect(oceanSlot).toHaveTextContent(/worked: provisions \+1/);
    });

    it('the unassign button returns the crew to the pool', () => {
      useGameStore.getState().assignCrewToTile('driftwatch', 'settler-alpha', { x: 11, y: 6 });
      render(<ColonyOverlay />);
      fireEvent.click(screen.getByTestId('colony-overlay-tile-11-6-unassign'));
      expect(useGameStore.getState().tileAssignments['driftwatch']).toBeUndefined();
    });

    it('shows an empty-yield label on non-yielding tile types', () => {
      render(<ColonyOverlay />);
      const redTideSlot = screen.getByTestId('colony-overlay-tile-12-6');
      expect(redTideSlot).toHaveTextContent(/worked: none/);
    });

    it('shows a pool-empty placeholder when every crew is assigned', () => {
      useGameStore.getState().assignCrewToTile('driftwatch', 'settler-alpha', { x: 11, y: 6 });
      useGameStore.getState().assignCrewToTile('driftwatch', 'gunner-bravo', { x: 13, y: 7 });
      render(<ColonyOverlay />);
      expect(screen.getByTestId('colony-overlay-crew-pool-empty')).toBeInTheDocument();
    });
  });

  describe('home-port trade panel', () => {
    function makePort(): HomePortJSON {
      return new HomePort({
        id: 'port-otk',
        faction: 'otk',
        basePrices: { timber: 10, fibre: 8 },
      }).toJSON();
    }

    function shipAt(position: { x: number; y: number }, faction = 'otk'): UnitJSON {
      return {
        id: 'ship-sloop-1',
        faction,
        position,
        type: UnitType.Sloop,
        movement: 4,
        cargo: { resources: {}, artifacts: [] },
      };
    }

    it('hides the trade panel entirely when the faction has no home port', () => {
      render(<ColonyOverlay />);
      expect(screen.queryByTestId('colony-overlay-trade')).not.toBeInTheDocument();
    });

    it('shows a dock-a-ship placeholder when a port exists but no eligible ship is present', () => {
      useGameStore.getState().setHomePort('otk', makePort());
      render(<ColonyOverlay />);
      expect(screen.getByTestId('colony-overlay-trade-empty')).toBeInTheDocument();
      expect(screen.queryByTestId('colony-overlay-trade-open')).not.toBeInTheDocument();
    });

    it('ignores ships of the wrong faction or on another tile', () => {
      useGameStore.getState().setHomePort('otk', makePort());
      useGameStore
        .getState()
        .setUnits([
          shipAt({ x: 12, y: 7 }, 'phantom'),
          { ...shipAt({ x: 0, y: 0 }), id: 'ship-far-otk' },
        ]);
      render(<ColonyOverlay />);
      expect(screen.getByTestId('colony-overlay-trade-empty')).toBeInTheDocument();
    });

    it('ignores non-ship units even if at the colony tile', () => {
      useGameStore.getState().setHomePort('otk', makePort());
      useGameStore
        .getState()
        .setUnits([{ ...shipAt({ x: 12, y: 7 }), id: 'scout-1', type: UnitType.Scout }]);
      render(<ColonyOverlay />);
      expect(screen.getByTestId('colony-overlay-trade-empty')).toBeInTheDocument();
    });

    it('shows a Trade button when a friendly ship is at the colony tile', () => {
      useGameStore.getState().setHomePort('otk', makePort());
      useGameStore.getState().setUnits([shipAt({ x: 12, y: 7 })]);
      render(<ColonyOverlay />);
      const button = screen.getByTestId('colony-overlay-trade-open');
      expect(button).toHaveTextContent('ship-sloop-1');
    });

    it('clicking the Trade button opens a trade session + routes the screen', () => {
      useGameStore.getState().setHomePort('otk', makePort());
      useGameStore.getState().setUnits([shipAt({ x: 12, y: 7 })]);
      render(<ColonyOverlay />);
      fireEvent.click(screen.getByTestId('colony-overlay-trade-open'));
      const state = useGameStore.getState();
      expect(state.screen).toBe('trade');
      expect(state.tradeSession).toEqual({ colonyId: 'driftwatch', unitId: 'ship-sloop-1' });
    });
  });
});
