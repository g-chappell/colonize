import type { CombatEvent, CombatOutcome, CombatResult, CombatSide } from '@colonize/core';

// Per-event-kind playback duration in milliseconds. Tight values to keep
// the cinematic short — at typical combat lengths (1-3 events for
// broadside, up to 8 for boarding) total runtime stays under ~5s.
const BEAT_DURATION_MS: Record<CombatEvent['kind'], number> = {
  'broadside-volley': 800,
  'boarding-round': 600,
  'ram-impact': 1000,
  'flee-attempt': 700,
};

const BEAT_GAP_MS = 200;

export interface CombatBeat {
  readonly index: number;
  readonly event: CombatEvent;
  readonly startMs: number;
  readonly durationMs: number;
  readonly description: string;
  // Which side is the visual focus during this beat — drives the
  // sprite-flash/recoil cue in the overlay. `null` for symmetric beats
  // (boarding-round, ram-impact) where both sides act simultaneously.
  readonly focus: CombatSide | null;
}

export function buildCombatTimeline(outcome: CombatOutcome): readonly CombatBeat[] {
  const beats: CombatBeat[] = [];
  let cursor = 0;
  for (const [index, event] of outcome.events.entries()) {
    const duration = BEAT_DURATION_MS[event.kind];
    beats.push({
      index,
      event,
      startMs: cursor,
      durationMs: duration,
      description: describeEvent(event),
      focus: focusOf(event),
    });
    cursor += duration + BEAT_GAP_MS;
  }
  return beats;
}

export function cinematicDurationMs(beats: readonly CombatBeat[]): number {
  if (beats.length === 0) return 0;
  const last = beats[beats.length - 1]!;
  return last.startMs + last.durationMs;
}

// Returns the beat that should be visually active at `elapsedMs`.
// During the gap between beats the previous beat remains the focus
// (rather than briefly returning null) so the overlay doesn't flash
// blank. Returns null only before the first beat or after the last.
export function activeBeat(beats: readonly CombatBeat[], elapsedMs: number): CombatBeat | null {
  if (beats.length === 0 || elapsedMs < 0) return null;
  let last: CombatBeat | null = null;
  for (const beat of beats) {
    if (beat.startMs > elapsedMs) break;
    last = beat;
  }
  return last;
}

// All beats whose start time has passed `elapsedMs` — used by the log
// panel to accumulate entries as the cinematic plays. Includes the
// currently-active beat.
export function revealedBeats(
  beats: readonly CombatBeat[],
  elapsedMs: number,
): readonly CombatBeat[] {
  if (beats.length === 0 || elapsedMs < 0) return [];
  const out: CombatBeat[] = [];
  for (const beat of beats) {
    if (beat.startMs > elapsedMs) break;
    out.push(beat);
  }
  return out;
}

export function describeResult(result: CombatResult): string {
  switch (result) {
    case 'attacker-sunk':
      return 'Attacker sunk.';
    case 'defender-sunk':
      return 'Defender sunk.';
    case 'attacker-captured':
      return 'Attacker boarded and captured.';
    case 'defender-captured':
      return 'Defender boarded and captured.';
    case 'attacker-fled':
      return 'Attacker broke away.';
    case 'mutual-sunk':
      return 'Both ships destroyed.';
    case 'inconclusive':
      return 'Engagement inconclusive — combatants disengage.';
  }
}

function focusOf(event: CombatEvent): CombatSide | null {
  switch (event.kind) {
    case 'broadside-volley':
      return event.firer;
    case 'flee-attempt':
      return 'attacker';
    case 'boarding-round':
    case 'ram-impact':
      return null;
  }
}

function describeEvent(event: CombatEvent): string {
  switch (event.kind) {
    case 'broadside-volley': {
      const who = event.firer === 'attacker' ? 'Attacker broadside' : 'Defender returns fire';
      const target = event.firer === 'attacker' ? 'defender' : 'attacker';
      return `${who} — ${event.damage} damage (${target} hull: ${event.targetHullAfter})`;
    }
    case 'boarding-round':
      return `Boarding melee — attacker -${event.attackerCasualties} crew (${event.attackerCrewAfter}), defender -${event.defenderCasualties} crew (${event.defenderCrewAfter})`;
    case 'ram-impact':
      return `Ram impact — attacker -${event.attackerHullDamage} hull (${event.attackerHullAfter}), defender -${event.defenderHullDamage} hull (${event.defenderHullAfter})`;
    case 'flee-attempt':
      if (event.success) {
        return `Attacker flees — parting shot ${event.pursuerVolleyDamage} damage (attacker hull: ${event.fleerHullAfter})`;
      }
      return `Attacker fails to flee — pursuer's volley ${event.pursuerVolleyDamage} damage (attacker hull: ${event.fleerHullAfter})`;
  }
}
