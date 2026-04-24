// Pure-sibling module for Codex viewer logic. Lets us test the
// filtering + grouping without mounting React.

import { CODEX_CATEGORIES, type CodexCategory, type CodexEntry } from '@colonize/content';

export interface CodexGroup {
  readonly category: CodexCategory;
  readonly entries: readonly CodexEntry[];
}

// Returns the subset of `entries` whose ids appear in `unlockedIds`,
// grouped by category in the fixed `CODEX_CATEGORIES` order. A category
// with zero unlocked entries is still emitted as an empty group so the
// viewer can render the section heading plus a "no entries yet" hint —
// callers that want non-empty groups only can filter downstream.
export function groupUnlockedCodexEntries(
  entries: readonly CodexEntry[],
  unlockedIds: readonly string[],
): readonly CodexGroup[] {
  const unlocked = new Set(unlockedIds);
  const visible = entries.filter((entry) => unlocked.has(entry.id));
  return CODEX_CATEGORIES.map((category) => ({
    category,
    entries: visible.filter((entry) => entry.category === category),
  }));
}

// Total unlocked count across every category — for the drawer header
// ("12 entries") without forcing the caller to re-sum the groups.
export function countUnlockedEntries(
  entries: readonly CodexEntry[],
  unlockedIds: readonly string[],
): number {
  const unlocked = new Set(unlockedIds);
  let n = 0;
  for (const entry of entries) if (unlocked.has(entry.id)) n += 1;
  return n;
}
