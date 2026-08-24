# 0010 — `alta-gama-fc` repo is deprecated

- **Date:** 2026-08-24
- **Status:** Superseded by [0011](./0011-alta-gama-fc-repo-removed.md) — the directory was deleted 2026-08-24
- **Decided by:** Ed Medina

## Context
`/Users/ed/Desktop/repos/alta-gama-fc` is a near-identical Expo 57 scaffold sitting
beside this one — same `package.json` name (`alta-gama-fc`), same dependencies,
same starter screens. It has **no git remote**, is on `master`, and has one
`Initial commit`. It is easy to open by mistake and to cite as if it were live.

Note the name collision also reaches the web repo: `cronogol/package.json` is
*also* named `alta-gama-fc`. The **directory** name is what disambiguates, never
the package name.

## Decision
`alta-gama-fc` is **deprecated**. `alta-gama-fc-native` (this repo) is the native
app. Do not read it, copy from it, or treat anything in it as current.

A `Read(/Users/ed/Desktop/repos/alta-gama-fc/**)` deny rule is set in
[.claude/settings.json](../settings.json) so it cannot be consulted by accident.
*(Rule removed in [0011](./0011-alta-gama-fc-repo-removed.md) once the directory
was deleted.)*

## Consequences
- Three directories share the `alta-gama-fc` name in some form. Identify a repo by
  its **path**, not its `package.json` name.
- If the deprecated directory is ever deleted, the deny rule becomes inert and can
  be dropped — harmless either way. **This happened on 2026-08-24; see
  [0011](./0011-alta-gama-fc-repo-removed.md).**
