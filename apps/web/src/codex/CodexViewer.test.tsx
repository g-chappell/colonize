import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CODEX_ENTRIES } from '@colonize/content';
import { useGameStore } from '../store/game';
import { CodexViewer } from './CodexViewer';

describe('CodexViewer', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders the drawer with the Codex title', () => {
    render(<CodexViewer />);
    expect(screen.getByTestId('codex-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('codex-viewer-panel')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Codex' })).toBeInTheDocument();
  });

  it('emits a section per category, in fixed order', () => {
    render(<CodexViewer />);
    const expected = [
      'codex-section-faction',
      'codex-section-bloodline',
      'codex-section-horror',
      'codex-section-ship',
      'codex-section-location',
    ];
    for (const id of expected) expect(screen.getByTestId(id)).toBeInTheDocument();
  });

  it('renders each initially-unlocked entry and skips locked entries', () => {
    useGameStore.setState({ codexUnlocked: ['faction-otk'] });
    render(<CodexViewer />);
    expect(screen.getByTestId('codex-entry-faction-otk')).toBeInTheDocument();
    // An entry that is in the registry but not unlocked is not rendered.
    expect(screen.queryByTestId('codex-entry-ship-black-pearl')).not.toBeInTheDocument();
  });

  it('shows the empty-section hint when a category has no unlocked entries', () => {
    useGameStore.setState({ codexUnlocked: ['faction-otk'] });
    render(<CodexViewer />);
    expect(screen.getByTestId('codex-section-ship-empty')).toBeInTheDocument();
    // The faction section has an entry, so it does NOT show the empty hint.
    expect(screen.queryByTestId('codex-section-faction-empty')).not.toBeInTheDocument();
  });

  it('reveals a newly unlocked entry on the next render', () => {
    useGameStore.setState({ codexUnlocked: [] });
    const { rerender } = render(<CodexViewer />);
    expect(screen.queryByTestId('codex-entry-ship-black-pearl')).not.toBeInTheDocument();
    useGameStore.getState().unlockCodexEntry('ship-black-pearl');
    rerender(<CodexViewer />);
    expect(screen.getByTestId('codex-entry-ship-black-pearl')).toBeInTheDocument();
  });

  it('reports the count of unlocked entries', () => {
    useGameStore.setState({ codexUnlocked: ['faction-otk'] });
    render(<CodexViewer />);
    expect(screen.getByTestId('codex-viewer-count')).toHaveTextContent('1 entry');
    useGameStore.setState({ codexUnlocked: ['faction-otk', 'ship-black-pearl'] });
    render(<CodexViewer />);
    expect(screen.getAllByTestId('codex-viewer-count')[1]).toHaveTextContent('2 entries');
  });

  it('routes back to game when Close is clicked', () => {
    useGameStore.getState().setScreen('codex');
    render(<CodexViewer />);
    fireEvent.click(screen.getByTestId('codex-viewer-close'));
    expect(useGameStore.getState().screen).toBe('game');
  });

  it('stamps each entry with its canon-tier label', () => {
    // Every known entry registers a tier badge when unlocked. Use the
    // full registry so we exercise all three tier labels.
    useGameStore.setState({ codexUnlocked: CODEX_ENTRIES.map((e) => e.id) });
    render(<CodexViewer />);
    for (const entry of CODEX_ENTRIES) {
      const tierEl = screen.getByTestId(`codex-entry-${entry.id}-tier`);
      expect(tierEl.textContent).toMatch(/Canon|Draft|Fragment/);
    }
  });

  it('flags [OPEN] entries with a fragmentary note and non-[OPEN] entries without', () => {
    useGameStore.setState({ codexUnlocked: CODEX_ENTRIES.map((e) => e.id) });
    render(<CodexViewer />);
    const openEntries = CODEX_ENTRIES.filter((e) => e.canonTier === 'open');
    const nonOpenEntries = CODEX_ENTRIES.filter((e) => e.canonTier !== 'open');
    // The registry must contain at least one [OPEN] entry for this test
    // to exercise the fragmentary-rendering branch.
    expect(openEntries.length).toBeGreaterThan(0);
    for (const entry of openEntries) {
      expect(screen.getByTestId(`codex-entry-${entry.id}-fragmentary-note`)).toBeInTheDocument();
    }
    for (const entry of nonOpenEntries) {
      expect(
        screen.queryByTestId(`codex-entry-${entry.id}-fragmentary-note`),
      ).not.toBeInTheDocument();
    }
  });
});
