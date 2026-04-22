import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useGameStore } from '../store/game';
import { SovereigntyBeatModal } from './SovereigntyBeatModal';
import { getSovereigntyBeat } from './sovereignty-progress';

describe('SovereigntyBeatModal', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders nothing when no beat is pending', () => {
    const { container } = render(<SovereigntyBeatModal />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the 25% beat copy when the slice is 25', () => {
    useGameStore.getState().showSovereigntyBeat(25);
    render(<SovereigntyBeatModal />);
    const beat = getSovereigntyBeat(25);
    expect(screen.getByTestId('sovereignty-beat-milestone')).toHaveTextContent('25%');
    expect(screen.getByTestId('sovereignty-beat-title')).toHaveTextContent(beat.title);
    expect(screen.getByTestId('sovereignty-beat-flavour')).toHaveTextContent(beat.flavour);
  });

  it('renders the 100% victory beat', () => {
    useGameStore.getState().showSovereigntyBeat(100);
    render(<SovereigntyBeatModal />);
    const beat = getSovereigntyBeat(100);
    expect(screen.getByTestId('sovereignty-beat-milestone')).toHaveTextContent('100%');
    expect(screen.getByTestId('sovereignty-beat-title')).toHaveTextContent(beat.title);
  });

  it('clears the beat slice on dismiss click', () => {
    useGameStore.getState().showSovereigntyBeat(50);
    render(<SovereigntyBeatModal />);
    fireEvent.click(screen.getByTestId('sovereignty-beat-dismiss'));
    expect(useGameStore.getState().sovereigntyBeat).toBeNull();
  });

  it.each([25, 50, 75, 100] as const)('renders a distinct title for the %s%% beat', (m) => {
    useGameStore.getState().showSovereigntyBeat(m);
    render(<SovereigntyBeatModal />);
    const expected = getSovereigntyBeat(m).title;
    expect(screen.getByTestId('sovereignty-beat-title')).toHaveTextContent(expected);
  });
});
