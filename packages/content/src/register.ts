// Tone-register infra — the three canonical OTK registers plus a guard
// for validating tag values on user-visible content entries.
//
// The register type itself is owned by `palette.ts` (where it was first
// needed to partition the retro palette). This module re-exports it as
// the canonical tagging surface and ships the runtime machinery the
// register-coverage lint rule needs: a readonly-array of the three
// values and a typed narrowing guard.
//
// Canon register tags are *authoritative*: every user-visible string
// collection documented in `VOICE.md` attaches one of these three
// values on every entry (or declares a module-wide register constant
// when the whole file pins to a single register). The lint rule in
// `register-coverage.test.ts` fails the build if a tagged registry
// adds an entry without a register or with a non-canonical value.

import type { ToneRegister } from './palette.js';

export type { ToneRegister } from './palette.js';

export const REGISTERS: readonly ToneRegister[] = ['salt-and-rum', 'eldritch', 'salvaged-futurism'];

export function isToneRegister(value: unknown): value is ToneRegister {
  return typeof value === 'string' && (REGISTERS as readonly string[]).includes(value);
}
