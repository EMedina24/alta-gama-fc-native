# Alta Gama FC — News widget (systemLarge)

Chosen direction: **1a — lead story with its picture, then three headlines.**
Design file: `News Widget.dc.html` (this folder, 1a only) · source with both
options: `AltaGama FC News Widget.dc.html` at the project root.

Content is real: every headline, topic, publisher and age in the mock comes off
`https://altagamafc.com/en/news`.

## Files

| File | Where it goes |
| --- | --- |
| `NewsWidget.swift` | `targets/widget/` — widget, provider, view, lead + row, empty state, image loader |
| `NewsSnapshot.swift` | `targets/widget/` — the App Group contract |
| `W-age.swift` | `targets/widget/` — one `W.age(from:to:)` extension (rename to `W+age.swift`) |
| `news.json.example` | reference payload for `src/features/news/snapshot.ts` |

Register it in `AltaGamaWidgetBundle.swift` next to `YourWeekWidget()`.

## What the app has to write

Two new artefacts in the App Group (`group.com.altagamafc.app`), alongside
`widget/snapshot.json` and `crests/`:

- `widget/news.json` — see the example. Freshest first is not required (the
  extension sorts), but **nothing older than 48h is drawn**.
- `news/{id}.jpg` — one downscaled JPEG per item, mirroring
  `crest-cache.ts`. Lead is drawn at 308×116pt (@3x → 924×348, cover-cropped);
  rows at 44pt square (@3x → 132²). Encode at those sizes, not the publisher's
  originals: a widget process that decodes a 1200px JPEG is a widget the system
  kills for exceeding its memory budget.

Four images per refresh. Write them in `filedAt` order and stop at four — a
fifth is never drawn.

## Rules the design depends on

**Headlines are quotes.** They arrive in the publisher's language and are never
translated, trimmed or re-cased. The feed is aggregated third-party reporting
that links out; editing a headline puts words in MARCA's mouth. Only `copy` —
`NEWS`, `5 CLUBS`, the two empty-state sentences — follows the reader's locale,
pre-formatted in JS exactly as `WidgetSnapshot.Copy` is, because a widget renders
in the *system* language and `.lproj` would hand an English tile to a reader who
picked Spanish in the app.

**Topic is optional.** Every SPORT item in the feed files under no topic. A
missing topic draws no chip and the publisher leads the attribution line — never
a `—`, which reads as a value that failed to load.

**Age is computed, not baked.** `W.age(from:to:)` against the timeline entry's
own date. The provider emits twelve hourly entries and one reload policy, so the
label stays true for half a day without spending a reload (ADR 0025). Not
`Text(date, style: .relative)`: that renders "3 hr ago" in the system language,
next to a `clubCount` in the reader's.

**No image is a layout, not a hole.** With nothing cached the lead becomes a
lime-ruled headline block and the rows lose their thumbnails. A grey rectangle
where a picture should be is indistinguishable from a broken widget. Toggle
`imageCache: cold` in the design file to see it.

**No gallery sample.** `NewsSnapshot` has no `placeholder` twin, unlike
`WidgetSnapshot`. Invented fixtures were bad; invented quotes under a real
publisher's byline are worse. The picker shows the empty state.

**One `Link` per row**, to the publisher URL — four destinations on the tile, so
`widgetURL` is out for the same documented reason as Your Week. Whether the link
opens the publisher in Safari or an in-app reader is a product call that has not
been made; the URL in the payload is the publisher's either way.

## Open

- Which clubs the feed is filtered to — the site's default is all followed clubs;
  the widget has no configuration intent yet. Add `SelectClubIntent` if a
  per-club news tile is wanted (the fixtures widget already has one).
- Publisher logos are not used. Names set in the eyebrow read cleanly at 8.5pt
  and cost no cache; logos would add a per-publisher asset pipeline.
