import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useGameStore } from '../store/game';
import { TavernModal } from './TavernModal';

function seed(
  colonyId: string,
  rumourIds: readonly string[] = [
    'rumour-archive-cache-east',
    'rumour-derelict-leeward',
    'rumour-kraken-shrine-fog',
  ],
): void {
  useGameStore.setState({
    tavernEncounter: {
      colonyId,
      // Cast through unknown so the test helper can pass plain strings;
      // the production code path goes through the typed selector.
      rumourIds: rumourIds as unknown as readonly never[],
    },
  });
}

describe('TavernModal', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders nothing when no tavern encounter is pending', () => {
    const { container } = render(<TavernModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the tavern place + ambience headers when an encounter is active', () => {
    seed('colony-1');
    render(<TavernModal />);
    expect(screen.getByTestId('tavern-encounter-place')).toHaveTextContent(/colony-1/);
    expect(screen.getByTestId('tavern-encounter-title')).toHaveTextContent(/Lamplit Hall/i);
    expect(screen.getByTestId('tavern-encounter-ambience')).toHaveTextContent(/rumour-mill/i);
  });

  it('renders one card per supplied rumour with headline + body', () => {
    seed('colony-1', [
      'rumour-archive-cache-east',
      'rumour-derelict-leeward',
      'rumour-kraken-shrine-fog',
    ]);
    render(<TavernModal />);
    expect(screen.getByTestId('tavern-encounter-rumours').children).toHaveLength(3);
    expect(
      screen.getByTestId('tavern-encounter-headline-rumour-archive-cache-east'),
    ).toHaveTextContent(/waxed drum/i);
    expect(screen.getByTestId('tavern-encounter-body-rumour-derelict-leeward')).toHaveTextContent(
      /topsail caught the morning glass/i,
    );
  });

  it('shows the empty-pool fallback when no rumours are supplied', () => {
    seed('colony-1', []);
    render(<TavernModal />);
    expect(screen.queryByTestId('tavern-encounter-rumours')).toBeNull();
    expect(screen.getByTestId('tavern-encounter-empty')).toHaveTextContent(/Try the rum/i);
  });

  it('clears the encounter when "Leave the tavern" is clicked', () => {
    seed('colony-1');
    render(<TavernModal />);
    fireEvent.click(screen.getByTestId('tavern-encounter-dismiss'));
    expect(useGameStore.getState().tavernEncounter).toBeNull();
  });

  it('renders cards with a data-register attribute so the CSS can tone-shift them', () => {
    seed('colony-1', ['rumour-kraken-shrine-fog', 'rumour-archive-cache-east']);
    render(<TavernModal />);
    expect(screen.getByTestId('tavern-encounter-rumour-rumour-kraken-shrine-fog')).toHaveAttribute(
      'data-register',
      'eldritch',
    );
    expect(screen.getByTestId('tavern-encounter-rumour-rumour-archive-cache-east')).toHaveAttribute(
      'data-register',
      'salvaged-futurism',
    );
  });
});
