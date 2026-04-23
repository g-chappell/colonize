#!/usr/bin/env node
// userprompt-cycle-guard.mjs — UserPromptSubmit hook.
//
// Injects a one-line warning before the user's turn when the autonomous
// cycle is active. Catches exactly the deploy-vs-cycle collision hazard
// (manual `scripts/deploy.sh` while an autonomous-run is mid-edit).
//
// Exits 0 always; the warning is printed to stdout so Claude Code can
// prepend it to the conversation as a system reminder.

import { execSync } from 'node:child_process';
import { basename } from 'node:path';

const slug = basename(process.cwd());
const unit = `claude-${slug}.service`;

let state = '';
try {
  state = execSync(`systemctl show ${unit} -p ActiveState --value 2>/dev/null`, {
    timeout: 2000,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).toString().trim();
} catch {
  process.exit(0);
}

if (state === 'activating' || state === 'active') {
  const msg =
    `⚠ Autonomous cycle (${unit}) is currently ${state}. ` +
    `Destructive commands (scripts/deploy.sh, git reset, branch switches) ` +
    `may collide with in-flight edits. Consider 'systemctl stop claude-${slug}.timer' ` +
    `before proceeding.`;
  process.stdout.write(msg + '\n');
}

process.exit(0);
