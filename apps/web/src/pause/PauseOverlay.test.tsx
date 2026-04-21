import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { bus } from '../bus';
import { useGameStore } from '../store/game';
import { PauseOverlay } from './PauseOverlay';

describe('PauseOverlay', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  afterEach(() => {
    bus.clear();
  });

  it('renders the four root options', () => {
    render(<PauseOverlay />);
    expect(screen.getByTestId('pause-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('pause-overlay-resume')).toBeInTheDocument();
    expect(screen.getByTestId('pause-overlay-settings')).toBeInTheDocument();
    expect(screen.getByTestId('pause-overlay-save')).toBeInTheDocument();
    expect(screen.getByTestId('pause-overlay-quit')).toBeInTheDocument();
  });

  it('emits game:pause on mount and game:resume on unmount', () => {
    const events: string[] = [];
    bus.on('game:pause', () => events.push('pause'));
    bus.on('game:resume', () => events.push('resume'));
    const { unmount } = render(<PauseOverlay />);
    expect(events).toEqual(['pause']);
    unmount();
    expect(events).toEqual(['pause', 'resume']);
  });

  it('returns to game screen when Resume is clicked', () => {
    useGameStore.getState().setScreen('pause');
    render(<PauseOverlay />);
    fireEvent.click(screen.getByTestId('pause-overlay-resume'));
    expect(useGameStore.getState().screen).toBe('game');
  });

  it('returns to main menu and resets state when Quit to Menu is clicked', () => {
    useGameStore.getState().setScreen('pause');
    useGameStore.getState().setCurrentTurn(7);
    render(<PauseOverlay />);
    fireEvent.click(screen.getByTestId('pause-overlay-quit'));
    expect(useGameStore.getState().screen).toBe('menu');
    expect(useGameStore.getState().currentTurn).toBe(0);
  });

  it('shows a status message when Save is clicked', () => {
    render(<PauseOverlay />);
    fireEvent.click(screen.getByTestId('pause-overlay-save'));
    expect(screen.getByTestId('pause-overlay-status')).toHaveTextContent(/saved/i);
  });

  describe('settings view', () => {
    it('opens when Settings is clicked and back returns to root', () => {
      render(<PauseOverlay />);
      fireEvent.click(screen.getByTestId('pause-overlay-settings'));
      expect(screen.getByTestId('pause-overlay-settings-view')).toBeInTheDocument();
      expect(screen.queryByTestId('pause-overlay-items')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('pause-overlay-settings-back'));
      expect(screen.queryByTestId('pause-overlay-settings-view')).not.toBeInTheDocument();
      expect(screen.getByTestId('pause-overlay-items')).toBeInTheDocument();
    });

    it('seeds slider values from the store defaults', () => {
      render(<PauseOverlay />);
      fireEvent.click(screen.getByTestId('pause-overlay-settings'));
      expect(screen.getByTestId('pause-overlay-bgm-value')).toHaveTextContent('50%');
      expect(screen.getByTestId('pause-overlay-sfx-value')).toHaveTextContent('80%');
    });

    it('writes slider changes to the store (normalised 0..1)', () => {
      render(<PauseOverlay />);
      fireEvent.click(screen.getByTestId('pause-overlay-settings'));
      fireEvent.change(screen.getByTestId('pause-overlay-bgm-slider'), {
        target: { value: '25' },
      });
      expect(useGameStore.getState().settings.bgmVolume).toBeCloseTo(0.25, 5);
      fireEvent.change(screen.getByTestId('pause-overlay-sfx-slider'), {
        target: { value: '0' },
      });
      expect(useGameStore.getState().settings.sfxVolume).toBe(0);
    });

    it('toggles muted flag on the store', () => {
      render(<PauseOverlay />);
      fireEvent.click(screen.getByTestId('pause-overlay-settings'));
      const mute = screen.getByTestId('pause-overlay-mute');
      fireEvent.click(mute);
      expect(useGameStore.getState().settings.muted).toBe(true);
      fireEvent.click(mute);
      expect(useGameStore.getState().settings.muted).toBe(false);
    });
  });
});
