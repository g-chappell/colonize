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

  it('selecting a faction queues a pendingNewGame for the GameCanvas to consume', () => {
    render(<FactionSelect />);
    fireEvent.click(screen.getByTestId('faction-card-otk'));
    const pending = useGameStore.getState().pendingNewGame;
    expect(pending?.factionId).toBe('otk');
    expect(typeof pending?.seed).toBe('number');
  });

  it('Back returns to the main menu without changing faction', () => {
    render(<FactionSelect />);
    fireEvent.click(screen.getByTestId('faction-select-back'));
    expect(useGameStore.getState().screen).toBe('menu');
    expect(useGameStore.getState().faction).toBe('otk');
  });

  it('renders a bonus tooltip on every card with enumerated bonuses and a canon flavour quote', () => {
    render(<FactionSelect />);
    for (const id of ['otk', 'ironclad', 'phantom', 'bloodborne'] as const) {
      const tooltip = screen.getByTestId(`faction-tooltip-${id}`);
      expect(tooltip).toBeInTheDocument();
      expect(tooltip.getAttribute('role')).toBe('tooltip');
      expect(tooltip.querySelectorAll('li').length).toBeGreaterThanOrEqual(2);
    }
    expect(screen.getByTestId('faction-tooltip-otk').textContent).toMatch(/Red Tide/);
    expect(screen.getByTestId('faction-tooltip-ironclad').textContent).toMatch(/colony production/);
    expect(screen.getByTestId('faction-tooltip-phantom').textContent).toMatch(/Stealth/);
    expect(screen.getByTestId('faction-tooltip-bloodborne').textContent).toMatch(/combat damage/);
    expect(screen.getByTestId('faction-tooltip-otk').textContent).toMatch(/Hic sunt dracones/);
  });

  it('each faction card is linked to its tooltip via aria-describedby', () => {
    render(<FactionSelect />);
    for (const id of ['otk', 'ironclad', 'phantom', 'bloodborne'] as const) {
      const card = screen.getByTestId(`faction-card-${id}`);
      expect(card.getAttribute('aria-describedby')).toBe(`faction-tooltip-${id}`);
    }
  });
});
