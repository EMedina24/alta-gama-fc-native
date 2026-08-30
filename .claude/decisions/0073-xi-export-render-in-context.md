# 0073 — Save to Photos uses `expo-media-library`'s class API; the capture uses `useRenderInContext`; no export failure is swallowed

- **Date:** 2026-08-30
- **Status:** Accepted — root cause confirmed from the device log after the first tap; `Asset.create` confirmed by the second tap ("Saved to Photos", 2026-08-30)
- **Decided by:** Ed Medina

## What the log said
Once the `catch` logged, the reader's first tap produced, verbatim:

> `[xi-export] save 4:5 [Error: Method saveToLibraryAsync imported from
> "expo-media-library" is deprecated. Import the legacy API from
> "expo-media-library/legacy" or migrate to the new class-based API …]`

So the CAPTURE succeeded (0065's pipeline works) and the save failed: SDK 57
removed `saveToLibraryAsync` from the package's root entry and left a stub
that throws. The fix is `MediaLibrary.Asset.create(fileUri)`, the class API
the root entry exports, with the bare path view-shot returns given a
`file://` scheme. `requestPermissionsAsync(true)` is unchanged.

## Context
Save to Photos and Share showed "The image could not be rendered. Try again."
The sheet's `catch` was bare — the native rejection was discarded — and the
export path had never been exercised on a device (0065 shipped on `tsc` and a
pure harness). Reading the capture pipeline end to end:

- `captureView` called `captureRef` with `{ png, quality 1, tmpfile }` and
  nothing else, so iOS took `drawViewHierarchyInRect:afterScreenUpdates:YES`.
  That API refuses to draw a hierarchy that is not the foreground one, and at
  the moment Save is tapped the builder is the PRESENTING controller under a
  full-detent form sheet. `react-native-view-shot` turns the refusal into
  "The view cannot be captured…", which the sheet rendered as the generic copy.
- Second-ranked: if the 4 s image timer won the race against the host
  mounting, `cardRef.current` was null and view-shot's guard does not catch a
  null `current` — it rejects with an opaque `findNodeHandle failed`.
- `LineupCard` fired `setTimeout(onImagesSettled, 0)` DURING render, on every
  render, and never reset its settle tally.

## Decision
1. **`useRenderInContext: true`** on the capture. `renderInContext` draws the
   layer tree directly and does not care who is presented on top.
2. **No bare catch on a native promise.** The sheet logs the rejection under
   `[xi-export]` in dev (and the outcome string on success). The copy stays;
   the diagnostic is the log line.
3. **The host guard names its race**: `finish()` checks `cardRef.current`; a
   null ref waits up to 2 s more and then rejects `capture-host-not-mounted`
   instead of handing view-shot a ref it cannot resolve.
4. **`LineupCard` settles in an effect** keyed on `expected`, resetting the
   tally — never during render.

## Consequences
- If Save still fails, the Metro log now says why; that line is the next
  step's input. Until a tap confirms it, HANDOFF records the export as
  "fixed in code, unverified on device".
- No copy, no API, no dependency change.

## Alternatives considered
- **Capturing before the sheet presents** (snapshot on Export tap, hand the
  URI to the sheet) — works, but costs a rasterise the reader may never use
  and a 9:16 mount on every open.
- **Moving the host into the sheet** — 0065 rejected it; a 9:16 card at @3x
  is taller than any detent.
