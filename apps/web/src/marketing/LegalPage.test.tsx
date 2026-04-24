import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrivacyPage } from './PrivacyPage';
import { TermsPage } from './TermsPage';
import { routeFromPath } from './path-route';

describe('PrivacyPage', () => {
  let originalPath: string;

  beforeEach(() => {
    originalPath = window.location.pathname;
    window.history.replaceState({}, '', '/privacy');
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalPath);
  });

  it('renders the privacy heading and sections', () => {
    render(<PrivacyPage />);
    expect(screen.getByTestId('privacy-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /what we collect/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /what we do not collect/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /your rights/i })).toBeInTheDocument();
  });

  it('navigates back to landing when the back link is clicked', () => {
    render(<PrivacyPage />);
    fireEvent.click(screen.getByTestId('privacy-back-link'));
    expect(window.location.pathname).toBe('/');
    expect(routeFromPath(window.location.pathname)).toBe('landing');
  });
});

describe('TermsPage', () => {
  let originalPath: string;

  beforeEach(() => {
    originalPath = window.location.pathname;
    window.history.replaceState({}, '', '/terms');
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalPath);
  });

  it('renders the terms heading and sections', () => {
    render(<TermsPage />);
    expect(screen.getByTestId('terms-page')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /terms of service/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /permitted use/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /prohibited use/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /warranty/i })).toBeInTheDocument();
  });

  it('navigates back to landing when the back link is clicked', () => {
    render(<TermsPage />);
    fireEvent.click(screen.getByTestId('terms-back-link'));
    expect(window.location.pathname).toBe('/');
    expect(routeFromPath(window.location.pathname)).toBe('landing');
  });
});
