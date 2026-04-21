# Review Log

Self-improvement review entries. Written by `autonomous-review` every N
consecutive successes. Separate from `AGENT-LOG.md` so the run log stays
gap-free.

## Format

```
---

## Review [YYYY-MM-DD HH:MM] — after TASK-XXX through TASK-YYY
- Success streak: N
- Patterns identified: <bulleted list>
- Proposals written to: .claude/approvals/PENDING.md
- Proposals count: N (before de-dup: M)
- De-duplicated via: CLAUDE.md + approvals/history.md
- Status: pending-approval | approved | rejected | mixed
- Approved at: <ISO timestamp or n/a>
```

---

## Review History

---

## Review [2026-04-20 20:15] — after TASK-001 through TASK-005
- Success streak: 5
- Patterns identified: 4
- Proposals drafted: 4
- Proposals de-duplicated: 4 - 1 (1 dropped — the npm-install-after-workspace lesson was folded into the cross-workspace import refinement rather than landed as its own commit)
- Refinements committed: 2
- Refinements deferred: 1 (autonomous-run Step 3 cleanup fix — blocked on a pending write-permission prompt for `.claude/skills/autonomous-run/SKILL.md`; will retry next cycle)
- PR: https://github.com/g-chappell/colonize/pull/8
- Outcome: opened
- Files touched: CLAUDE.md (Tier 3 — Architecture notes + new "Scaffolding hygiene" section)

---

## Review [2026-04-21T00:37Z] — after TASK-006 through TASK-010
- Success streak: 5
- Patterns identified: 4
- Proposals drafted: 4
- Proposals de-duplicated: 4 (all novel vs CLAUDE.md + approvals/history.md + last 5 review PRs, Jaro-Winkler threshold 0.85)
- Refinements committed: 4
- PR: https://github.com/g-chappell/colonize/pull/17
- Outcome: opened
- Files touched: CLAUDE.md (Tier 3 — Testing patterns + Architecture notes), .claude/skills/autonomous-run/SKILL.md (Steps 8, 10, 12)
- Refinements:
  1. dae9f62 — codify jsdom guard for browser-only libraries (Phaser/canvas → dynamic import + getContext stub)
  2. 1caef8a — codify asset-pipeline source/packed/served triad
  3. 5827d01 — defer AGENT-LOG push to main until feature PR merges (fixes feature-PR BEHIND race — PR #9 covered only the review-PR variant)
  4. 849db43 — prettier --write edited files before local validation (TASK-006/007/010 recurrence)
