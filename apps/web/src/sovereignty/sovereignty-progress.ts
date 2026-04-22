// Pure sibling for the Sovereignty War UI surfaces (TASK-071). Lives
// without any React/Phaser in its import closure so the store and
// component tests can call the math directly. Keeps the progress
// arithmetic + milestone-detection in one place so a drift between the
// HUD bar, the red-tint gate, and the beat-fire action is impossible.

import type { ConcordFleetCampaignJSON } from '@colonize/core';

// The four narrative milestones the task description names. Values are
// percentages (not fractions) so the exhaustive `switch` on the beat
// modal reads naturally; the fraction form is computed on demand.
export type SovereigntyMilestone = 25 | 50 | 75 | 100;

export const SOVEREIGNTY_MILESTONES: readonly SovereigntyMilestone[] = [25, 50, 75, 100];

export interface SovereigntyBeatEntry {
  readonly milestone: SovereigntyMilestone;
  readonly title: string;
  readonly flavour: string;
}

// Beat copy tuned to the OTK salt-and-rum register with Concord
// menace. Not faction-specific (the Concord is the same hostile
// authority for every playable faction); a later content task can
// layer per-faction overrides the same way RumourRevealModal reads
// OTK-specific flavour from `@colonize/content`.
const BEAT_COPY: Readonly<Record<SovereigntyMilestone, SovereigntyBeatEntry>> = {
  25: {
    milestone: 25,
    title: 'First Sighting',
    flavour:
      'The Concord topsails crest the horizon. Their heralds demand surrender; our answer is the Kraken flag, hoisted high.',
  },
  50: {
    milestone: 50,
    title: 'The Squall Breaks',
    flavour:
      'Half the watch gone, half the watch yet to stand. The Concord press closer — but every reef knows our name, and the tide is ours tonight.',
  },
  75: {
    milestone: 75,
    title: 'Final Push',
    flavour:
      'Their banners tatter. Their hulls list. Hold the line one storm longer and the sea itself will finish what we started.',
  },
  100: {
    milestone: 100,
    title: 'Sovereignty Secured',
    flavour:
      'The Concord break formation and withdraw beneath a sky of burning canvas. Where the tithe-officers stood, only salt remains. We are free.',
  },
};

export function getSovereigntyBeat(milestone: SovereigntyMilestone): SovereigntyBeatEntry {
  return BEAT_COPY[milestone];
}

// Progress as a fraction in [0, 1]. Clamped so a save-file with a
// stale `turnsElapsed` greater than `turnsRequired` (possible after a
// balance tweak trims a campaign length) still paints a full bar
// instead of overflowing.
export function sovereigntyProgressFraction(campaign: ConcordFleetCampaignJSON): number {
  if (campaign.turnsRequired <= 0) return 0;
  const raw = campaign.turnsElapsed / campaign.turnsRequired;
  if (raw <= 0) return 0;
  if (raw >= 1) return 1;
  return raw;
}

// Returns the highest milestone whose threshold has been crossed by
// moving turnsElapsed from `prev` to `next` (exclusive-of-prev,
// inclusive-of-next). Returns null if no new milestone was crossed.
// A single tick can cross several thresholds when `turnsRequired` is
// small (Pacified tier is 12 turns → a jump from 2 to 7 crosses both
// 25% and 50%); we surface only the highest so the modal does not
// thrash the player with back-to-back dismiss clicks. The lower beats
// are considered implicit and the player sees the higher one.
export function sovereigntyMilestoneCrossed(
  prevElapsed: number,
  nextElapsed: number,
  turnsRequired: number,
): SovereigntyMilestone | null {
  if (turnsRequired <= 0) return null;
  if (nextElapsed <= prevElapsed) return null;
  let best: SovereigntyMilestone | null = null;
  for (const m of SOVEREIGNTY_MILESTONES) {
    const threshold = (m / 100) * turnsRequired;
    if (prevElapsed < threshold && nextElapsed >= threshold) {
      best = m;
    }
  }
  return best;
}
