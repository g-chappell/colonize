import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { ConcordFleetCampaignJSON } from '@colonize/core';
import { useGameStore } from '../store/game';
import { SovereigntyWarOverlay } from './SovereigntyWarOverlay';

function campaign(turnsElapsed: number, turnsRequired: number): ConcordFleetCampaignJSON {
  return {
    difficulty: 'standard',
    turnsRequired,
    turnsElapsed,
    waves: [
      {
        spawnTurn: 0,
        ships: ['frigate'],
        groundTroops: ['marines'],
      },
    ],
    spawnedWaveIndices: [],
  };
}

describe('SovereigntyWarOverlay', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders nothing when no Sovereignty War is active', () => {
    const { container } = render(<SovereigntyWarOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it('mounts the red tint and progress banner when a campaign is active', () => {
    useGameStore.getState().startSovereigntyWar(campaign(0, 20));
    render(<SovereigntyWarOverlay />);
    expect(screen.getByTestId('sovereignty-war-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('sovereignty-war-tint')).toBeInTheDocument();
    expect(screen.getByTestId('sovereignty-war-banner')).toBeInTheDocument();
  });

  it('shows turnsElapsed / turnsRequired in the banner', () => {
    useGameStore.getState().startSovereigntyWar(campaign(7, 20));
    render(<SovereigntyWarOverlay />);
    expect(screen.getByTestId('sovereignty-war-turns')).toHaveTextContent('7 / 20 turns');
  });

  it('renders a progressbar with the correct ARIA values', () => {
    useGameStore.getState().startSovereigntyWar(campaign(10, 20));
    render(<SovereigntyWarOverlay />);
    const track = screen.getByTestId('sovereignty-war-track');
    expect(track).toHaveAttribute('aria-valuemin', '0');
    expect(track).toHaveAttribute('aria-valuemax', '20');
    expect(track).toHaveAttribute('aria-valuenow', '10');
  });

  it('rounds percent to a whole number', () => {
    useGameStore.getState().startSovereigntyWar(campaign(5, 20));
    render(<SovereigntyWarOverlay />);
    expect(screen.getByTestId('sovereignty-war-percent')).toHaveTextContent('25%');
  });

  it('clamps aria-valuenow when turnsElapsed exceeds turnsRequired', () => {
    useGameStore.getState().startSovereigntyWar(campaign(25, 20));
    render(<SovereigntyWarOverlay />);
    const track = screen.getByTestId('sovereignty-war-track');
    expect(track).toHaveAttribute('aria-valuenow', '20');
    expect(screen.getByTestId('sovereignty-war-percent')).toHaveTextContent('100%');
  });

  it('unmounts cleanly after endSovereigntyWar is called', () => {
    useGameStore.getState().startSovereigntyWar(campaign(5, 20));
    const { container } = render(<SovereigntyWarOverlay />);
    expect(container.firstChild).not.toBeNull();
    act(() => {
      useGameStore.getState().endSovereigntyWar();
    });
    expect(container.firstChild).toBeNull();
  });
});
