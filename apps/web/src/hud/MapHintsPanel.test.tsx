import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { MapHint } from '@colonize/core';
import { useGameStore } from '../store/game';
import { MapHintsPanel } from './MapHintsPanel';

const EAST_ARCHIVE: MapHint = {
  origin: { x: 10, y: 10 },
  direction: 'e',
  category: 'archive-cache',
  sourceRumourId: 'rumour-archive-cache-east',
};

const WEST_WRECK: MapHint = {
  origin: { x: 10, y: 10 },
  direction: 'w',
  category: 'wreck',
  sourceRumourId: 'rumour-derelict-leeward',
};

describe('MapHintsPanel', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders nothing when the mapHints slice is empty', () => {
    const { container } = render(<MapHintsPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('mounts a row per lead with the matching chevron + category', () => {
    useGameStore.getState().addMapHints([EAST_ARCHIVE, WEST_WRECK]);
    render(<MapHintsPanel />);
    expect(screen.getByTestId('map-hints-panel')).toBeInTheDocument();
    const archiveRow = screen.getByTestId('map-hint-rumour-archive-cache-east');
    expect(archiveRow).toHaveTextContent(/Archive cache/);
    expect(archiveRow).toHaveTextContent(/east/);
    expect(archiveRow.querySelector('[data-direction="e"]')).toHaveTextContent('→');
    const wreckRow = screen.getByTestId('map-hint-rumour-derelict-leeward');
    expect(wreckRow).toHaveTextContent(/Legendary wreck/);
    expect(wreckRow.querySelector('[data-direction="w"]')).toHaveTextContent('←');
  });

  it('uses the sourceRumourId as the data-category vehicle so CSS can style per lead kind', () => {
    useGameStore.getState().addMapHints([WEST_WRECK]);
    render(<MapHintsPanel />);
    const row = screen.getByTestId('map-hint-rumour-derelict-leeward');
    expect(row).toHaveAttribute('data-category', 'wreck');
  });

  it('remounts when the tavern dismiss flow appends a new lead', () => {
    render(<MapHintsPanel />);
    expect(screen.queryByTestId('map-hints-panel')).not.toBeInTheDocument();
    act(() => {
      useGameStore.getState().addMapHints([EAST_ARCHIVE]);
    });
    expect(screen.getByTestId('map-hints-panel')).toBeInTheDocument();
    expect(screen.getByTestId('map-hint-rumour-archive-cache-east')).toBeInTheDocument();
  });
});
