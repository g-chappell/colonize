import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  CombatActionType,
  CombatResult,
  type CombatEvent,
  type CombatOutcome,
} from '@colonize/core';
import { useGameStore } from '../store/game';
import { CombatOverlay } from './CombatOverlay';

const ATK = {
  id: 'a',
  faction: 'otk',
  hull: 50,
  maxHull: 50,
  guns: 12,
  crew: 50,
  maxCrew: 50,
  movement: 4,
  maxMovement: 4,
} as const;

const DEF = {
  id: 'd',
  faction: 'ironclad',
  hull: 0,
  maxHull: 50,
  guns: 10,
  crew: 50,
  maxCrew: 50,
  movement: 3,
  maxMovement: 3,
} as const;

function makeOutcome(
  events: readonly CombatEvent[],
  result: CombatResult = CombatResult.Inconclusive,
): CombatOutcome {
  return {
    action: CombatActionType.Broadside,
    result,
    attacker: ATK,
    defender: { ...DEF, hull: 30 },
    events,
  };
}

const TWO_BROADSIDES = makeOutcome([
  { kind: 'broadside-volley', firer: 'attacker', damage: 10, targetHullAfter: 40 },
  { kind: 'broadside-volley', firer: 'defender', damage: 6, targetHullAfter: 44 },
]);

describe('CombatOverlay', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no combat is pending', () => {
    const { container } = render(<CombatOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it('mounts the overlay when a combat outcome is set', () => {
    useGameStore.getState().showCombatOutcome(TWO_BROADSIDES);
    render(<CombatOverlay />);
    expect(screen.getByTestId('combat-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('combat-overlay-title')).toHaveTextContent(/engagement/i);
  });

  it('shows Skip while playing and Continue once finished', () => {
    useGameStore.getState().showCombatOutcome(TWO_BROADSIDES);
    render(<CombatOverlay />);
    expect(screen.getByTestId('combat-overlay-skip')).toBeInTheDocument();
    expect(screen.queryByTestId('combat-overlay-continue')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('combat-overlay-skip'));
    expect(screen.queryByTestId('combat-overlay-skip')).not.toBeInTheDocument();
    expect(screen.getByTestId('combat-overlay-continue')).toBeInTheDocument();
  });

  it('reveals every log entry after Skip', () => {
    useGameStore.getState().showCombatOutcome(TWO_BROADSIDES);
    render(<CombatOverlay />);
    fireEvent.click(screen.getByTestId('combat-overlay-skip'));
    expect(screen.getByTestId('combat-overlay-log-item-0')).toHaveTextContent(
      /attacker broadside/i,
    );
    expect(screen.getByTestId('combat-overlay-log-item-1')).toHaveTextContent(
      /defender returns fire/i,
    );
  });

  it('renders the human-readable result line after Skip', () => {
    useGameStore
      .getState()
      .showCombatOutcome(
        makeOutcome(
          [{ kind: 'broadside-volley', firer: 'attacker', damage: 50, targetHullAfter: 0 }],
          CombatResult.DefenderSunk,
        ),
      );
    render(<CombatOverlay />);
    fireEvent.click(screen.getByTestId('combat-overlay-skip'));
    expect(screen.getByTestId('combat-overlay-result')).toHaveTextContent(/defender sunk/i);
  });

  it('hides the per-beat label once the cinematic is finished', () => {
    useGameStore.getState().showCombatOutcome(TWO_BROADSIDES);
    render(<CombatOverlay />);
    expect(screen.getByTestId('combat-overlay-beat-label')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('combat-overlay-skip'));
    expect(screen.queryByTestId('combat-overlay-beat-label')).not.toBeInTheDocument();
  });

  it('focuses the attacker sprite while the first attacker broadside is active', () => {
    useGameStore.getState().showCombatOutcome(TWO_BROADSIDES);
    render(<CombatOverlay />);
    expect(screen.getByTestId('combat-overlay-attacker')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('combat-overlay-defender')).toHaveAttribute('data-active', 'false');
  });

  it('clears the focus once the cinematic is finished', () => {
    useGameStore.getState().showCombatOutcome(TWO_BROADSIDES);
    render(<CombatOverlay />);
    fireEvent.click(screen.getByTestId('combat-overlay-skip'));
    expect(screen.getByTestId('combat-overlay-attacker')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('combat-overlay-defender')).toHaveAttribute('data-active', 'false');
  });

  it('dismisses the outcome from the store on Continue', () => {
    useGameStore.getState().showCombatOutcome(TWO_BROADSIDES);
    render(<CombatOverlay />);
    fireEvent.click(screen.getByTestId('combat-overlay-skip'));
    fireEvent.click(screen.getByTestId('combat-overlay-continue'));
    expect(useGameStore.getState().combatOutcome).toBeNull();
  });

  it('renders an empty log + finished controls for a zero-event outcome', () => {
    useGameStore.getState().showCombatOutcome(makeOutcome([], CombatResult.Inconclusive));
    render(<CombatOverlay />);
    expect(screen.queryByTestId('combat-overlay-skip')).not.toBeInTheDocument();
    expect(screen.getByTestId('combat-overlay-continue')).toBeInTheDocument();
    expect(screen.getByTestId('combat-overlay-result')).toHaveTextContent(/inconclusive/i);
  });

  it('reveals successive log entries as time advances', () => {
    vi.useFakeTimers();
    useGameStore.getState().showCombatOutcome(TWO_BROADSIDES);
    render(<CombatOverlay />);
    expect(screen.getByTestId('combat-overlay-log-item-0')).toBeInTheDocument();
    expect(screen.queryByTestId('combat-overlay-log-item-1')).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.getByTestId('combat-overlay-log-item-1')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('combat-overlay-continue')).toBeInTheDocument();
  });

  it('restarts playback when a new outcome opens after dismissing the previous one', () => {
    useGameStore.getState().showCombatOutcome(TWO_BROADSIDES);
    const { rerender } = render(<CombatOverlay />);
    fireEvent.click(screen.getByTestId('combat-overlay-skip'));
    expect(screen.getByTestId('combat-overlay-continue')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('combat-overlay-continue'));
    act(() => {
      useGameStore
        .getState()
        .showCombatOutcome(
          makeOutcome([
            { kind: 'broadside-volley', firer: 'defender', damage: 4, targetHullAfter: 46 },
          ]),
        );
    });
    rerender(<CombatOverlay />);
    expect(screen.getByTestId('combat-overlay-skip')).toBeInTheDocument();
    expect(screen.queryByTestId('combat-overlay-log-item-1')).not.toBeInTheDocument();
  });
});
