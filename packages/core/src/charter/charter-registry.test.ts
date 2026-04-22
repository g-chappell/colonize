import { describe, it, expect } from 'vitest';
import {
  ALL_ARCHIVE_CHARTER_IDS,
  ALL_CHARTER_BONUS_AXES,
  ARCHIVE_CHARTERS,
  ArchiveCharterId,
  CharterBonusAxis,
  aggregateCharterEffects,
  getArchiveCharter,
  isArchiveCharterId,
  isCharterBonusAxis,
} from './charter-registry.js';

describe('ArchiveCharter registry', () => {
  it('ships exactly twenty charters', () => {
    expect(ARCHIVE_CHARTERS).toHaveLength(20);
    expect(ALL_ARCHIVE_CHARTER_IDS).toHaveLength(20);
  });

  it('has unique ids', () => {
    const ids = new Set(ALL_ARCHIVE_CHARTER_IDS);
    expect(ids.size).toBe(ALL_ARCHIVE_CHARTER_IDS.length);
  });

  it('every charter id is kebab-case and narrows via isArchiveCharterId', () => {
    for (const id of ALL_ARCHIVE_CHARTER_IDS) {
      expect(id).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$/);
      expect(isArchiveCharterId(id)).toBe(true);
    }
  });

  it('isArchiveCharterId rejects unknown strings and non-strings', () => {
    expect(isArchiveCharterId('not-a-charter')).toBe(false);
    expect(isArchiveCharterId(123)).toBe(false);
    expect(isArchiveCharterId(null)).toBe(false);
    expect(isArchiveCharterId(undefined)).toBe(false);
  });

  it('every charter has a valid axis + finite positive delta', () => {
    for (const charter of ARCHIVE_CHARTERS) {
      expect(isCharterBonusAxis(charter.effect.axis)).toBe(true);
      expect(Number.isFinite(charter.effect.delta)).toBe(true);
      expect(charter.effect.delta).toBeGreaterThan(0);
    }
  });

  it('covers every bonus axis at least once (no orphan axis)', () => {
    const axes = new Set(ARCHIVE_CHARTERS.map((c) => c.effect.axis));
    for (const axis of ALL_CHARTER_BONUS_AXES) {
      expect(axes.has(axis)).toBe(true);
    }
  });

  it('exposes each named charter from the task description', () => {
    const pirata = getArchiveCharter(ArchiveCharterId.PirataCodexFragment);
    expect(pirata.effect.axis).toBe(CharterBonusAxis.CombatMorale);
    const bloodline = getArchiveCharter(ArchiveCharterId.BloodlineWrit);
    expect(bloodline.effect.axis).toBe(CharterBonusAxis.RecruitmentSpeed);
  });

  it('getArchiveCharter throws on an invalid id', () => {
    expect(() => getArchiveCharter('ghost-charter' as ArchiveCharterId)).toThrow(TypeError);
  });
});

// Mirror of packages/content/src/charters.test.ts. Core and content
// cannot import each other; this test + its content-side sibling
// jointly pin the canonical 20-charter id list.
const CANONICAL_CHARTER_IDS: readonly string[] = [
  'pirata-codex-fragment',
  'blade-oath-parchment',
  'bloodline-writ',
  'press-gang-commission',
  'tidekeepers-ledger',
  'forge-master-accord',
  'shipwright-guild-charter',
  'sawmill-syndicate-pact',
  'corsair-marque',
  'plunder-share-writ',
  'free-port-compact',
  'cartographers-bond',
  'lighthouse-keepers-oath',
  'astral-sextant-warrant',
  'kraken-wind-blessing',
  'careened-hull-pact',
  'envoys-seal',
  'tribunal-charter',
  'archivists-oath',
  'kelp-witch-pact',
];

describe('Archive Charter drift guard (core side)', () => {
  it('matches the canonical MVP id list', () => {
    expect(ALL_ARCHIVE_CHARTER_IDS).toEqual(CANONICAL_CHARTER_IDS);
  });
});

describe('aggregateCharterEffects', () => {
  it('starts every axis at zero when no charters are passed', () => {
    const totals = aggregateCharterEffects([]);
    for (const axis of ALL_CHARTER_BONUS_AXES) {
      expect(totals[axis]).toBe(0);
    }
  });

  it('sums two charters on the same axis', () => {
    const totals = aggregateCharterEffects([
      ArchiveCharterId.PirataCodexFragment,
      ArchiveCharterId.BladeOathParchment,
    ]);
    expect(totals[CharterBonusAxis.CombatMorale]).toBeCloseTo(13, 10);
  });

  it('accumulates across different axes independently', () => {
    const totals = aggregateCharterEffects([
      ArchiveCharterId.PirataCodexFragment,
      ArchiveCharterId.BloodlineWrit,
      ArchiveCharterId.FreePortCompact,
    ]);
    expect(totals[CharterBonusAxis.CombatMorale]).toBeCloseTo(5, 10);
    expect(totals[CharterBonusAxis.RecruitmentSpeed]).toBeCloseTo(10, 10);
    expect(totals[CharterBonusAxis.TradeMargin]).toBeCloseTo(0.05, 10);
  });

  it('skips ids that are not valid charters (defence-in-depth)', () => {
    const totals = aggregateCharterEffects([
      ArchiveCharterId.PirataCodexFragment,
      'ghost-charter' as ArchiveCharterId,
    ]);
    expect(totals[CharterBonusAxis.CombatMorale]).toBe(5);
  });
});
