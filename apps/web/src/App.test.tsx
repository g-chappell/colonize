import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Colonize' })).toBeInTheDocument();
  });

  it('shows the current in-world era', () => {
    render(<App />);
    expect(screen.getByText(/NW 2191/)).toBeInTheDocument();
    expect(screen.getByText(/Early Liberty Era/)).toBeInTheDocument();
  });

  it('shows the OTK motto', () => {
    render(<App />);
    expect(screen.getByText(/Hic sunt dracones/i)).toBeInTheDocument();
  });
});
