// Side-tagged audit-trail entries emitted during combat resolution. Same payload
// is consumed by the cinematic UI (TASK-054) and by deterministic replay tests
// — both reconstruct intermediate state from the event stream rather than
// re-running combat math themselves.

export type CombatSide = 'attacker' | 'defender';

export type CombatEvent =
  | {
      readonly kind: 'broadside-volley';
      readonly firer: CombatSide;
      readonly damage: number;
      readonly targetHullAfter: number;
    }
  | {
      readonly kind: 'boarding-round';
      readonly attackerCasualties: number;
      readonly defenderCasualties: number;
      readonly attackerCrewAfter: number;
      readonly defenderCrewAfter: number;
    }
  | {
      readonly kind: 'ram-impact';
      readonly attackerHullDamage: number;
      readonly defenderHullDamage: number;
      readonly attackerHullAfter: number;
      readonly defenderHullAfter: number;
    }
  | {
      readonly kind: 'flee-attempt';
      readonly success: boolean;
      readonly pursuerVolleyDamage: number;
      readonly fleerHullAfter: number;
    };
