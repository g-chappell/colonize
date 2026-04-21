import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FactionSelect } from './FactionSelect';
import { useGameStore } from '../store/game';

describe('FactionSelect', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().setScreen('faction-select');
  });

  it('renders all four playable factions with crest, lore, and bonus', () => {
    render(<FactionSelect />);
    for (const id of ['otk', 'ironclad', 'phantom', 'bloodborne'] as const) {
      const card = screen.getByTestId(`faction-card-${id}`);
      expect(card).toBeInTheDocument();
      expect(screen.getByTestId(`faction-crest-${id}`)).toBeInTheDocument();
    }
    expect(screen.getByText(/Order of the Kraken/)).toBeInTheDocument();
    expect(screen.getByText(/Ironclad Syndicate/)).toBeInTheDocument();
    expect(screen.getByText(/Phantom Corsairs/)).toBeInTheDocument();
    expect(screen.getByText(/Bloodborne Legion/)).toBeInTheDocument();
  });

  it('selecting a faction sets it in the store and advances to the game screen', () => {
    render(<FactionSelect />);
    fireEvent.click(screen.getByTestId('faction-card-ironclad'));
    expect(useGameStore.getState().faction).toBe('ironclad');
    expect(useGameStore.getState().screen).toBe('game');
  });

  it('Back returns to the main menu without changing faction', () => {
    render(<FactionSelect />);
    fireEvent.click(screen.getByTestId('faction-select-back'));
    expect(useGameStore.getState().screen).toBe('menu');
    expect(useGameStore.getState().faction).toBe('otk');
  });
});
