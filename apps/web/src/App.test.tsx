import { afterEach, describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import { bus } from './bus';
import { useGameStore } from './store/game';

describe('App', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  afterEach(() => {
    bus.clear();
  });

  it('renders the main menu by default', () => {
    render(<App />);
    expect(screen.getByTestId('main-menu')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Colonize' })).toBeInTheDocument();
  });

  it('shows the faction select screen when the screen advances', () => {
    useGameStore.getState().setScreen('faction-select');
    render(<App />);
    expect(screen.getByTestId('faction-select')).toBeInTheDocument();
    expect(screen.getByTestId('faction-card-otk')).toBeInTheDocument();
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

  describe('pause', () => {
    it('keeps the HUD mounted behind the pause overlay', () => {
      useGameStore.getState().setScreen('pause');
      render(<App />);
      expect(screen.getByTestId('hud')).toBeInTheDocument();
      expect(screen.getByTestId('pause-overlay')).toBeInTheDocument();
    });

    it('opens the pause overlay when Esc is pressed in-game', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      expect(screen.queryByTestId('pause-overlay')).not.toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(useGameStore.getState().screen).toBe('pause');
      expect(screen.getByTestId('pause-overlay')).toBeInTheDocument();
    });

    it('closes the pause overlay when Esc is pressed again', () => {
      useGameStore.getState().setScreen('pause');
      render(<App />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(useGameStore.getState().screen).toBe('game');
      expect(screen.queryByTestId('pause-overlay')).not.toBeInTheDocument();
    });

    it('does not trigger pause from the main menu', () => {
      useGameStore.getState().setScreen('menu');
      render(<App />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(useGameStore.getState().screen).toBe('menu');
    });

    it('opens the pause overlay from the HUD menu button', () => {
      useGameStore.getState().setScreen('game');
      render(<App />);
      fireEvent.click(screen.getByTestId('hud-menu-button'));
      expect(useGameStore.getState().screen).toBe('pause');
      expect(screen.getByTestId('pause-overlay')).toBeInTheDocument();
    });

    it('emits game:pause and game:resume around the overlay lifecycle', () => {
      const received: string[] = [];
      bus.on('game:pause', () => received.push('pause'));
      bus.on('game:resume', () => received.push('resume'));
      useGameStore.getState().setScreen('game');
      render(<App />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(received).toEqual(['pause']);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(received).toEqual(['pause', 'resume']);
    });
  });
});
