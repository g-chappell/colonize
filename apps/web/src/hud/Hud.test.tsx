import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { bus } from '../bus';
import { useGameStore } from '../store/game';
import { EndTurnButton, FactionChip, Hud, ResourceBar, YearDisplay } from './Hud';

describe('Hud', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  afterEach(() => {
    bus.clear();
  });

  it('renders the full HUD layout', () => {
    render(<Hud />);
    expect(screen.getByTestId('hud')).toBeInTheDocument();
    expect(screen.getByTestId('hud-year')).toBeInTheDocument();
    expect(screen.getByTestId('hud-faction')).toBeInTheDocument();
    expect(screen.getByTestId('hud-resources')).toBeInTheDocument();
    expect(screen.getByTestId('hud-end-turn')).toBeInTheDocument();
  });

  describe('YearDisplay', () => {
    it('renders NW + epoch year on turn zero', () => {
      render(<YearDisplay />);
      const year = screen.getByTestId('hud-year');
      expect(year).toHaveTextContent('NW');
      expect(year).toHaveTextContent('2191');
    });

    it('adds the current turn to the epoch year', () => {
      useGameStore.getState().setCurrentTurn(7);
      render(<YearDisplay />);
      expect(screen.getByTestId('hud-year')).toHaveTextContent('2198');
    });
  });

  describe('FactionChip', () => {
    it('displays the default faction name', () => {
      render(<FactionChip />);
      expect(screen.getByTestId('hud-faction')).toHaveTextContent('Order of the Kraken');
    });

    it('updates when the store faction changes', () => {
      useGameStore.getState().setFaction('bloodborne');
      render(<FactionChip />);
      expect(screen.getByTestId('hud-faction')).toHaveTextContent('Bloodborne Legion');
    });
  });

  describe('ResourceBar', () => {
    it('renders all three resource slots with placeholder values', () => {
      render(<ResourceBar />);
      expect(screen.getByText('Salt')).toBeInTheDocument();
      expect(screen.getByText('Rum')).toBeInTheDocument();
      expect(screen.getByText('Iron')).toBeInTheDocument();
      expect(screen.getAllByText('—')).toHaveLength(3);
    });
  });

  describe('EndTurnButton', () => {
    it('advances the store turn when clicked', () => {
      render(<EndTurnButton />);
      fireEvent.click(screen.getByTestId('hud-end-turn'));
      expect(useGameStore.getState().currentTurn).toBe(1);
    });

    it('emits turn:advanced with the new turn', () => {
      const received: number[] = [];
      bus.on('turn:advanced', (payload) => received.push(payload.turn));
      render(<EndTurnButton />);
      fireEvent.click(screen.getByTestId('hud-end-turn'));
      fireEvent.click(screen.getByTestId('hud-end-turn'));
      expect(received).toEqual([1, 2]);
    });
  });
});
