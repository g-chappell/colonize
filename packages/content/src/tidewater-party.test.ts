import { describe, it, expect } from 'vitest';
import {
  TIDEWATER_PARTY_DUMP_QTY,
  TIDEWATER_PARTY_FLAVOUR,
  TIDEWATER_PARTY_FREEZE_TURNS,
  TIDEWATER_PARTY_IRE_PENALTY,
  getTidewaterPartyFlavour,
} from './tidewater-party.js';

describe('Tidewater Party balance defaults', () => {
  it('exposes positive-integer dump qty, freeze window, and ire penalty', () => {
    for (const n of [
      TIDEWATER_PARTY_DUMP_QTY,
      TIDEWATER_PARTY_FREEZE_TURNS,
      TIDEWATER_PARTY_IRE_PENALTY,
    ]) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
    }
  });
});

describe('Tidewater Party flavour', () => {
  it('uses the salt-and-rum register and names Barataria Bay in the heading', () => {
    const flavour = getTidewaterPartyFlavour();
    expect(flavour).toBe(TIDEWATER_PARTY_FLAVOUR);
    expect(flavour.register).toBe('salt-and-rum');
    expect(flavour.heading).toMatch(/barataria/i);
  });

  it('carries the required copy slots for the modal', () => {
    const flavour = getTidewaterPartyFlavour();
    expect(flavour.heading.length).toBeGreaterThan(0);
    expect(flavour.dateline.length).toBeGreaterThan(0);
    expect(flavour.summary.length).toBeGreaterThan(0);
    expect(flavour.chooseGoodLabel.length).toBeGreaterThan(0);
    expect(flavour.confirmLabel.length).toBeGreaterThan(0);
    expect(flavour.cancelLabel.length).toBeGreaterThan(0);
    expect(flavour.consequenceSummary.length).toBeGreaterThan(0);
  });
});
