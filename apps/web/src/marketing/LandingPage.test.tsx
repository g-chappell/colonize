import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LandingPage } from './LandingPage';
import { routeFromPath } from './path-route';

describe('LandingPage', () => {
  let originalPath: string;

  beforeEach(() => {
    originalPath = window.location.pathname;
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalPath);
  });

  it('renders the hero title, era tagline, and pitch copy', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Colonize' })).toBeInTheDocument();
    expect(screen.getByText(/NW 2191/)).toBeInTheDocument();
    expect(screen.getByText(/Hic sunt dracones/i)).toBeInTheDocument();
    expect(screen.getByText(/drowned world/i)).toBeInTheDocument();
  });

  it('renders a trailer placeholder until the video lands', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('landing-trailer')).toBeInTheDocument();
    expect(screen.getByTestId('landing-trailer-placeholder')).toBeInTheDocument();
  });

  it('renders four screenshot carousel slides', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('landing-screenshot-map')).toBeInTheDocument();
    expect(screen.getByTestId('landing-screenshot-colony')).toBeInTheDocument();
    expect(screen.getByTestId('landing-screenshot-council')).toBeInTheDocument();
    expect(screen.getByTestId('landing-screenshot-combat')).toBeInTheDocument();
  });

  it('renders web + iOS + Android store badges', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('landing-badge-web')).toBeInTheDocument();
    expect(screen.getByTestId('landing-badge-ios')).toBeInTheDocument();
    expect(screen.getByTestId('landing-badge-android')).toBeInTheDocument();
  });

  it('navigates to /play when the primary CTA is clicked', () => {
    render(<LandingPage />);
    expect(routeFromPath(window.location.pathname)).toBe('landing');
    fireEvent.click(screen.getByTestId('landing-cta-play'));
    expect(window.location.pathname).toBe('/play');
    expect(routeFromPath(window.location.pathname)).toBe('play');
  });

  it('renders privacy + terms footer links and routes them correctly', () => {
    render(<LandingPage />);
    const privacyLink = screen.getByTestId('landing-link-privacy');
    const termsLink = screen.getByTestId('landing-link-terms');
    expect(privacyLink).toHaveAttribute('href', '/privacy');
    expect(termsLink).toHaveAttribute('href', '/terms');

    fireEvent.click(privacyLink);
    expect(window.location.pathname).toBe('/privacy');
    expect(routeFromPath(window.location.pathname)).toBe('privacy');

    window.history.replaceState({}, '', '/');
    fireEvent.click(termsLink);
    expect(window.location.pathname).toBe('/terms');
    expect(routeFromPath(window.location.pathname)).toBe('terms');
  });
});
