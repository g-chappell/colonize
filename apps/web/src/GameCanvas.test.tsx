import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { GameCanvas } from './GameCanvas';

describe('GameCanvas', () => {
  it('renders a parent container that Phaser can mount into', () => {
    render(<GameCanvas />);
    const host = screen.getByTestId('game-canvas');
    expect(host).toBeInTheDocument();
    expect(host).toHaveClass('game-canvas');
  });
});
