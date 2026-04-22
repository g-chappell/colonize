import { describe, it, expect } from 'vitest';

import {
  canDeclareSovereignty,
  DEFAULT_SOVEREIGNTY_TRIGGER_THRESHOLDS,
  sovereigntyTriggerStatus,
  type SovereigntyTriggerInputs,
  type SovereigntyTriggerThresholds,
} from './sovereignty-trigger.js';

const DEFAULTS = DEFAULT_SOVEREIGNTY_TRIGGER_THRESHOLDS;

function inputs(partial: Partial<SovereigntyTriggerInputs> = {}): SovereigntyTriggerInputs {
  return {
    gameYear: DEFAULTS.minimumYear,
    tension: 0,
    charterCount: 0,
    ...partial,
  };
}

describe('sovereigntyTriggerStatus — year gate', () => {
  it('reports locked-year below the minimum year, regardless of pressure', () => {
    expect(
      sovereigntyTriggerStatus(
        inputs({ gameYear: DEFAULTS.minimumYear - 1, tension: 1000, charterCount: 1000 }),
      ),
    ).toBe('locked-year');
  });

  it('reports pending-pressure at the minimum year with no pressure', () => {
    expect(sovereigntyTriggerStatus(inputs())).toBe('pending-pressure');
  });
});

describe('sovereigntyTriggerStatus — pressure clauses', () => {
  it('arms when tension meets the tension threshold', () => {
    expect(sovereigntyTriggerStatus(inputs({ tension: DEFAULTS.tensionThreshold }))).toBe('armed');
  });

  it('arms when tension exceeds the tension threshold', () => {
    expect(sovereigntyTriggerStatus(inputs({ tension: DEFAULTS.tensionThreshold + 50 }))).toBe(
      'armed',
    );
  });

  it('arms when charter count meets the charter threshold', () => {
    expect(sovereigntyTriggerStatus(inputs({ charterCount: DEFAULTS.charterThreshold }))).toBe(
      'armed',
    );
  });

  it('arms when both clauses are satisfied', () => {
    expect(
      sovereigntyTriggerStatus(
        inputs({ tension: DEFAULTS.tensionThreshold, charterCount: DEFAULTS.charterThreshold }),
      ),
    ).toBe('armed');
  });

  it('stays pending-pressure when tension is one below threshold and charters are short', () => {
    expect(
      sovereigntyTriggerStatus(
        inputs({
          tension: DEFAULTS.tensionThreshold - 1,
          charterCount: DEFAULTS.charterThreshold - 1,
        }),
      ),
    ).toBe('pending-pressure');
  });
});

describe('sovereigntyTriggerStatus — override thresholds', () => {
  it('uses the supplied threshold ladder instead of the defaults', () => {
    const tight: SovereigntyTriggerThresholds = {
      minimumYear: 3,
      tensionThreshold: 20,
      charterThreshold: 1,
    };
    expect(sovereigntyTriggerStatus({ gameYear: 3, tension: 0, charterCount: 1 }, tight)).toBe(
      'armed',
    );
    expect(sovereigntyTriggerStatus({ gameYear: 2, tension: 100, charterCount: 100 }, tight)).toBe(
      'locked-year',
    );
  });

  it('accepts a zero charter threshold — zero charters satisfies the clause', () => {
    const open: SovereigntyTriggerThresholds = {
      minimumYear: 0,
      tensionThreshold: 100,
      charterThreshold: 0,
    };
    expect(sovereigntyTriggerStatus({ gameYear: 0, tension: 0, charterCount: 0 }, open)).toBe(
      'armed',
    );
  });
});

describe('sovereigntyTriggerStatus — input validation', () => {
  it.each([
    ['gameYear non-integer', { gameYear: 1.5 }],
    ['gameYear NaN', { gameYear: Number.NaN }],
    ['gameYear infinite', { gameYear: Number.POSITIVE_INFINITY }],
  ])('rejects %s', (_label, bad) => {
    expect(() => sovereigntyTriggerStatus(inputs(bad))).toThrow(RangeError);
  });

  it.each([
    ['tension negative', { tension: -1 }],
    ['tension non-integer', { tension: 1.5 }],
    ['charterCount negative', { charterCount: -1 }],
    ['charterCount non-integer', { charterCount: 2.5 }],
  ])('rejects %s', (_label, bad) => {
    expect(() => sovereigntyTriggerStatus(inputs(bad))).toThrow(RangeError);
  });

  it.each([
    ['minimumYear non-integer', { minimumYear: 1.5 }],
    ['tensionThreshold negative', { tensionThreshold: -1 }],
    ['charterThreshold non-integer', { charterThreshold: 1.5 }],
  ])('rejects threshold %s', (_label, bad) => {
    const thresholds: SovereigntyTriggerThresholds = { ...DEFAULTS, ...bad };
    expect(() => sovereigntyTriggerStatus(inputs(), thresholds)).toThrow(RangeError);
  });
});

describe('canDeclareSovereignty', () => {
  it('returns true when status is armed', () => {
    expect(canDeclareSovereignty(inputs({ tension: DEFAULTS.tensionThreshold }))).toBe(true);
  });

  it('returns false for locked-year', () => {
    expect(
      canDeclareSovereignty(
        inputs({ gameYear: DEFAULTS.minimumYear - 1, tension: DEFAULTS.tensionThreshold }),
      ),
    ).toBe(false);
  });

  it('returns false for pending-pressure', () => {
    expect(canDeclareSovereignty(inputs())).toBe(false);
  });
});
