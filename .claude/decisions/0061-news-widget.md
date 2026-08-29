# 0061 — The NEWS widget: a large tile over the global feed, opening at the publisher

- **Date:** 2026-08-28
- **Status:** Accepted — verified on the simulator (iPhone 17 Pro, 2026-08-28); `preview` build `94e46736` signed with the widget in it, not yet seen on a device
- **Decided by:** Ed Medina

## Context
`handoff_news-widget/` delivered a third home-screen widget — **NEWS**, `systemLarge`
only, design 1a: a lead story with its picture, then three headlines. The Swift was
written in the handoff and compiles against `Tok`, `W.eyebrow` and `Mark` unchanged.
Nothing existed on the JS side but the types: `types.ts` already carried the
ported `News*View` shapes, while `client.ts` had dropped the news reads "until
a screen exists", and there was no query, snapshot or image path. ⚠ Re-adding
those types by hand was the first bug of this change — `tsc` MERGES same-named
interfaces silently and only lint (`import/export`) caught the duplicate, the
exact trap HANDOFF's lint section records.

The backend already serves it. `GET /cronogol/news` is public, unthrottled,
`max-age=60`, ingested hourly at :20; the DTO is `limit`/`before`/`publisher`/
`featured`/`league` and **anything else is a 400**. There is no per-article
route, no body, no slug, and `id` is purged at 30 days. `senpai-backend` was read
and **not modified**.

The handoff left two product calls open.

## Decision

1. **The global feed, one request** — not one `/teams/{slug}/news` per followed
   club merged in the app. Consequence: the mock's `5 CLUBS` header is written as
   `""` (Swift draws an empty eyebrow as nothing) and `followPrompt` is
   effectively unreachable. Both slots stay in the contract so a per-club tile
   can fill them without a version bump.
2. **A tap opens the publisher in Safari.** The `Link` destination is the
   article's https `url`; no app route, no in-app reader. First-party rows open
   `altagamafc.com`.
3. **`expo-image-manipulator` is a new dependency.** It is the only way to honour
   the handoff's rule that pictures are encoded at widget size, never the
   publisher original — a widget decoding a 1200px JPEG is a widget the system
   kills, silently. ⚠ It is a NATIVE module: the dev client must be rebuilt, as
   for `react-native-svg` (HANDOFF §3b).
4. **One JPEG per item at LEAD size (924×348 @3x, cover-cropped)**, not a
   lead-plus-thumbnail pair. When the lead ages out of the 48h window the second
   story becomes the lead, and a 132² thumb upscaled to 308×116pt is a blurry
   hero. The row's `scaledToFill` in a 44pt square centre-crops the wide image —
   the crop the web's `aspect-video` well makes anyway. Four ≈350KB decodes are
   well inside the extension's budget. Small originals are never upscaled.
5. **A second App Group file, `widget/news.json`, and a separate `news/`
   picture directory with its own prune.** Fixtures and headlines refresh on
   different clocks, and `pruneCrestCache` keys on fixture ids and must not learn
   about article ids — no third keep-list. `writeGroupJson` is the one
   temp-then-`moveSync` routine both files use.
6. **Refresh is foreground-only**, in the same re-arm effect as the fixture
   snapshot, with its own debounce and its own change guard. No background
   fetch. `NewsSnapshot.fresh(at:)` in Swift applies the 48h cutoff against each
   hourly timeline entry, so a file the app has not refreshed degrades to fewer
   rows and then the empty state — never a two-day-old story presented as new.
   Eight items travel and four get pictures, for a day of headroom.
7. **`reloadWidgets()` still passes no kind** (0047), so a headline change reloads
   the fixture widgets too. `newsSnapshotKey` compares ids, image presence and
   copy — never `writtenAt` — so that costs one reload per new headline set, at
   most one an hour.
8. **Topic is `categories[0]`**, sanitised through a verbatim port of the web's
   `plainText`/`articleTopic`. `null` draws no chip; never `—`.
9. **Headlines travel verbatim.** Stripping a publisher's stray `<br>` and
   decoding `&amp;` is not editing the quote; the words are theirs, the tag never
   was. `copy` follows the reader's locale, pre-formatted in JS as 0047 argues.

## Consequences
- Three widgets in the bundle. The widget target's `deploymentTarget` is
  unchanged at 17.0; `StaticConfiguration` needs nothing newer.
- The contract is now **two pairs of files**: `features/widgets/snapshot.ts` ↔
  `Snapshot.swift` and `features/news/snapshot.ts` ↔ `NewsSnapshot.swift`.
- `src/lib/cronogol/news.ts` is pure and harness-proven (14 assertions: order,
  the 48h cutoff, unparseable dates, missing url/title, the budget, offset-form
  ISO, topic null cases, tag stripping and entity decoding).
- `_debug/widgets` shows `news.json` as written and, per item, whether
  `news/{id}.jpg` exists beside what `hasImage` claims.
- `handoff_news-widget/` stays in the tree as design source, like `icon-handoff/`;
  its `NEWS-WIDGET.md` names `src/features/news/{snapshot,images}.ts`, which now exist.
- **Seen on the simulator against production**, 2026-08-28: the lead with its
  gradient and `PRIMERA DIVISIÓN · MARCA 2h`, three thumbnail rows, a SPORT row
  drawing NO chip, and the App Group holding `news.json` (8 items) beside four
  JPEGs — three at 924×348 and one at 660×249, a small original left at its own
  size rather than upscaled, exactly as decision 4 says.
- ⚠ Not yet seen: the cold-cache layout (delete `news/` and reload), the empty
  state on a real device, Spanish copy, a tap actually reaching Safari, and
  whether `ImageRef.release()` keeps the app process's memory flat over a warm.

## Alternatives considered
- **Per-followed-club feeds, merged** — the web's default and the mock's header.
  N requests per foreground and a dedupe; deferred until a per-club tile is wanted.
- **In-app reader via `altagamafc://news?url=…`** — needs a route, a handler and
  `expo-web-browser`; the product call was "Safari" and a reader can come later.
- **Lead + thumbnail files per item** — sharper rows, blurry promoted lead, twice
  the files. Rejected for 4.
- **No pictures at all** — the layout's whole argument is the lead image.
- **Folding items into `snapshot.json`** — one writer holding both clocks; the
  handoff argues it out and the separate file was kept.
