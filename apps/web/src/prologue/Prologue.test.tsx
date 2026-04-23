import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SPARROW_DIARY } from '@colonize/content';
import { Prologue } from './Prologue';
import { useGameStore } from '../store/game';

describe('Prologue', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().setScreen('prologue');
  });

  it('renders the first diary entry with dateline on mount', () => {
    render(<Prologue />);
    const entry = screen.getByTestId('prologue-entry');
    expect(entry).toBeInTheDocument();
    expect(entry).toHaveAttribute('data-entry-id', SPARROW_DIARY[0]?.id ?? '');
    expect(screen.getByTestId('prologue-counter')).toHaveTextContent(
      `Page 1 of ${SPARROW_DIARY.length + 1}`,
    );
  });

  it('disables the Previous button on the first page', () => {
    render(<Prologue />);
    expect(screen.getByTestId('prologue-prev')).toBeDisabled();
  });

  it('advances a page when Next is clicked', () => {
    render(<Prologue />);
    fireEvent.click(screen.getByTestId('prologue-next'));
    expect(screen.getByTestId('prologue-entry')).toHaveAttribute(
      'data-entry-id',
      SPARROW_DIARY[1]?.id ?? '',
    );
    expect(screen.getByTestId('prologue-counter')).toHaveTextContent('Page 2');
  });

  it('goes back a page when Previous is clicked', () => {
    render(<Prologue />);
    fireEvent.click(screen.getByTestId('prologue-next'));
    fireEvent.click(screen.getByTestId('prologue-next'));
    fireEvent.click(screen.getByTestId('prologue-prev'));
    expect(screen.getByTestId('prologue-entry')).toHaveAttribute(
      'data-entry-id',
      SPARROW_DIARY[1]?.id ?? '',
    );
  });

  it("swaps Next for Begin on the captain's epilogue page", () => {
    render(<Prologue />);
    // Walk to the final page (16 diary Nexts → epilogue).
    for (let i = 0; i < SPARROW_DIARY.length; i += 1) {
      fireEvent.click(screen.getByTestId('prologue-next'));
    }
    expect(screen.getByTestId('prologue-epilogue')).toBeInTheDocument();
    expect(screen.queryByTestId('prologue-next')).not.toBeInTheDocument();
    expect(screen.getByTestId('prologue-begin')).toBeInTheDocument();
    expect(screen.getByTestId('prologue-counter')).toHaveTextContent(
      `Page ${SPARROW_DIARY.length + 1} of ${SPARROW_DIARY.length + 1}`,
    );
  });

  it('Begin routes to faction-select', () => {
    render(<Prologue />);
    for (let i = 0; i < SPARROW_DIARY.length; i += 1) {
      fireEvent.click(screen.getByTestId('prologue-next'));
    }
    fireEvent.click(screen.getByTestId('prologue-begin'));
    expect(useGameStore.getState().screen).toBe('faction-select');
  });

  it('Skip routes to faction-select from any page', () => {
    render(<Prologue />);
    fireEvent.click(screen.getByTestId('prologue-next'));
    fireEvent.click(screen.getByTestId('prologue-next'));
    fireEvent.click(screen.getByTestId('prologue-skip'));
    expect(useGameStore.getState().screen).toBe('faction-select');
  });

  it('mounts a looping subtle-BGM audio element pointing at the menu stem', () => {
    render(<Prologue />);
    const audio = screen.getByTestId('prologue-audio') as HTMLAudioElement;
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute('loop');
    expect(audio.getAttribute('src') ?? '').toMatch(/bgm-menu\.wav$/);
  });
});
