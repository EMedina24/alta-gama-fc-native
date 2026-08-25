# Decision Log

One file per decision: `NNNN-short-slug.md`, numbered sequentially, never
renumbered. Superseding a decision means writing a **new** entry and marking the
old one `Superseded by 00NN`, not editing history.

## Template

```markdown
# NNNN — <Title>

- **Date:** YYYY-MM-DD
- **Status:** Accepted | Superseded by NNNN | Reversed
- **Decided by:** <who>

## Context
What forced a choice.

## Decision
What we're doing, stated plainly.

## Consequences
What this makes easy, what it makes hard, what it commits us to.

## Alternatives considered
Option — why not.
```

Keep entries short. A decision nobody could reconstruct from the code is worth
more words than one that's obvious once you see it.

## Index

| # | Decision | Status |
| --- | --- | --- |
| [0001](./0001-expo-sdk-57-managed.md) | Expo SDK 57, managed workflow | Accepted |
| [0002](./0002-expo-router-file-based.md) | expo-router with file-based routing | Accepted |
| [0003](./0003-src-directory-and-alias.md) | Code under `src/`, `@/` path alias | Accepted |
| [0004](./0004-typescript-strict.md) | TypeScript with `strict: true` | Accepted |
| [0005](./0005-native-tabs.md) | Native tabs via `expo-router/unstable-native-tabs` | Accepted |
| [0006](./0006-theme-constants-module.md) | Centralized theme constants, no styling library | Accepted |
| [0007](./0007-product-scope-tbd.md) | Product scope not yet defined | Superseded by 0012 |
| [0008](./0008-document-every-decision.md) | Every decision is recorded in this log | Accepted |
| [0009](./0009-backend-is-only-data-gateway.md) | `senpai-backend` is the only data gateway; `cronogol` is the reference implementation | Accepted |
| [0010](./0010-alta-gama-fc-repo-deprecated.md) | `alta-gama-fc` repo is deprecated | Superseded by 0011 |
| [0011](./0011-alta-gama-fc-repo-removed.md) | `alta-gama-fc` repo removed; deny rule dropped | Accepted |
| [0012](./0012-native-ios-port-of-cronogol.md) | Native iOS app porting `cronogol`, for App Store release | Accepted |
| [0013](./0013-atomic-design-components.md) | Atomic design for the component layer | Accepted |
| [0014](./0014-app-specific-design-language.md) | App-specific design language (in progress) | Resolved by 0015 |
| [0015](./0015-handoff-design-system-adopted.md) | Handoff design system adopted; theme module replaced | Accepted |
| [0016](./0016-ios-only-v1.md) | Web target dropped; iOS-only v1 | Accepted |
| [0017](./0017-react-query-data-layer.md) | React Query, with the web app's cache buckets as `staleTime` | Accepted |
| [0018](./0018-ported-data-layer.md) | The ported `lib/cronogol/` layer mirrors the web app path for path | Accepted |
| [0019](./0019-anonymous-v1.md) | Anonymous v1: follows are device-keyed, accounts designed-for | Accepted |
| [0020](./0020-root-stack-wrapping-tabs.md) | Root layout is a `Stack` wrapping a `(tabs)` group | Accepted |
