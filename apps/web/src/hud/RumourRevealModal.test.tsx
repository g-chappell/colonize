import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { RumourOutcome } from '@colonize/core';
import { useGameStore, type PlayableFaction } from '../store/game';
import { RumourRevealModal } from './RumourRevealModal';

function showOutcome(outcome: RumourOutcome, faction: PlayableFaction = 'otk'): void {
  useGameStore.setState({ faction, rumourReveal: outcome });
}

describe('RumourRevealModal', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders nothing when no rumour is pending', () => {
    const { container } = render(<RumourRevealModal />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the ArchiveCache flavour + Liberty Chimes reward', () => {
    showOutcome({ category: 'ArchiveCache', libertyChimes: 12 });
    render(<RumourRevealModal />);
    expect(screen.getByTestId('rumour-reveal-title')).toHaveTextContent(/Archive Cache/i);
    expect(screen.getByTestId('rumour-reveal-flavour')).toHaveTextContent(/Liberty broadsheets/i);
    expect(screen.getByTestId('rumour-reveal-reward-value')).toHaveTextContent(
      '+12 Liberty Chimes',
    );
  });

  it('shows OTK-specific flavour when a LegendaryWreck grants the blueprint to the OTK player', () => {
    showOutcome(
      {
        category: 'LegendaryWreck',
        reward: { kind: 'legendary-blueprint' },
      },
      'otk',
    );
    render(<RumourRevealModal />);
    expect(screen.getByTestId('rumour-reveal-flavour')).toHaveTextContent(/Kraken colours/i);
    expect(screen.getByTestId('rumour-reveal-reward-value')).toHaveTextContent(/blueprint/i);
  });

  it('shows default LegendaryWreck flavour + salvage reward for non-OTK factions', () => {
    showOutcome(
      {
        category: 'LegendaryWreck',
        reward: { kind: 'salvage', amount: 4 },
      },
      'phantom',
    );
    render(<RumourRevealModal />);
    expect(screen.getByTestId('rumour-reveal-flavour')).toHaveTextContent(/unfamiliar make/i);
    expect(screen.getByTestId('rumour-reveal-reward-value')).toHaveTextContent('+4 Salvage');
  });

  it('shows the KrakenShrine reputation delta', () => {
    showOutcome({ category: 'KrakenShrine', reputationDelta: 2 });
    render(<RumourRevealModal />);
    expect(screen.getByTestId('rumour-reveal-title')).toHaveTextContent(/Kraken Shrine/i);
    expect(screen.getByTestId('rumour-reveal-reward-value')).toHaveTextContent(
      '+2 Kraken reputation',
    );
  });

  it.each([
    ['nothing', /vision fades/i],
    ['bonus', /true landfall/i],
    ['hazard', /reef where there should be none/i],
  ] as const)('shows the FataMorganaMirage %s variant copy', (variant, matcher) => {
    showOutcome({ category: 'FataMorganaMirage', variant });
    render(<RumourRevealModal />);
    expect(screen.getByTestId('rumour-reveal-reward-value')).toHaveTextContent(matcher);
  });

  it('dismisses the reveal on Claim click', () => {
    showOutcome({ category: 'ArchiveCache', libertyChimes: 7 });
    render(<RumourRevealModal />);
    fireEvent.click(screen.getByTestId('rumour-reveal-claim'));
    expect(useGameStore.getState().rumourReveal).toBeNull();
  });

  it('uses default (non-OTK) flavour for the OTK player when the reward is plain salvage', () => {
    showOutcome(
      {
        category: 'LegendaryWreck',
        reward: { kind: 'salvage', amount: 3 },
      },
      'otk',
    );
    render(<RumourRevealModal />);
    expect(screen.getByTestId('rumour-reveal-flavour')).toHaveTextContent(/unfamiliar make/i);
  });
});
