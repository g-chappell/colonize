import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { getTidewaterPartyFlavour } from '@colonize/content';
import { useGameStore } from '../store/game';
import { TidewaterPartyModal } from './TidewaterPartyModal';

interface EventFixture {
  availableCargo: Record<string, number>;
  dumpQty: number;
  freezeTurns: number;
  irePenalty: number;
}

const baseEvent: EventFixture = {
  availableCargo: { salvage: 12, planks: 4 },
  dumpQty: 10,
  freezeTurns: 8,
  irePenalty: 15,
};

function showEvent(overrides: Partial<EventFixture> = {}): void {
  useGameStore.getState().showTidewaterPartyEvent({ ...baseEvent, ...overrides });
}

describe('TidewaterPartyModal', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders nothing when no event is pending', () => {
    const { container } = render(<TidewaterPartyModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the Barataria Bay heading and the event consequences', () => {
    showEvent();
    render(<TidewaterPartyModal />);
    const flavour = getTidewaterPartyFlavour();
    expect(screen.getByTestId('tidewater-party-title')).toHaveTextContent(flavour.heading);
    expect(screen.getByTestId('tidewater-party-dateline')).toHaveTextContent(flavour.dateline);
    expect(screen.getByTestId('tidewater-party-summary')).toHaveTextContent(flavour.summary);
    const consequences = screen.getByTestId('tidewater-party-consequence');
    expect(consequences).toHaveTextContent('10');
    expect(consequences).toHaveTextContent('8');
    expect(consequences).toHaveTextContent('+15');
  });

  it('lists only goods the player has at least dumpQty of in the chooser', () => {
    showEvent();
    render(<TidewaterPartyModal />);
    const select = screen.getByTestId('tidewater-party-select') as HTMLSelectElement;
    const values = Array.from(select.options)
      .map((opt) => opt.value)
      .filter((v) => v !== '');
    expect(values).toEqual(['salvage']);
  });

  it('shows a no-cargo beat when nothing in the hold qualifies', () => {
    showEvent({ availableCargo: { planks: 4 } });
    render(<TidewaterPartyModal />);
    expect(screen.getByTestId('tidewater-party-no-cargo')).toBeInTheDocument();
    expect(screen.queryByTestId('tidewater-party-select')).not.toBeInTheDocument();
    expect(screen.getByTestId('tidewater-party-confirm')).toBeDisabled();
  });

  it('keeps the confirm button disabled until a good is chosen', () => {
    showEvent();
    render(<TidewaterPartyModal />);
    expect(screen.getByTestId('tidewater-party-confirm')).toBeDisabled();
    fireEvent.change(screen.getByTestId('tidewater-party-select'), {
      target: { value: 'salvage' },
    });
    expect(screen.getByTestId('tidewater-party-confirm')).not.toBeDisabled();
  });

  it('clicking confirm fires the store action, clears the event, and records the dump', () => {
    showEvent();
    render(<TidewaterPartyModal />);
    fireEvent.change(screen.getByTestId('tidewater-party-select'), {
      target: { value: 'salvage' },
    });
    fireEvent.click(screen.getByTestId('tidewater-party-confirm'));
    const state = useGameStore.getState();
    expect(state.tidewaterPartyEvent).toBeNull();
    expect(state.lastTidewaterDump).toEqual({ resourceId: 'salvage', qty: 10 });
    expect(state.concordTension.tension).toBe(0);
    expect(state.concordTension.freezeTurnsRemaining).toBe(8);
    expect(state.concordTension.ire).toBe(15);
  });

  it('clicking cancel clears the event without touching the tension meter', () => {
    showEvent();
    useGameStore.setState({
      concordTension: {
        tension: 20,
        thresholds: useGameStore.getState().concordTension.thresholds,
        crossed: [],
        pending: [],
        ire: 0,
        freezeTurnsRemaining: 0,
      },
    });
    render(<TidewaterPartyModal />);
    fireEvent.click(screen.getByTestId('tidewater-party-cancel'));
    const state = useGameStore.getState();
    expect(state.tidewaterPartyEvent).toBeNull();
    expect(state.concordTension.tension).toBe(20);
    expect(state.concordTension.ire).toBe(0);
    expect(state.lastTidewaterDump).toBeNull();
  });

  it('defaults to the empty option on first mount so the player has to choose explicitly', () => {
    showEvent();
    render(<TidewaterPartyModal />);
    const select = screen.getByTestId('tidewater-party-select') as HTMLSelectElement;
    expect(select.value).toBe('');
  });
});
