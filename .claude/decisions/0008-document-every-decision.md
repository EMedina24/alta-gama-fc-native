# 0008 — Every decision is recorded in this log

- **Date:** 2026-08-24
- **Status:** Accepted
- **Decided by:** Ed Medina

## Context
The project is starting from zero. Rationale is cheap to capture now and
impossible to reconstruct later.

## Decision
Every decision made in this project gets a numbered entry in
`.claude/decisions/`, added in the same change as the code implementing it.
"Decision" = anything a future reader could ask "why is it like this?" about:
dependency choices, architectural splits, conventions, and deliberate
non-choices. Routine work following an already-recorded decision needs no entry.

Reversals are new entries; the superseded one is marked, not deleted or edited.
The index table in [README.md](./README.md) is updated with each new entry.

## Consequences
- Small tax per decision; large payoff on onboarding and on revisiting choices.
- `.claude/` is checked into git — it is shared project documentation.
- Claude Code is instructed to follow this via [AGENTS.md](../../AGENTS.md).
