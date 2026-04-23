import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  MerchantRouteActionKind,
  UnitType,
  type ColonyJSON,
  type MerchantRouteJSON,
  type UnitJSON,
} from '@colonize/core';
import { useGameStore } from '../store/game';
import { RouteScreen } from './RouteScreen';

const driftwatch: ColonyJSON = {
  id: 'driftwatch',
  faction: 'otk',
  position: { x: 5, y: 5 },
  population: 3,
  crew: [],
  buildings: [],
  stocks: { resources: {}, artifacts: [] },
};

const blackreef: ColonyJSON = {
  id: 'blackreef',
  faction: 'otk',
  position: { x: 12, y: 8 },
  population: 2,
  crew: [],
  buildings: [],
  stocks: { resources: {}, artifacts: [] },
};

const foreignColony: ColonyJSON = {
  id: 'ironholm',
  faction: 'ironclad',
  position: { x: 20, y: 4 },
  population: 4,
  crew: [],
  buildings: [],
  stocks: { resources: {}, artifacts: [] },
};

function makeShip(id: string, type: UnitType = UnitType.Sloop, faction = 'otk'): UnitJSON {
  return {
    id,
    faction,
    position: { x: 5, y: 5 },
    type,
    movement: 4,
    cargo: { resources: {}, artifacts: [] },
  };
}

function saltRun(): MerchantRouteJSON {
  return {
    id: 'salt-run',
    faction: 'otk',
    stops: [
      {
        colonyId: 'driftwatch',
        actions: [{ kind: MerchantRouteActionKind.Load, resourceId: 'salvage', qty: 5 }],
      },
      {
        colonyId: 'blackreef',
        actions: [{ kind: MerchantRouteActionKind.Unload, resourceId: 'salvage', qty: 5 }],
      },
    ],
  };
}

describe('RouteScreen', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.setState({
      faction: 'otk',
      screen: 'routes',
      colonies: [driftwatch, blackreef, foreignColony],
      units: [makeShip('ship-sloop-1'), makeShip('ground-scout', UnitType.Scout)],
    });
  });

  it('renders an empty-state message when no routes exist', () => {
    render(<RouteScreen />);
    expect(screen.getByTestId('route-screen-empty')).toBeInTheDocument();
  });

  it('lists saved routes with their stop count and path', () => {
    useGameStore.getState().saveMerchantRoute(saltRun());
    render(<RouteScreen />);
    expect(screen.getByTestId('route-row-salt-run')).toBeInTheDocument();
    expect(screen.getByTestId('route-row-salt-run-stops')).toHaveTextContent('2 stops');
  });

  it('disables Save until the draft is valid', () => {
    render(<RouteScreen />);
    const save = screen.getByTestId('route-screen-save') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(screen.getByTestId('route-screen-reason')).toHaveTextContent(/name is required/i);
  });

  it('surfaces a stop-picker validation reason once a name is typed', () => {
    render(<RouteScreen />);
    fireEvent.change(screen.getByTestId('route-screen-name'), { target: { value: 'Salt Run' } });
    expect(screen.getByTestId('route-screen-reason')).toHaveTextContent(/at least one stop/i);
  });

  it('only lists friendly colonies in the stop colony picker', () => {
    render(<RouteScreen />);
    fireEvent.click(screen.getByTestId('route-screen-add-stop'));
    const colonySelect = screen.getByTestId('route-stop-0-colony') as HTMLSelectElement;
    const optionValues = Array.from(colonySelect.options).map((o) => o.value);
    expect(optionValues).toContain('driftwatch');
    expect(optionValues).toContain('blackreef');
    expect(optionValues).not.toContain('ironholm');
  });

  it('only lists friendly ships in the assign dropdown', () => {
    render(<RouteScreen />);
    const assign = screen.getByTestId('route-screen-assign') as HTMLSelectElement;
    const optionValues = Array.from(assign.options).map((o) => o.value);
    expect(optionValues).toContain('ship-sloop-1');
    expect(optionValues).not.toContain('ground-scout');
  });

  it('builds a new route: name + stops + actions, then saves to the store', () => {
    render(<RouteScreen />);
    fireEvent.change(screen.getByTestId('route-screen-name'), { target: { value: 'Salt Run' } });
    fireEvent.click(screen.getByTestId('route-screen-add-stop'));
    fireEvent.change(screen.getByTestId('route-stop-0-colony'), {
      target: { value: 'driftwatch' },
    });
    fireEvent.click(screen.getByTestId('route-stop-0-add-action'));
    fireEvent.change(screen.getByTestId('route-stop-0-action-0-resource'), {
      target: { value: 'salvage' },
    });
    fireEvent.change(screen.getByTestId('route-stop-0-action-0-qty'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByTestId('route-stop-0-add-action'));
    fireEvent.change(screen.getByTestId('route-stop-0-action-1-kind'), {
      target: { value: MerchantRouteActionKind.Unload },
    });
    fireEvent.click(screen.getByTestId('route-screen-save'));

    const routes = useGameStore.getState().merchantRoutes;
    expect(routes['salt-run']).toBeDefined();
    expect(routes['salt-run']?.stops).toHaveLength(1);
    expect(routes['salt-run']?.stops[0]?.actions).toHaveLength(2);
    expect(routes['salt-run']?.stops[0]?.actions[1]?.kind).toBe(MerchantRouteActionKind.Unload);
  });

  it('edits an existing route in place (same id, replaced stops)', () => {
    useGameStore.getState().saveMerchantRoute(saltRun());
    render(<RouteScreen />);
    fireEvent.click(screen.getByTestId('route-row-salt-run-edit'));
    fireEvent.click(screen.getByTestId('route-stop-1-remove'));
    fireEvent.click(screen.getByTestId('route-screen-save'));

    const routes = useGameStore.getState().merchantRoutes;
    expect(Object.keys(routes)).toEqual(['salt-run']);
    expect(routes['salt-run']?.stops).toHaveLength(1);
  });

  it('duplicates an existing route under a new id', () => {
    useGameStore.getState().saveMerchantRoute(saltRun());
    render(<RouteScreen />);
    fireEvent.click(screen.getByTestId('route-row-salt-run-duplicate'));
    fireEvent.click(screen.getByTestId('route-screen-save'));

    const routes = useGameStore.getState().merchantRoutes;
    expect(routes['salt-run']).toBeDefined();
    expect(routes['salt-run-copy']).toBeDefined();
    expect(routes['salt-run-copy']?.stops).toHaveLength(2);
  });

  it('deletes a route and prunes dependent AutoRoute entries', () => {
    useGameStore.getState().saveMerchantRoute(saltRun());
    useGameStore.getState().assignRouteToShip('ship-sloop-1', 'salt-run');
    render(<RouteScreen />);
    fireEvent.click(screen.getByTestId('route-row-salt-run-delete'));

    const state = useGameStore.getState();
    expect(state.merchantRoutes['salt-run']).toBeUndefined();
    expect(state.autoRoutes['ship-sloop-1']).toBeUndefined();
  });

  it('assigns a route to a ship and shows it in the assigned list', () => {
    useGameStore.getState().saveMerchantRoute(saltRun());
    render(<RouteScreen />);
    const assign = screen.getByTestId('route-row-salt-run-assign') as HTMLSelectElement;
    fireEvent.change(assign, { target: { value: 'ship-sloop-1' } });
    expect(useGameStore.getState().autoRoutes['ship-sloop-1']?.routeId).toBe('salt-run');
    const assigned = screen.getByTestId('route-row-salt-run-assigned');
    expect(within(assigned).getByText('ship-sloop-1')).toBeInTheDocument();
  });

  it('releases a ship assignment', () => {
    useGameStore.getState().saveMerchantRoute(saltRun());
    useGameStore.getState().assignRouteToShip('ship-sloop-1', 'salt-run');
    render(<RouteScreen />);
    fireEvent.click(screen.getByTestId('route-row-salt-run-unassign-ship-sloop-1'));
    expect(useGameStore.getState().autoRoutes['ship-sloop-1']).toBeUndefined();
  });

  it('saves with assignment in one action when assignedUnitId is set', () => {
    render(<RouteScreen />);
    fireEvent.change(screen.getByTestId('route-screen-name'), { target: { value: 'Salt Run' } });
    fireEvent.click(screen.getByTestId('route-screen-add-stop'));
    fireEvent.change(screen.getByTestId('route-stop-0-colony'), {
      target: { value: 'driftwatch' },
    });
    fireEvent.change(screen.getByTestId('route-screen-assign'), {
      target: { value: 'ship-sloop-1' },
    });
    fireEvent.click(screen.getByTestId('route-screen-save'));

    const state = useGameStore.getState();
    expect(state.merchantRoutes['salt-run']).toBeDefined();
    expect(state.autoRoutes['ship-sloop-1']?.routeId).toBe('salt-run');
  });

  it('closes back to the game screen on Close', () => {
    render(<RouteScreen />);
    fireEvent.click(screen.getByTestId('route-screen-close'));
    expect(useGameStore.getState().screen).toBe('game');
  });

  it('closes on Escape', () => {
    render(<RouteScreen />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useGameStore.getState().screen).toBe('game');
  });

  it('rejects save when the typed name collides with an existing route (create mode)', () => {
    useGameStore.getState().saveMerchantRoute(saltRun());
    render(<RouteScreen />);
    fireEvent.change(screen.getByTestId('route-screen-name'), { target: { value: 'Salt Run' } });
    fireEvent.click(screen.getByTestId('route-screen-add-stop'));
    fireEvent.change(screen.getByTestId('route-stop-0-colony'), {
      target: { value: 'driftwatch' },
    });
    const save = screen.getByTestId('route-screen-save') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(screen.getByTestId('route-screen-reason')).toHaveTextContent(/already exists/i);
  });
});
