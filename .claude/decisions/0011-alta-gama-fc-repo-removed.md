# 0011 — `alta-gama-fc` repo removed; deny rule dropped

- **Date:** 2026-08-24
- **Status:** Accepted
- **Supersedes:** [0010](./0010-alta-gama-fc-repo-deprecated.md)
- **Decided by:** Ed Medina

## Context
[0010](./0010-alta-gama-fc-repo-deprecated.md) deprecated the duplicate scaffold at
`/Users/ed/Desktop/repos/alta-gama-fc` and defended against it with a
`Read(...)` deny rule in [.claude/settings.json](../settings.json).

The directory has since been deleted. Verified 2026-08-24: the path does not
exist, and `~/Desktop/repos` now holds only `alta-gama-fc-native`, `cronogol`,
`senpai` and `senpai-backend`.

## Decision
Drop the deny rule. `settings.json` now carries `additionalDirectories` only.
`alta-gama-fc-native` is unambiguously *the* native repo.

## Consequences
- One less rule to explain, and no stale path in config.
- **The `package.json` name collision survives the deletion:** `cronogol` is also
  named `"alta-gama-fc"`. Identify a repo by its **directory path**, never by its
  package name — this was the sharper half of 0010 and it still holds.
- 0010 is kept as history, marked superseded, per
  [0008](./0008-document-every-decision.md).
