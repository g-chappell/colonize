import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ArchiveCharterId, FactionCharters } from '@colonize/core';
import { useGameStore } from '../store/game';
import { CouncilPickModal } from './CouncilPickModal';

function seed(
  factionId: string,
  hand: readonly [ArchiveCharterId, ArchiveCharterId],
  threshold: number = 50,
): void {
  const fc = new FactionCharters();
  useGameStore.setState({
    factionCharters: { [factionId]: fc.toJSON() },
    councilPick: { factionId, threshold, hand: [hand[0], hand[1]] },
  });
}

describe('CouncilPickModal', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders nothing when no Council pick is pending', () => {
    const { container } = render(<CouncilPickModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the threshold heading + preamble when a session is active', () => {
    seed('otk', [ArchiveCharterId.PirataCodexFragment, ArchiveCharterId.BloodlineWrit], 50);
    render(<CouncilPickModal />);
    expect(screen.getByTestId('council-pick-title')).toHaveTextContent(/first gathering/i);
    expect(screen.getByTestId('council-pick-preamble')).toHaveTextContent(/lantern smoke/i);
  });

  it('renders both offered charters with names and effect deltas', () => {
    seed('otk', [ArchiveCharterId.PirataCodexFragment, ArchiveCharterId.BloodlineWrit]);
    render(<CouncilPickModal />);
    expect(
      screen.getByTestId(`council-pick-card-name-${ArchiveCharterId.PirataCodexFragment}`),
    ).toHaveTextContent(/Pirata Codex Fragment/i);
    expect(
      screen.getByTestId(`council-pick-card-effect-${ArchiveCharterId.PirataCodexFragment}`),
    ).toHaveTextContent(/\+5 combat morale/i);
    expect(
      screen.getByTestId(`council-pick-card-name-${ArchiveCharterId.BloodlineWrit}`),
    ).toHaveTextContent(/Bloodline Writ/i);
    expect(
      screen.getByTestId(`council-pick-card-effect-${ArchiveCharterId.BloodlineWrit}`),
    ).toHaveTextContent(/\+10% recruitment speed/i);
  });

  it('adopts the chosen charter, clears the session, and moves it to selected', () => {
    seed('otk', [ArchiveCharterId.PirataCodexFragment, ArchiveCharterId.BloodlineWrit]);
    render(<CouncilPickModal />);
    fireEvent.click(
      screen.getByTestId(`council-pick-adopt-${ArchiveCharterId.PirataCodexFragment}`),
    );
    const state = useGameStore.getState();
    expect(state.councilPick).toBeNull();
    const snapshot = state.factionCharters.otk;
    expect(snapshot).toBeDefined();
    expect(snapshot!.selected).toContain(ArchiveCharterId.PirataCodexFragment);
    expect(snapshot!.available).not.toContain(ArchiveCharterId.PirataCodexFragment);
    // The unpicked card stays available (per task description:
    // "pick one, removed from draw" — only the picked card is removed).
    expect(snapshot!.available).toContain(ArchiveCharterId.BloodlineWrit);
  });

  it('renders cards with a data-register attribute so the CSS can tone-shift them', () => {
    seed('otk', [ArchiveCharterId.KrakenWindBlessing, ArchiveCharterId.FreePortCompact]);
    render(<CouncilPickModal />);
    const eldritchCard = screen.getByTestId(
      `council-pick-card-${ArchiveCharterId.KrakenWindBlessing}`,
    );
    const futurismCard = screen.getByTestId(
      `council-pick-card-${ArchiveCharterId.FreePortCompact}`,
    );
    expect(eldritchCard).toHaveAttribute('data-register', 'eldritch');
    expect(futurismCard).toHaveAttribute('data-register', 'salvaged-futurism');
  });
});
