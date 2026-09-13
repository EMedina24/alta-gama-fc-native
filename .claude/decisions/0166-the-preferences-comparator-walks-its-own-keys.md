# 0166 — The preferences comparator walks its own keys, because a hand-written list shipped a dead league switcher

- **Date:** 2026-09-13
- **Status:** Accepted — `scripts/preferences-harness.mjs` fails against the old comparator
  with the exact assertion and passes against the new one (negative test run, not assumed).
  ⚠ The on-device tap was NOT re-verified by me: synthetic CGEvent taps reach the native tab
  bar but not a React Native `Pressable` in this simulator, so the end-to-end confirmation is
  Ed's. Everything below is proven at the layer the bug lives in.
- **Reported by:** Ed — *"league switcher isn't working"*, with the panel open and every
  competition listed.
- **Caused by:** [0164](./0164-the-crown-and-the-page-take-the-league-hue.md) §7, which added
  `Preferences.leagueSlug` and did not extend `same()`.

## Context

`commit` gates **both** the snapshot swap and the `emit` on `!same(snapshot, next)`, and
`same` was a hand-written conjunction of every field. `leagueSlug` was added to the shape and
not to that list, so a payload where only the league had moved compared **equal**:

```
changed = !same(...)   →  false
if (changed) snapshot = next;   ← skipped: memory keeps the OLD league
if (hydrated) AsyncStorage.setItem(next)   ← runs anyway: disk gets the NEW league
if (changed) emit();            ← skipped: no consumer re-renders
```

So a pick did nothing on screen and then appeared at the next launch. ⚠ **Three things that
should have caught it could not.** `tsc` cannot: the list is exhaustive by convention, not by
type. A screenshot cannot: the value really is persisted, so the state looks correct after
any reload. And my own verification of 0164 could not, because I set the preference by
editing the app container and relaunching — which bypasses `commit` entirely. The switcher's
tap path was never exercised.

⚠ It also mimicked a *working* feature under Metro: every code edit fast-refreshes, re-reads
storage, and shows the pick — which is exactly what happened between Ed's report and my
first screenshot, and is why the screen read `Premier League` when I had stored `la-liga`.

## Decision

**1 · `same` walks the keys of both payloads** and compares with `===`, with a `DEEP_EQUAL`
table for the three array fields. A new **scalar** field is covered the moment it exists —
the class of bug is closed, not the instance.

**2 · `DEEP_EQUAL` is typed `satisfies { [K in ArrayKeys]: … }`**, where `ArrayKeys` is
derived from `Preferences` itself. Adding an array field without a comparison is now a
compile error rather than a silent equality — the one place the type system *can* help here,
so it does.

**3 · Both sides' keys are walked**, not just `a`'s. A snapshot built before a schema bump is
missing a field the new one has, and walking one side alone calls those equal.

**4 · The rule is asserted, not just written.** `scripts/preferences-harness.mjs` drives the
assertion off `Object.keys` of a full snapshot: **every field, differing alone, must compare
unequal.** A field added later is covered without touching the harness.

⚠ The harness was run against the OLD comparator first and fails on `leagueSlug` — a test
that has never failed is not evidence.

**5 · `samePreferences` is exported for the harness**, the pattern `tameHsl` and
`TINT_FALLBACK_ENTRIES` already set: the rule most worth pinning is not always the one with a
public caller.

## Consequences

- ⚠ The write-on-unchanged behaviour is KEPT and is not a bug — it is what makes an explicit
  timezone pick that matches the detected one stick. Only the snapshot swap and the emit are
  gated on `changed`, and that was always right; the comparator was wrong.
- ⚠⚠ **`commit`'s shape means any future field omitted from the comparator is a silent
  no-op.** That is why the fix is structural rather than a line. If a field ever needs to be
  deliberately excluded from equality, it must be excluded *in* `DEEP_EQUAL` with a comment,
  never by omission.
- The harness stubs `@react-native-async-storage/async-storage` and `expo-localization` and
  resolves bare imports (`react`, for `useSyncExternalStore`) against the repo's
  `node_modules` — the build lands in a temp dir and cannot see them otherwise. Worth copying
  for the next store-level harness.
- **Lesson for verification, and it is the real finding:** setting state by editing the app
  container proves the READ path and the migration, and proves nothing about the WRITE path.
  0164 was verified that way and called done. When a feature's whole point is a control, the
  control has to be pressed — and if the tooling cannot press it, that limit belongs in the
  status line rather than being quietly counted as covered.
