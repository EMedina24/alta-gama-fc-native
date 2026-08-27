# AltaGama FC — iOS · expanded match row (events)

Addendum to `SPEC.md` §3.1b. Everything needed to build the expanded row and nothing else.

- `Match Events Spec.dc.html` — 1:1 anatomy, measurements, glyph set, data contract. Open in a browser.
- `17-events-live-expanded.png` — live board card, expanded (786×1704, 2x).
- `18-events-result-expanded.png` — `FINISHED TODAY` row, expanded (786×1704, 2x).

## Behaviour

Tapping a played or in-progress match expands it **in place**; upcoming matches have no
disclosure and no chevron. One row open at a time — opening a second closes the first
(a single `home-away` key, not a set). Three surfaces carry it: the live board card (its
footer row is the tap target), `FINISHED TODAY`, and the matchday day rows.

## Geometry

Panel ground `#101317`, one step below the card. Padding `12 / 16 / 14`, rows gapped 11.
Row: minute (30pt column, right-aligned, tabular) · glyph · name block · side crest 22.

**The glyph slot is a fixed 18 × 15pt for every event type**, so names align down the
timeline whatever the mix of goals, cards and subs. Never size the slot to the glyph.

## Glyphs

| Event | Treatment |
|---|---|
| Goal | lime disc `#C8F25A`, dark centre pentagon `#101806`, three trails on the left rim |
| Yellow | card box `#F2C14E`, radius 2 |
| Red | same box, `#FF5C47` |
| Substitution | lime up-arrow (on) beside `#7C858B` down-arrow (off) |

## Lines

| Type | Primary line | Detail line |
|---|---|---|
| `goal` | scorer | `Assist · {player}`, omitted when unassisted |
| `goal` + penalty | scorer | `Penalty` — never also an assist |
| `yellow` | booked player | — |
| `red` | sent-off player | `Second yellow` when that is the cause |
| `sub` | player coming **on** | `Off · {player going off}` |

The player coming **on** takes the primary line: that is the name being looked for.

## Data

```ts
MatchEvent {
  minute:   string        // "63" | "90+2" — verbatim, never normalised to 46
  kind:     'goal' | 'yellow' | 'red' | 'sub'
  side:     'home' | 'away'
  player:   string        // scorer / booked / coming on
  assist?:  string        // goal only
  replaced?: string       // sub only
  penalty?: boolean
  secondYellow?: boolean  // red only
}
```

## Rules

1. A match with no published events shows no chevron. An empty panel is never correct.
2. Events render in feed order — chronological, not grouped by team or type.
3. In-progress matches show events up to the last sync, under the same age note as the score.
4. Leagues without published crests use the abbreviation in the side column, as everywhere else.

~~⚠ **No events endpoint exists.** This is the first surface needing per-minute match data;
it gates on that feed, not on UI work.~~

⚠⚠ **SUPERSEDED 2026-08-26 — `GET /cronogol/fixtures/{id}/events` now exists.** See
**`API-MATCH-EVENTS.md`** beside this file for the contract, and read it before building:
three things in this document do not map onto it as written.

- **Rule 3 cannot be built.** In-progress matches have NO events — the ingest is
  finished-only and three-hourly. The live board card's expanded panel has no content, so
  by rule 1 an in-progress match takes no chevron, exactly like an upcoming one.
- **`side` is not served.** The API says which CLUB (`teamSlug`), and the home/away
  derivation differs between the matchday surfaces and the club fixture list.
- **`kind` is not 1:1.** The API has six event types; this document draws four. `var` and
  `missed-penalty` are real, arrive about once every four matches, and need a decision
  rather than a silent drop.

ES strings: `evEvents` `SUCESOS DEL PARTIDO` · `evAssist` `Asistencia` · `evOff` `Sale` ·
`evPen` `Penalti` · `evSecond` `Doble amarilla`.
