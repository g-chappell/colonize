---
name: autonomous-run
description: THE scheduled entry point. Runs one autonomous dev cycle: sync main, recover any stuck CI, select next task, branch, implement, validate locally, open PR with auto-merge, log, notify via PushNotification. Every 12th-14th step handles optional VPS auto-deploy. Self-improvement reviews (every N successes) are PR-driven and do not pause execution.
user_invocable: true
---

# /autonomous-run

One cycle of the autonomous dev loop. Designed to be safe to re-run.

This is a **14-step** procedure. Steps 12–14 only fire when VPS auto-deploy
is configured (`project.json.deploy.autoDeployOnMerge: true`).

There is **no approval gate**. Self-improvement refinements are proposed
and auto-merged via PRs (see `/autonomous-review`); a bad refinement is
revertible via `git revert` or `gh pr close`. Nothing pauses the hourly
cadence short of `systemctl stop claude-colonize.timer`.

---

## Step 1 — LOAD CONFIG

Read `.claude/project.json`. Extract:
- `commands.{typecheck,test,lint,build,dev}`
- `workspaces[]`
- `branchPrefix`, `ghBin`, `successThreshold`
- `schedule`, `deploy`, `host`

All subsequent steps use these values — never hardcode paths.

## Step 2 — PRECHECKS

```bash
node roadmap/validate.mjs        # roadmap integrity
git fetch origin main --prune    # sync refs
git status --porcelain           # must be clean
```

If roadmap invalid, write AGENT-LOG `outcome: blocked, reason: roadmap_invalid`
and stop.

If working tree dirty, write `outcome: skipped, reason: dirty_tree` and stop.

## Step 3 — SYNC + CLEANUP

```bash
git checkout main
git pull origin main
git remote prune origin

# Delete local branches whose remote is gone
git branch --merged main | grep -E "^\s*${branchPrefix}TASK-" \
  | xargs -r git branch -d
```

## Step 4 — CI AUTO-RECOVERY (3 attempts max)

List open PRs; for each with a `failure` check:

1. Read run logs: `gh run view <id> --log-failed | tail -150`
2. Check out the branch: `git checkout <branch>`
3. Read the exact error, apply minimal fix (only files named in the error)
4. Run local validation: `commands.typecheck`, `commands.test`, `commands.lint`
5. If local passes: `git add <fixed-files>` → commit `fix: <brief>` → push
6. Switch back to main

Maximum 3 fix attempts per PR. If all 3 fail:
- Leave the branch as-is
- Write AGENT-LOG `outcome: blocked, reason: ci_auto_fix_failed`
- Notify user; stop the run (don't pick a new task while one is stuck)

## Step 5 — SELECT TASK

Walk `roadmap.yml` tasks; eligible tasks satisfy ALL:
- `status == "ready"`
- Every `depends_on[i]` has `status == "done"`
- No open PR on `${branchPrefix}<id>-*`
- `attempt_count < 3`

Order by priority (`high > med > low`) then by ID sequence. Pick the first.

Increment `attempt_count` on the selected task, set `last_attempted` to
current ISO timestamp. Commit this on the feature branch — see Step 6.

If no eligible task:
- Write AGENT-LOG `outcome: skipped, reason: no_ready_tasks`
- If fewer than 3 ready tasks in the roadmap, include a "roadmap running
  low — consider running `/pm-brainstorm`" hint
- Stop.

## Step 6 — BRANCH + CLAIM (branch-as-payload)

```bash
slug=$(echo "<title>" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-')
branch="${branchPrefix}<id>-${slug}"
git checkout -b "$branch" main
```

Edit `roadmap/roadmap.yml`: set task status to `in-progress`, update
`attempt_count` and `last_attempted`. Re-render ROADMAP.md. Commit:

```bash
git add roadmap/roadmap.yml ROADMAP.md
git commit -m "roadmap: mark <id> in-progress"
```

**All status changes live on the feature branch. Never commit them to main.**

## Step 7 — IMPLEMENT

Follow CLAUDE.md Tier 1 rules:
- One file at a time
- Typecheck + targeted tests between edits (the `post-edit.mjs` hook does this automatically)
- Read whole components before editing
- Write tests for new behavior

Task description drives the work. Consult:
- CLAUDE.md Tier 2/3 (conventions, testing patterns)
- Relevant `techstack_*.md` memory files

Commit implementation with a descriptive message:

```bash
git add <specific-files>
git commit -m "feat/fix: <summary> (<TASK-ID>)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Step 8 — LOCAL VALIDATION

Run every workspace command from `project.json.commands`:

```bash
commands.typecheck   # must pass
commands.lint        # must pass
commands.test        # must pass
commands.build       # must pass (if defined)
```

Record test counts per workspace (for regression detection in Step 10).

If any fail after 3 fix attempts:
- Reset: `git checkout -- .`
- Checkout main, delete branch: `git branch -D <branch>`
- Mark task `status: blocked` with a `blocked_reason` in roadmap.yml on main
- Write AGENT-LOG `outcome: blocked`
- Stop.

## Step 9 — PUSH + PR

```bash
git push -u origin "$branch"

gh pr create \
  --title "<TASK-ID>: <title>" \
  --body "$(cat <<'EOF'
## Summary
Automated implementation of <TASK-ID>.

<1-3 bullets on what was done>

## Task details
- ID: <TASK-ID>
- Priority: <priority>
- Complexity: <complexity>
- Workspaces: <list>

## Test results
- <workspace>: <N> tests passed
- Typecheck: clean
- Lint: clean

## Automated
Generated by /autonomous-run.
EOF
)"

# Before enabling auto-merge, mark task done on the branch so the PR is atomic
# (implementation + status change merge together, never diverging)
```

Update `roadmap/roadmap.yml` on the branch: status → `done`, set `pr` URL
and `completed` ISO date. Re-render. Commit:

```bash
git add roadmap/roadmap.yml ROADMAP.md
git commit -m "roadmap: mark <id> done (PR #<num>)"
git push
```

Then enable auto-merge:

```bash
gh pr merge <num> --auto --squash --delete-branch
```

## Step 10 — LOG + MAYBE REVIEW

Append to `AGENT-LOG.md`:

```markdown
### Run [<ISO timestamp>]
- Task: <TASK-ID> — <title>
- Outcome: success
- PR: <url>
- Test counts: <workspace>=<N>, <workspace>=<N>, ...
- Files changed: <list>
- Regression alert: <true if any count decreased, else false>
- Review proposed: <true if success-threshold reached, else false>
- Deploy: <filled in Step 14 if applicable>
- Lessons learned: <optional free text>
```

**Regression check:** compare each workspace's test count to the previous
`success` entry in AGENT-LOG. If any decreased, set `regression_alert: true`
and outcome → `success_with_warning`.

**Review trigger:** count trailing consecutive `success` / `success_with_warning`
entries. If `>= successThreshold` AND no REVIEW-LOG entry exists within
that window AND no open PR matches `auto/review-*`, invoke
`/autonomous-review`. That skill now writes changes directly to a PR
branch and enables auto-merge — no PENDING.md, no pause. Capture its
return value for Step 11's notification.

## Step 11 — NOTIFY (always runs)

Send one `PushNotification` summarizing this cycle. One notification per
cycle, regardless of outcome. Format under 200 chars, single line, no
markdown.

Templates by outcome:

| Outcome | Template |
|---|---|
| success (task merged) | `✅ TASK-XXX done: <short title>. PR #N merged. Streak <k>/<threshold>.` |
| success + review fired | `✅ TASK-XXX done + 🔄 review PR #M opened (N refinements). Streak reset.` |
| success_with_warning | `⚠️ TASK-XXX done w/ regression: <workspace> tests <old>→<new>. PR #N.` |
| skipped: no_ready_tasks | `⏸️ Cycle skipped: no ready tasks. <k> ready remaining — consider /pm-brainstorm.` |
| skipped: dirty_tree | `⏸️ Cycle skipped: dirty working tree. Check VPS state.` |
| blocked: ci_auto_fix_failed | `🛑 PR #N stuck: CI fix failed 3×. Human attention needed.` |
| blocked: roadmap_invalid | `🛑 roadmap.yml invalid. Manual intervention required.` |
| blocked: local_validation | `🛑 TASK-XXX blocked after 3 fix attempts: <cmd> failed.` |
| deploy.rolled_back | `🛑 TASK-XXX merged but deploy rolled back: health check failed.` |
| deploy.deferred | `✅ TASK-XXX merged, deploy deferred (PR not merged in 10m).` |

Call:

```
PushNotification({ message: "<templated string>", status: "proactive" })
```

PushNotification has a built-in 60s active-user guard — it silently
suppresses if the user is typing in an interactive session. That's fine;
the cycle continues regardless.

If the notification call throws (network blip, RC server down), log the
error to `AGENT-LOG.md` under `notify_error:` but DO NOT fail the cycle.
Notifications are informational — the source of truth is AGENT-LOG + PRs.

---

**Steps 12–14 only run if `deploy.autoDeployOnMerge: true`.**

## Step 12 — WAIT FOR MERGE + DEPLOY

Poll for up to 10 minutes (120 * 5s) waiting for PR merge:

```bash
gh pr view <num> --json state | jq -r .state  # expect: MERGED
```

Once merged, pull main:

```bash
git checkout main && git pull origin main
```

Invoke the `/deploy` skill.

If PR doesn't merge in 10 min (CI slow or failing): write AGENT-LOG
`deploy: deferred, reason: pr_not_merged_in_time` and stop (next run picks up).

## Step 13 — HEALTH CHECK

`/deploy` runs `scripts/healthcheck.sh` which polls `deploy.healthCheckUrl`
until 200 OK or `healthCheckTimeoutSec` elapses.

## Step 14 — ROLLBACK (if health fails)

If health check times out:
1. `/deploy` runs `scripts/rollback.sh` (restores previous image tag)
2. Mark THIS TASK as `blocked` with `blocked_reason: "deploy failed health check"`
   on main (direct commit — exceptional case)
3. Write AGENT-LOG `deploy: rolled_back`
4. Update the PushNotification from Step 11 (or re-send) with the
   `deploy.rolled_back` template from the table — this overrides the
   success notification that was sent pre-deploy-check
5. Do NOT cascade: other tasks are still pickupable. Next run proceeds.

---

## After Step 14 (or Step 11 if no deploy): done.

Return control to the scheduler. Next fire will be on the configured cron.
