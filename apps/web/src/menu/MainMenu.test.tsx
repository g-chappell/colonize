import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainMenu } from './MainMenu';
import { useGameStore } from '../store/game';

describe('MainMenu', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('renders the title and motto', () => {
    render(<MainMenu />);
    expect(screen.getByRole('heading', { level: 1, name: 'Colonize' })).toBeInTheDocument();
    expect(screen.getByText(/Hic sunt dracones/i)).toBeInTheDocument();
  });

  it('shows the OTK heraldry', () => {
    render(<MainMenu />);
    const heraldry = screen.getByTestId('main-menu-heraldry');
    expect(heraldry).toBeInTheDocument();
    expect(heraldry).toHaveAttribute('aria-label', expect.stringMatching(/paired dragons/i));
  });

  it('renders all five menu buttons', () => {
    render(<MainMenu />);
    expect(screen.getByTestId('main-menu-new-game')).toHaveTextContent('New Game');
    expect(screen.getByTestId('main-menu-continue')).toHaveTextContent('Continue');
    expect(screen.getByTestId('main-menu-settings')).toHaveTextContent('Settings');
    expect(screen.getByTestId('main-menu-codex')).toHaveTextContent('Codex');
    expect(screen.getByTestId('main-menu-quit')).toHaveTextContent('Quit');
  });

  it('disables Continue until a save exists', () => {
    render(<MainMenu />);
    expect(screen.getByTestId('main-menu-continue')).toBeDisabled();
  });

  it('advances to faction-select when New Game is clicked', () => {
    render(<MainMenu />);
    expect(useGameStore.getState().screen).toBe('menu');
    fireEvent.click(screen.getByTestId('main-menu-new-game'));
    expect(useGameStore.getState().screen).toBe('faction-select');
  });
});
