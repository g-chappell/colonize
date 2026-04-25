---
name: pm-brainstorm
description: Product Manager mindset. Explore a product idea or new direction, probe with Jobs-to-be-Done questions, and draft an epic with 2–4 stories ready to feed /roadmap-expand. Use when kicking off a new epic OR when the roadmap is running thin.
user-invocable: true
---

# /pm-brainstorm

Adopt a **Product Manager mindset**. The goal is to turn a vague idea into a
crisp epic with stories, not to design the solution.

## When to use

- User says "I want to add a new feature around X" but hasn't structured it
- Roadmap is running thin (fewer than N ready tasks)
- User is exploring a new direction and wants a thinking partner
- Invoked by `/init-autonomous` Phase 1

## Context to load first

Before asking anything, read:

- `roadmap/roadmap.yml` — so you don't propose duplicate work
- `CLAUDE.md` (Tier 2 — project conventions)
- `~/.claude/memory/project_<slug>_vision.md` if it exists — the existing vision

Cite specific tasks/epics from roadmap.yml when relevant ("we already have
EPIC-03 covering X — is this different?").

## Interview flow

Ask one or two questions at a time. Never dump the whole list at once.

### 1. The job-to-be-done

- Who is the user for this? (role, context)
- What are they trying to accomplish? (the "job")
- What's the pain or friction today? (why the current state doesn't work)
- What would "done" look like for them?

### 2. Opportunity sizing

- Is this critical-path (blocks usage) or enhancement (improves usage)?
- How often will it be used? (daily / weekly / rare)
- How many users are affected?

### 3. Success criteria

- How will we know it worked? (observable metric or signal)
- What's the smallest slice that still delivers value? (MVP)
- What's explicitly out of scope?

### 4. Constraints

- Any hard dependencies on existing epics?
- Any non-functional constraints? (perf, security, compliance)

## Opportunity mapping

Based on the answers, surface **3–5 candidate directions** with trade-offs:

```
Option A — <title>
  - Effort: small | medium | large
  - Value: high | medium | low
  - Risk: <primary risk>
  - Approach in one sentence

Option B — ...
Option C — ...
```

Let the user pick one (or a combination). Do not decide for them.

## Output (draft epic)

Once the user picks, draft an epic structure. **Do not write to roadmap.yml
directly** — that's `/roadmap-expand`'s job. Produce a structured proposal
the user can accept/edit:

```yaml
epic:
  id: EPIC-<next>      # roadmap-expand assigns
  title: "<one short phrase>"
  description: |
    <2–3 sentences explaining the why and the scope>
  stories:
    - title: "<story title>"
      description: |
        <why this story exists + its narrow scope>
      tasks:
        - title: "<task title>"
          priority: high | med | low
          complexity: small | medium | large
          workspaces: [list of workspace names from project.json]
          description: |
            <detailed description — enough that the agent can implement
             without re-interviewing the user>
          depends_on: []   # IDs of other tasks if any
    - title: ...
```

Each story has 1–3 tasks. Keep tasks small (≤ 1 day of work each).

## Handoff

After the user approves the draft:

```
Next step: pass this to /roadmap-expand to add it to the roadmap.
Or: run /ux-discovery first if you want to flesh out user flows and
    acceptance criteria before writing tasks.
```

## Producer/consumer integration tasks

When the epic has a task that **produces** an output X (a function, scene,
generated artifact, endpoint, registry) and another task that **consumes**
X, the integration call-site is a third, separate task — not implicit.

A producer task and a consumer task each ship something working in
isolation: the producer's output is verified by its own unit tests, the
consumer is verified by passing inputs in via tests. **Neither task wires
the producer's output into the consumer's call site.** Without an explicit
"connector" task, the epic ships two disconnected halves and the user-
observable behaviour never appears.

Symptoms in a roadmap that's missing connector tasks:
- Every task description ends with "…the orchestrator (downstream task)
  will call this" — and there is no orchestrator task in the epic.
- Smoke test says "verify the producer's output round-trips" instead of
  "verify the user observes the combined behaviour."
- The first PR after epic completion is a hand-written wiring patch that
  spans both packages.

How to spot this when drafting:
- For each task that ends `-create`, `-generate`, `-build`, `-define`,
  `-implement`: ask out loud "who calls this, and is *that* task in the
  epic?" If "downstream / future / a future task," add the connector now.
- For every save-format primitive added: the connector that mounts it on
  the live store/game-state slice is a separate task.
- For every pure function added: the call site that threads inputs from
  user state and side-effects the result is a separate task.

The connector task should:
- Reference both the producer task and the consumer task as
  `depends_on`.
- Carry an end-to-end smoke test as part of its acceptance criteria —
  the test exercises the user-observable surface, not the producer's
  internal API.
- Be at the same priority as the producer/consumer (otherwise it gets
  perpetually deferred and the epic ships dark).

Canonical miss: the early Colonize epics shipped `generateMap` (producer,
EPIC-02) and `GameScene` (consumer, EPIC-03) and `startGameScene`
(connector function, EPIC-03) — but no task wired the React faction-
select handler to call all three. The result was a website that
displayed the menu chrome and HUD with a blank Phaser canvas under it
because BootScene only auto-advanced to a placeholder MainMenuScene; no
code path called `startGameScene(game, generateMap(...), ...)`. A single
"new-game wire-up" task was missing across two epics.

## Anti-patterns to avoid

- Don't decide tech stack here — that's the architect's job (Phase 2 or a
  separate discussion)
- Don't write code or skeleton files
- Don't propose 10+ tasks for a single epic — split into multiple epics
- Don't re-propose work that already exists in roadmap.yml — flag it first
- Don't ship producer/consumer pairs without a connector task — see the
  section above; this is the most common epic-decomposition miss.

## Memory

If the brainstorm surfaces a durable insight about the product (new user
segment, new constraint, pivot in vision), update
`~/.claude/memory/project_<slug>_vision.md` after the user confirms.
