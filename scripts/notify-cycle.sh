#!/usr/bin/env bash
# notify-cycle.sh — parse the last AGENT-LOG entry and push a one-line
# summary to ntfy.sh. Used by claude-colonize.service as Stage 2
# (replaces the earlier PushNotification approach which hit the
# Anthropic "user active" suppression guard).
#
# Requires: NTFY_TOPIC + NTFY_SERVER (in .env, sourced via EnvironmentFile)
# Exits 0 always — a failed notify must not fail the cycle.

set -u
LOG="/opt/colonize/AGENT-LOG.md"

# Source .env explicitly since systemd's EnvironmentFile= sets vars but
# doesn't "source"; this script may be invoked outside systemd too.
if [[ -f /opt/colonize/.env ]]; then
  # shellcheck disable=SC1091
  set -a; source /opt/colonize/.env; set +a
fi

NTFY_SERVER="${NTFY_SERVER:-https://ntfy.sh}"
if [[ -z "${NTFY_TOPIC:-}" ]]; then
  echo "notify-cycle: NTFY_TOPIC not set; skipping" >&2
  exit 0
fi

if [[ ! -f "$LOG" ]]; then
  curl -fsSL --max-time 10 \
    -H "Title: Colonize — log missing" \
    -H "Priority: urgent" \
    -H "Tags: warning" \
    -d "AGENT-LOG.md not found at $LOG. Cycle ran but log wasn't written." \
    "$NTFY_SERVER/$NTFY_TOPIC" >/dev/null || true
  exit 0
fi

# Extract the most recent "### Run" block (tail-scan keeps it cheap).
LAST_ENTRY="$(awk '
  /^### Run/ { buf = $0; next }
  buf        { buf = buf "\n" $0 }
  END        { print buf }
' "$LOG")"

if [[ -z "$LAST_ENTRY" ]]; then
  echo "notify-cycle: no ### Run entries in $LOG; skipping" >&2
  exit 0
fi

# Pull key fields. Missing ones stay empty.
heading="$(printf '%s' "$LAST_ENTRY" | head -n1 | sed 's/^### Run *//;s/[][]//g')"
task="$(printf '%s' "$LAST_ENTRY" | grep -m1 '^- Task:'    | sed 's/^- Task: *//')"
outcome="$(printf '%s' "$LAST_ENTRY" | grep -m1 '^- Outcome:' | sed 's/^- Outcome: *//')"
pr="$(printf '%s' "$LAST_ENTRY" | grep -m1 '^- PR:'      | sed 's/^- PR: *//')"
deploy="$(printf '%s' "$LAST_ENTRY" | grep -m1 '^- Deploy:'  | sed 's/^- Deploy: *//')"
review="$(printf '%s' "$LAST_ENTRY" | grep -m1 '^- Review proposed:' | sed 's/^- Review proposed: *//')"
reg="$(printf '%s' "$LAST_ENTRY" | grep -m1 '^- Regression alert:' | sed 's/^- Regression alert: *//')"

# Plain-language description from the PR body's "## Summary" section.
# Best-effort — a failed `gh` call silently drops the blurb.
blurb=""
pr_num="$(printf '%s' "$pr" | sed -nE 's|.*pull/([0-9]+).*|\1|p' | head -1)"
if [[ -n "$pr_num" ]] && command -v gh >/dev/null 2>&1; then
  blurb="$(gh pr view "$pr_num" --json body --jq '.body' 2>/dev/null \
    | awk '
        /^## Summary$/ { on=1; next }
        /^## / && on   { exit }
        on             { print }
      ' \
    | sed '/^[[:space:]]*$/d' \
    | awk 'BEGIN{budget=500} { if (budget - length - 1 < 0) exit; print; budget -= length + 1 }')"
fi

# Short deploy verdict ("success" / "failure") — full line is a paragraph.
deploy_short="$(printf '%s' "$deploy" | awk '{print $1}')"

# Pick priority + emoji based on outcome.
case "$outcome" in
  success)              prio="default"; tag="white_check_mark" ;;
  success_with_warning) prio="high";    tag="warning" ;;
  skipped)              prio="low";     tag="pause_button" ;;
  blocked)              prio="urgent";  tag="no_entry" ;;
  *)                    prio="default"; tag="robot" ;;
esac

# Compose body: one block per field. Title = a short summary line.
title="Colonize ${task:-cycle}"

body=""
[[ -n "$blurb" ]] && body="${blurb}

"
body="${body}Outcome: ${outcome:-unknown} · Deploy: ${deploy_short:-n/a}
Time: ${heading:-?}"

review_first="$(printf '%s' "$review" | awk '{print $1}')"
if [[ -n "$review_first" && "$review_first" != "false" && "$review_first" != "null" ]]; then
  body="$body
Review: $review"
fi

if [[ -n "$reg" && "$reg" == "true" ]]; then
  body="$body
⚠ Regression alert"
fi

# Fire the push. --max-time 10 so a wedged ntfy server can't stall
# the systemd unit's completion. Failure is non-fatal.
curl -fsSL --max-time 10 \
  -H "Title: $title" \
  -H "Priority: $prio" \
  -H "Tags: $tag" \
  -d "$body" \
  "$NTFY_SERVER/$NTFY_TOPIC" >/dev/null || {
    echo "notify-cycle: ntfy POST failed (not fatal)" >&2
    exit 0
}

echo "notify-cycle: pushed to $NTFY_SERVER/<topic> — outcome=$outcome, task=$task"
