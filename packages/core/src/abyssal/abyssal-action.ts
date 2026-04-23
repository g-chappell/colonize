// AbyssalAction — the per-tile interactions a faction can perform at an
// Abyssal site. Each action accumulates affinity toward exactly one
// stance. The action enum is consumed by `AbyssalStanceTracker.applyAction`
// and the orchestrator that iterates units / colonies near an Abyssal
// tile decides which action fires.
//
// Per CLAUDE.md: "Ship the entity's primitive; leave iteration /
// scheduling to the task that owns the collection." This module ships
// the action vocabulary + a single static affinity map. The task that
// later wires "which unit-on-which-tile triggers which action" is
// out-of-scope here — the Abyssal-tile sub-type itself is not yet a
// `TileType` member, and adding it would entangle this primitive with
// a save-format migration that another task should drive.

import { AbyssalStance } from './stance.js';

export const AbyssalAction = {
  Offering: 'offering',
  PassThrough: 'pass-through',
  Plunder: 'plunder',
  Patrol: 'patrol',
} as const;

export type AbyssalAction = (typeof AbyssalAction)[keyof typeof AbyssalAction];

export const ALL_ABYSSAL_ACTIONS: readonly AbyssalAction[] = [
  AbyssalAction.Offering,
  AbyssalAction.PassThrough,
  AbyssalAction.Plunder,
  AbyssalAction.Patrol,
];

export function isAbyssalAction(value: unknown): value is AbyssalAction {
  return typeof value === 'string' && (ALL_ABYSSAL_ACTIONS as readonly string[]).includes(value);
}

// Each action drives affinity toward a single stance. The mapping is
// 1:1 — Offering → Venerate, PassThrough → Tolerate, Plunder → Plunder,
// Patrol → Guard — so the action and stance vocabularies stay aligned
// without inventing a redundant axis.
export const ABYSSAL_ACTION_AFFINITY: Readonly<Record<AbyssalAction, AbyssalStance>> = {
  [AbyssalAction.Offering]: AbyssalStance.Venerate,
  [AbyssalAction.PassThrough]: AbyssalStance.Tolerate,
  [AbyssalAction.Plunder]: AbyssalStance.Plunder,
  [AbyssalAction.Patrol]: AbyssalStance.Guard,
};

export function abyssalActionAffinity(action: AbyssalAction): AbyssalStance {
  return ABYSSAL_ACTION_AFFINITY[action];
}
