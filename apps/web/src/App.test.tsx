import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';
import { useGameStore } from './store/game';

describe('App', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders the main menu by default', () => {
    render(<App />);
    expect(screen.getByTestId('main-menu')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Colonize' })).toBeInTheDocument();
  });

  it('shows the faction-select placeholder when the screen advances', () => {
    useGameStore.getState().setScreen('faction-select');
    render(<App />);
    expect(screen.getByTestId('faction-select-placeholder')).toBeInTheDocument();
  });

  it('mounts the HUD over the game stage once the game starts', () => {
    useGameStore.getState().setScreen('game');
    render(<App />);
    expect(screen.getByTestId('hud')).toBeInTheDocument();
    expect(screen.getByTestId('hud-end-turn')).toBeInTheDocument();
    expect(screen.getByText(/NW 2191/)).toBeInTheDocument();
    expect(screen.getByText(/Early Liberty Era/)).toBeInTheDocument();
    expect(screen.getByText(/Hic sunt dracones/i)).toBeInTheDocument();
  });
});
