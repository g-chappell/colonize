import { describe, it, expect } from 'vitest';
import { describeFactionBonuses } from './faction-bonus-text';

describe('describeFactionBonuses', () => {
  it('enumerates OTK bonuses (Red Tide + Legendary blueprints)', () => {
    const lines = describeFactionBonuses('otk');
    expect(lines).toEqual([
      'Safe passage through Red Tide tiles.',
      'Can redeem Legendary Ship blueprints.',
    ]);
  });

  it('enumerates Ironclad bonuses with signed percentages', () => {
    const lines = describeFactionBonuses('ironclad');
    expect(lines).toEqual(['+10% colony production.', '−20% shipyard cost.']);
  });

  it('enumerates Phantom bonuses (stealth + raid loot)', () => {
    const lines = describeFactionBonuses('phantom');
    expect(lines).toEqual(['Stealth on open-ocean tiles.', '+50% raid loot.']);
  });

  it('enumerates Bloodborne bonuses (damage + free soldier)', () => {
    const lines = describeFactionBonuses('bloodborne');
    expect(lines).toEqual(['+15% combat damage.', 'One free soldier per colony each turn.']);
  });

  it('returns at least two lines for every playable faction', () => {
    for (const id of ['otk', 'ironclad', 'phantom', 'bloodborne'] as const) {
      expect(describeFactionBonuses(id).length).toBeGreaterThanOrEqual(2);
    }
  });
});
