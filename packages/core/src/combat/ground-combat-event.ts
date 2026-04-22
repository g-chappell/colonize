// Side-tagged audit-trail entries emitted during ground-combat resolution.
// Parallels the naval CombatEvent union (combat-event.ts); the cinematic UI
// and deterministic replay tests consume this stream rather than re-running
// the math.

import type { CombatSide } from './combat-event.js';

export type GroundCombatEvent =
  | {
      readonly kind: 'ground-volley';
      readonly firer: CombatSide;
      readonly damage: number;
      readonly targetHpAfter: number;
    }
  | {
      readonly kind: 'ground-flee-attempt';
      readonly success: boolean;
      readonly pursuerVolleyDamage: number;
      readonly fleerHpAfter: number;
    };
