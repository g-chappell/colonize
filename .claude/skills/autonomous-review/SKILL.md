---
name: autonomous-review
description: Draft and auto-merge repo-wide refinements after N consecutive successful runs. Reads AGENT-LOG, produces CLAUDE.md / script / skill / workflow / roadmap edits on a dedicated PR branch, enables auto-merge. No PENDING.md, no human approval gate — the PR itself is the audit trail. Do NOT invoke directly — called by /autonomous-run Step 10.
---

# /autonomous-review

Self-improvement pass. Runs after the success streak hits
`project.json.successThreshold`. Drafts and **directly commits** refinements
anywhere in the repo (except CLAUDE.md Tier 1) on a branch, opens a PR,
enables auto-merge. The PR history IS the approval record — no filesystem
gates, no paused cron, no waiting for a human.

## When called

- Success streak ≥ `project.json.successThreshold` (default 5)
- No REVIEW-LOG entry exists within the last `successThreshold` AGENT-LOG entries (prevents loops)
- No open PR on `auto/review-*` (one review in flight at a time)

## Scope of refinements

**Fair game** — any file in the repo the agent judges worth changing to
codify a lesson learned:

- CLAUDE.md (Tier 2 project conventions; Tier 3 tech-coupled rules)
- `.claude/skills/*.md` — refine skill prose/steps
- `scripts/*` — fix or improve deploy, healthcheck, run-workspaces, etc.
- `.github/workflows/*.yml` — tune CI
- `roadmap/roadmap.yml` — add follow-up tasks, adjust priorities, split tasks (validator must still pass)
- `docker/*` — tune Dockerfile, compose, nginx config copy
- Tooling configs — eslint, prettier, tsconfig.base, etc.

**Forbidden** (validator enforces):

1. Any line between the `<!-- Tier 1 — UNIVERSAL RULES -->` and the next `<!-- ===... Tier 2 -->` markers in `CLAUDE.md`. Read both markers, diff must not touch any line in that range.
2. `.claude/.setup-progress` (it's runtime state, not source).
3. `.env*` (secrets).
4. `.claude/approvals/history.md` — only written via the normal merge flow, never as part of a self-improvement diff.

## Steps

### 1. Gather input

- Last N AGENT-LOG entries (N = `successThreshold`)
- Full current `CLAUDE.md`
- `.claude/approvals/history.md` (prior proposal record)
- Last 5 review PRs via `gh pr list --search "in:title review: self-improvement" --state all --limit 5 --json title,body,mergedAt`
- Relevant skill / script / workflow files for any candidate edits

### 2. Identify patterns

Look across the N AGENT-LOG entries for:
- Lessons mentioned in ≥ 2 entries
- Gotchas that cost time to diagnose ("trace before patch" style)
- Brittleness of existing scripts / skills exposed by recent runs
- Repeated CI-fix patterns
- Roadmap assumptions invalidated by implementation reality (e.g. "task description X was impossible because Y; split into X' + Y'")

Avoid:
- Task-specific implementation details
- One-off fixes already captured in the PR that fixed them
- Anything about currently in-flight work

### 3. Draft edits

For each pattern, produce a concrete edit to a specific file. Keep edits
atomic — one lesson per commit on the branch, so if one edit is bad you
can revert just that commit via `git revert`.

### 4. De-duplicate

Load `.claude/skills/autonomous-review/lib/similarity.mjs`:

```javascript
import { alreadyCovered } from './lib/similarity.mjs';
```

For each candidate edit, build reference pool = {current file content} ∪
{last 5 merged review PRs' diffs} ∪ {`approvals/history.md`}.

```javascript
if (alreadyCovered(proposalText, references, 0.85)) {
  // skip — this lesson is already codified somewhere
}
```

No rate limit: if N non-duplicate patterns exist, make N commits.

### 5. Tier-1 validator

Before staging each edit to `CLAUDE.md`:

```bash
# Find Tier-1 block line range
start=$(grep -n '<!-- Tier 1' CLAUDE.md | head -1 | cut -d: -f1)
end=$(grep -n '<!-- Tier 2' CLAUDE.md | head -1 | cut -d: -f1)
```

If the diff touches any line in `[start, end)`, abort the entire review
cycle. Write a `REVIEW-LOG.md` entry with `outcome: aborted, reason:
tier_1_violation` and stop. Do not fall back to "edit Tier 2 instead".

### 6. Branch, commit, PR

```bash
date_slug=$(date -u +%Y-%m-%d)
branch="auto/review-${date_slug}"
git checkout -b "$branch" main
```

Apply each edit as a separate commit with a message like:

```
review: <one-line summary of the lesson>

Why: <the AGENT-LOG pattern that motivated this>
Evidence: AGENT-LOG run [TASK-XXX], run [TASK-YYY]
Scope: <file path>
```

Then open PR:

```bash
gh pr create \
  --title "review: self-improvement refinements (${N_REFINEMENTS})" \
  --body "$(cat <<EOF
## Summary
Self-improvement cycle after ${successThreshold} successful runs.

## Refinements

<bulleted list, one bullet per commit on this branch>

## Evidence
<list the AGENT-LOG run dates + task IDs that motivated each refinement>

## Review notes
Review PR auto-generated. CI must pass before auto-merge. To block a
specific refinement: \`gh pr close <this-pr>\` (all refinements revert),
or to keep the good ones and drop bad ones, cherry-pick from the branch.
Post-merge, a bad refinement can be reverted individually with
\`git revert <sha-of-that-commit>\`.

Generated by /autonomous-review.
EOF
)"

gh pr merge <num> --auto --squash --delete-branch
```

### 7. Log to REVIEW-LOG

Append to `REVIEW-LOG.md`:

```markdown
---

## Review [ISO timestamp] — after TASK-XXX through TASK-YYY
- Success streak: N
- Patterns identified: K
- Proposals drafted: J
- Proposals de-duplicated: J - M (M survived)
- Refinements committed: M
- PR: https://github.com/.../pull/N
- Outcome: opened | aborted-tier1-violation | skipped-no-patterns
- Files touched: file1, file2, ...
```

### 8. Flag the AGENT-LOG entry

AGENT-LOG entry for the triggering run sets `review_proposed: true` —
that happens in `/autonomous-run` Step 10 after this skill returns.

### 9. Notify

Call `PushNotification` once from the calling `/autonomous-run` context
(this skill doesn't call it directly; it returns a structured result
that Step 10's notification formatter includes).

Return value shape:
```
{
  outcome: "opened" | "aborted" | "skipped-no-patterns",
  pr_number: <number or null>,
  refinement_count: <number>,
  files_touched: [...]
}
```

## What this skill does NOT do

- Write `.claude/approvals/PENDING.md` (retired)
- Pause the scheduled task (the timer keeps firing; if the PR doesn't land cleanly, CI rejects it or the user reverts)
- Touch files listed under "Forbidden" (section above)
- Make multiple PRs in one cycle (one PR per review; if more refinements emerge next cycle, a new PR opens)

## Recovery from a bad refinement

If a refinement lands and turns out wrong:

```bash
# option A — revert just the bad commit (the squash-merge preserves history)
git log --oneline --all | grep review:
git revert <sha>
git push

# option B — revert the whole review PR
gh pr list --state merged --search "review:" --limit 1  # find PR number
gh pr revert <number>                                    # opens a revert PR
```

No human gate; no special tooling; standard git.
