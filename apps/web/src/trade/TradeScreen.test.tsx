import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  HomePort,
  UnitType,
  type ColonyJSON,
  type HomePortJSON,
  type UnitJSON,
} from '@colonize/core';
import { useGameStore } from '../store/game';
import { TradeScreen } from './TradeScreen';

const sampleColony: ColonyJSON = {
  id: 'driftwatch',
  faction: 'otk',
  position: { x: 5, y: 5 },
  population: 3,
  crew: [],
  buildings: [],
  stocks: { resources: {}, artifacts: [] },
};

function makePortJSON(): HomePortJSON {
  return new HomePort({
    id: 'port-otk',
    faction: 'otk',
    basePrices: { timber: 10, fibre: 8, provisions: 12 },
  }).toJSON();
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

describe('TradeScreen', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().setColonies([sampleColony]);
    useGameStore.getState().setUnits([makeShip({ timber: 5 })]);
    useGameStore.getState().setHomePort('otk', makePortJSON());
    useGameStore.getState().openTradeSession({ colonyId: 'driftwatch', unitId: 'ship-sloop-1' });
  });

  it('routes the screen to trade when the session opens', () => {
    expect(useGameStore.getState().screen).toBe('trade');
    expect(useGameStore.getState().tradeSession).toEqual({
      colonyId: 'driftwatch',
      unitId: 'ship-sloop-1',
    });
  });

  it('renders the colony name + ship id in the header', () => {
    render(<TradeScreen />);
    expect(screen.getByTestId('trade-screen-title')).toHaveTextContent('driftwatch');
    expect(screen.getByTestId('trade-screen-ship')).toHaveTextContent('ship-sloop-1');
  });

  it('renders one row per traded resource', () => {
    render(<TradeScreen />);
    expect(screen.getByTestId('trade-row-timber')).toBeInTheDocument();
    expect(screen.getByTestId('trade-row-fibre')).toBeInTheDocument();
    expect(screen.getByTestId('trade-row-provisions')).toBeInTheDocument();
  });

  it('shows buy and sell prices per row from the HomePort spread', () => {
    render(<TradeScreen />);
    const port = HomePort.fromJSON(makePortJSON());
    expect(screen.getByTestId('trade-row-timber-buy-price')).toHaveTextContent(
      `buy ${port.sellPrice('timber')}`,
    );
    expect(screen.getByTestId('trade-row-timber-sell-price')).toHaveTextContent(
      `sell ${port.buyBackPrice('timber')}`,
    );
  });

  it('shows the ship hold for each row', () => {
    render(<TradeScreen />);
    expect(screen.getByTestId('trade-row-timber-hold')).toHaveTextContent('hold: 5');
    expect(screen.getByTestId('trade-row-fibre-hold')).toHaveTextContent('hold: 0');
  });

  it('updates the running profit live when a slider moves', () => {
    render(<TradeScreen />);
    const slider = screen.getByTestId('trade-row-timber-slider') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '-3' } });
    const port = HomePort.fromJSON(makePortJSON());
    const expected = 3 * port.buyBackPrice('timber');
    expect(screen.getByTestId('trade-screen-profit-value')).toHaveTextContent(`+${expected}`);
  });

  it('caps the sell slider at the ship cargo, and the buy slider at the visit limit', () => {
    render(<TradeScreen />);
    const slider = screen.getByTestId('trade-row-timber-slider') as HTMLInputElement;
    expect(slider.min).toBe('-5');
    expect(slider.max).toBe('20');
    const fibre = screen.getByTestId('trade-row-fibre-slider') as HTMLInputElement;
    expect(fibre.min).toBe('0');
  });

  it('disables Confirm until at least one slider is non-zero', () => {
    render(<TradeScreen />);
    const confirm = screen.getByTestId('trade-screen-confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('trade-row-timber-slider'), { target: { value: '2' } });
    expect(confirm.disabled).toBe(false);
  });

  it('commits the trade: mutates ship cargo + home-port netVolume', () => {
    render(<TradeScreen />);
    fireEvent.change(screen.getByTestId('trade-row-timber-slider'), { target: { value: '-3' } });
    fireEvent.change(screen.getByTestId('trade-row-fibre-slider'), { target: { value: '4' } });
    fireEvent.click(screen.getByTestId('trade-screen-confirm'));

    const state = useGameStore.getState();
    const ship = state.units.find((u) => u.id === 'ship-sloop-1')!;
    expect(ship.cargo.resources.timber).toBe(2);
    expect(ship.cargo.resources.fibre).toBe(4);

    const port = HomePort.fromJSON(state.homePorts.otk!);
    expect(port.netVolume('timber')).toBe(3);
    expect(port.netVolume('fibre')).toBe(-4);
  });

  it('resets all sliders to zero after a confirm', () => {
    render(<TradeScreen />);
    fireEvent.change(screen.getByTestId('trade-row-timber-slider'), { target: { value: '-2' } });
    fireEvent.click(screen.getByTestId('trade-screen-confirm'));
    const slider = screen.getByTestId('trade-row-timber-slider') as HTMLInputElement;
    expect(slider.value).toBe('0');
    expect(screen.getByTestId('trade-screen-profit-value')).toHaveTextContent('0');
  });

  it('closes back to the colony screen on close button', () => {
    render(<TradeScreen />);
    fireEvent.click(screen.getByTestId('trade-screen-close'));
    expect(useGameStore.getState().screen).toBe('colony');
    expect(useGameStore.getState().tradeSession).toBeNull();
  });

  it('closes on Escape', () => {
    render(<TradeScreen />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useGameStore.getState().screen).toBe('colony');
    expect(useGameStore.getState().tradeSession).toBeNull();
  });

  it('renders a placeholder when the session references missing entities', () => {
    useGameStore.getState().openTradeSession({ colonyId: 'ghost', unitId: 'nope' });
    render(<TradeScreen />);
    expect(screen.getByTestId('trade-screen-missing')).toBeInTheDocument();
  });
});
