import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { UnitType, type ColonyJSON, type UnitJSON } from '@colonize/core';
import { useGameStore } from '../store/game';
import { CargoTransferScreen } from './CargoTransferScreen';

function makeColony(stocks: Record<string, number> = {}): ColonyJSON {
  return {
    id: 'driftwatch',
    faction: 'otk',
    position: { x: 5, y: 5 },
    population: 3,
    crew: [],
    buildings: [],
    stocks: { resources: stocks, artifacts: [] },
  };
}

function makeShip(resources: Record<string, number> = {}): UnitJSON {
  return {
    id: 'ship-sloop-1',
    faction: 'otk',
    position: { x: 5, y: 5 },
    type: UnitType.Sloop,
    movement: 4,
    cargo: { resources, artifacts: [] },
  };
}

describe('CargoTransferScreen', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().setColonies([makeColony({ timber: 6, fibre: 2 })]);
    useGameStore.getState().setUnits([makeShip({ rum: 4 })]);
    useGameStore.getState().openTransferSession({ colonyId: 'driftwatch', unitId: 'ship-sloop-1' });
  });

  it('routes the screen to transfer when the session opens', () => {
    expect(useGameStore.getState().screen).toBe('transfer');
    expect(useGameStore.getState().transferSession).toEqual({
      colonyId: 'driftwatch',
      unitId: 'ship-sloop-1',
    });
  });

  it('renders header with colony id + ship id', () => {
    render(<CargoTransferScreen />);
    expect(screen.getByTestId('transfer-screen-title')).toHaveTextContent('driftwatch');
    expect(screen.getByTestId('transfer-screen-ship')).toHaveTextContent('ship-sloop-1');
  });

  it('renders one row per resource present on either side, alphabetically', () => {
    render(<CargoTransferScreen />);
    const ids = ['fibre', 'rum', 'timber'];
    for (const id of ids) {
      expect(screen.getByTestId(`transfer-row-${id}`)).toBeInTheDocument();
    }
    const rows = screen.getByTestId('transfer-screen-rows').children;
    expect(rows[0]).toHaveAttribute('data-testid', 'transfer-row-fibre');
    expect(rows[1]).toHaveAttribute('data-testid', 'transfer-row-rum');
    expect(rows[2]).toHaveAttribute('data-testid', 'transfer-row-timber');
  });

  it('shows ship and colony quantities per row', () => {
    render(<CargoTransferScreen />);
    expect(screen.getByTestId('transfer-row-rum-ship')).toHaveTextContent('ship: 4');
    expect(screen.getByTestId('transfer-row-rum-colony')).toHaveTextContent('colony: 0');
    expect(screen.getByTestId('transfer-row-timber-ship')).toHaveTextContent('ship: 0');
    expect(screen.getByTestId('transfer-row-timber-colony')).toHaveTextContent('colony: 6');
  });

  it('caps slider min at -shipQty (load → colony) and max at +colonyQty (load → ship)', () => {
    render(<CargoTransferScreen />);
    const timber = screen.getByTestId('transfer-row-timber-slider') as HTMLInputElement;
    expect(timber.min).toBe('0');
    expect(timber.max).toBe('6');
    const rum = screen.getByTestId('transfer-row-rum-slider') as HTMLInputElement;
    expect(rum.min).toBe('-4');
    expect(rum.max).toBe('0');
  });

  it('disables Confirm until a slider is non-zero', () => {
    render(<CargoTransferScreen />);
    const confirm = screen.getByTestId('transfer-screen-confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('transfer-row-timber-slider'), { target: { value: '3' } });
    expect(confirm.disabled).toBe(false);
  });

  it('confirm moves goods atomically: ship gains, colony loses (load)', () => {
    render(<CargoTransferScreen />);
    fireEvent.change(screen.getByTestId('transfer-row-timber-slider'), { target: { value: '4' } });
    fireEvent.click(screen.getByTestId('transfer-screen-confirm'));

    const state = useGameStore.getState();
    const ship = state.units.find((u) => u.id === 'ship-sloop-1')!;
    const colony = state.colonies.find((c) => c.id === 'driftwatch')!;
    expect(ship.cargo.resources.timber).toBe(4);
    expect(colony.stocks.resources.timber).toBe(2);
  });

  it('confirm moves goods atomically in reverse: colony gains, ship loses (unload)', () => {
    render(<CargoTransferScreen />);
    fireEvent.change(screen.getByTestId('transfer-row-rum-slider'), { target: { value: '-3' } });
    fireEvent.click(screen.getByTestId('transfer-screen-confirm'));

    const state = useGameStore.getState();
    const ship = state.units.find((u) => u.id === 'ship-sloop-1')!;
    const colony = state.colonies.find((c) => c.id === 'driftwatch')!;
    expect(ship.cargo.resources.rum).toBe(1);
    expect(colony.stocks.resources.rum).toBe(3);
  });

  it('handles a mixed cart in a single confirm (some load, some unload)', () => {
    render(<CargoTransferScreen />);
    fireEvent.change(screen.getByTestId('transfer-row-timber-slider'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('transfer-row-rum-slider'), { target: { value: '-4' } });
    fireEvent.click(screen.getByTestId('transfer-screen-confirm'));

    const state = useGameStore.getState();
    const ship = state.units.find((u) => u.id === 'ship-sloop-1')!;
    const colony = state.colonies.find((c) => c.id === 'driftwatch')!;
    expect(ship.cargo.resources.timber).toBe(2);
    expect(ship.cargo.resources.rum).toBeUndefined();
    expect(colony.stocks.resources.timber).toBe(4);
    expect(colony.stocks.resources.rum).toBe(4);
  });

  it('resets sliders to zero after a confirm', () => {
    render(<CargoTransferScreen />);
    fireEvent.change(screen.getByTestId('transfer-row-timber-slider'), { target: { value: '2' } });
    fireEvent.click(screen.getByTestId('transfer-screen-confirm'));
    const slider = screen.getByTestId('transfer-row-timber-slider') as HTMLInputElement;
    expect(slider.value).toBe('0');
    expect((screen.getByTestId('transfer-screen-confirm') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('returns to the colony screen on close button', () => {
    render(<CargoTransferScreen />);
    fireEvent.click(screen.getByTestId('transfer-screen-close'));
    expect(useGameStore.getState().screen).toBe('colony');
    expect(useGameStore.getState().transferSession).toBeNull();
  });

  it('returns to the colony screen on Escape', () => {
    render(<CargoTransferScreen />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useGameStore.getState().screen).toBe('colony');
    expect(useGameStore.getState().transferSession).toBeNull();
  });

  it('shows an empty placeholder when both holds are empty', () => {
    useGameStore.getState().setColonies([makeColony({})]);
    useGameStore.getState().setUnits([makeShip({})]);
    render(<CargoTransferScreen />);
    expect(screen.getByTestId('transfer-screen-empty')).toBeInTheDocument();
    expect((screen.getByTestId('transfer-screen-confirm') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('renders a missing-session placeholder when entities are absent', () => {
    useGameStore.getState().openTransferSession({ colonyId: 'ghost', unitId: 'nope' });
    render(<CargoTransferScreen />);
    expect(screen.getByTestId('transfer-screen-missing')).toBeInTheDocument();
  });

  it('shows live direction label as the slider moves', () => {
    render(<CargoTransferScreen />);
    expect(screen.getByTestId('transfer-row-timber-direction')).toHaveTextContent('idle');
    fireEvent.change(screen.getByTestId('transfer-row-timber-slider'), { target: { value: '3' } });
    expect(screen.getByTestId('transfer-row-timber-direction')).toHaveTextContent('colony → ship');
    fireEvent.change(screen.getByTestId('transfer-row-rum-slider'), { target: { value: '-2' } });
    expect(screen.getByTestId('transfer-row-rum-direction')).toHaveTextContent('ship → colony');
  });
});
