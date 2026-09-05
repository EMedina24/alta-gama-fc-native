# Handoff — read this first

**As of 2026-09-01.** State of play for a session picking this up cold.

The app is a working iOS app: five screens on live production data, four sheets,
onboarding, EN + ES, push wired and verified on a device. `CRONOGOL_LIVE_PUSH_ENABLED`
is **on** as of 2026-08-30 and the backend dispatched three goals that afternoon — to
**zero devices**, because this app's registration had been failing for two days (trap 44,
[0079](./decisions/0079-push-sync-survives-a-stale-bearer.md)). **Root cause found and
fixed the same evening — a backend CHECK Postgres could not compile (`senpai-backend`
decision 0037), then a wrong .p8 on Render (§104.4). First goal banner delivered 17:48Z
(Deportivo v Valencia). Goal alerts are end-to-end in production.**

---

## 60-second orientation

| | |
| --- | --- |
| **What** | Native iOS app for **Alta Gama FC** — football fixtures, results, tables, club calendars |
| **Stack** | Expo SDK 57 · expo-router · React Query · TypeScript strict · dark-only |
| **Data** | `senpai-backend` at `crono-gol.com`. **The only gateway** — never Supabase or a football provider directly |
| **Reference** | `cronogol` (Next.js web app at `altagamafc.com`). Behaviour is inherited from it; **appearance is not** |
| **Design** | `handoff_AG-ios/` — `SPEC.md` is the screen contract, `screenshots/` shows every state |
| **Run** | `npx expo start --dev-client --ios` (needs a dev build — Expo Go no longer works) |
| **Gates** | `npx tsc --noEmit` · `npx expo export --platform ios` · `npx expo-doctor` |

> ⭐ **NEW 2026-09-03 (latest) — the medium rail becomes a CARD for one match
> ([0109](./decisions/0109-rail-solo-card.md)).** Ed flagged the two-club
> state off a live screenshot: one rail fixture wore the multi-row format —
> `Valen…`/`Barce…` truncated beside `10:15 am`, floating in ~90pt of empty
> glass. `railSolo` now anchors the clubs (named in FULL, 20pt crests) to the
> column's top and the `Dom 6` + 18pt-time block to its bottom — clubs-first
> is 0107's order, not the hero's, so the two "when"s don't race. ⚠ `roomy`
> reuses 0108's 118pt height branch; compact tiles take a smaller cut. Two
> rail rows are untouched. No wire change.
>
> ⭐ **NEW 2026-09-03 (later) — the widgets SPEAK the day
> ([0108](./decisions/0108-widgets-speak-the-day.md)).** Ed read `VIE` on the
> medium tile as furniture (lime + tracking is the tile's TAG voice) and picked
> "Spoken day" from a four-direction mockup
> (`claude.ai/code/artifact/5458faa7-9532-47c3-8d28-cc3d01bde348`). Medium hero
> now says **`Viernes`** at 15pt accent on its own line; the rail says
> **`Dom 6`** (costs no width — the time column is wider); the small NEXT
> footer says **`Sábado 21:00`**. Snapshot **v5** adds `kickoffDayName` +
> `kickoffDayDate` through `formatWidgetKickoffParts` (one injection point, no
> call-site changes; both optional in Swift, v4 degrades to the old forms).
> ⚠⚠ The spoken hero is 114pt against a 124pt standard body but 112 on a mini
> and ≤109 on an SE — `heroColumn(_:spoken:)` branches on measured body height
> (≥118) and COMPACT TILES KEEP THE INLINE TAG, which is why `kickoffDay`
> still travels. Verified on the simulator (ES real data 12h clock + EN
> `week3` sample 24h). ⚠ Needs a new NATIVE build to reach a device; the
> compact fallback has been reasoned+harnessed, never seen on a real mini/SE.
>
> ⭐ **NEW 2026-09-03 — the small NEXT tile names its sides
> ([0107](./decisions/0107-next-tile-names-its-sides.md)).** Ed flagged the
> tile's empty middle; the upcoming state now stacks each side as a column
> (crest over name, followed side in lime — the in-app NEXT UP card's idiom at
> tile scale), takes that card's hairline-then-countdown rule row, bumps the
> countdown 20→22pt and drops the venue from the footer (it only ever rendered
> truncated). `CrestPair` deleted. Every size is measured against the
> Display-Zoomed SE's 115pt box (column min 114.5pt; the un-scalable timer is
> why 22pt not 24). Verified on the simulator: `week3` worst-case (EN) and real
> Betis/Madrid data (ES). ⚠ Paint only — live ledger, accessories, provider,
> reload budget untouched. ⚠ Needs a new NATIVE build to reach a device.
>
> ⭐ **NEW 2026-09-02 — the app carries FIVE leagues.** Puerto Rico
> (`lpr-pro-clausura`, shown as **LPR Clausura**) joined the catalogue
> ([0105](./decisions/0105-lpr-clausura-and-league-capability-flags.md)) and is
> the first league whose source cannot feed the whole app: a table, a schedule,
> crests and excellent squad portraits — and **no matchweeks, no match events and
> no live, permanently**. It is therefore the first league gated by the
> catalogue's own capability flags (`rounds`, `matchEvents`), which until now
> nothing read. It does not appear on **Matchdays** at all, by design.
>
> ⚠ Two things about it that look like bugs and are not: it ships **no artwork**,
> so its chip is the text branch (0031) and its `FINISHED TODAY` header is
> neutral; and its whole season reads **unplayed** — see trap 54. Its sibling
> `lpr-pro-apertura` exists in the backend config but has **no league row**, so it
> is deliberately absent here.

> ⭐ **NEW 2026-08-27 — the app has live scores.** `GET /cronogol/live` carries
> in-play status, score and a **minute**, refreshed every ~30s while a match is
> played, and — unlike `/cronogol/scores` — every row **joins to a fixture** by
> `fixtureId`. LaLiga only. **Today's in-progress card consumes it**
> ([0048](./decisions/0048-live-scores-on-the-today-board.md)); Matchdays, the
> club page and `FINISHED TODAY` do not, yet.
>
> ⚠⚠ It does **not** license un-suppressing liveness in
> `src/lib/cronogol/scores.ts`. That suppression is about `/cronogol/scores`,
> which is still a 4-hourly snapshot, and it stays exactly as it is. Read
> **[LIVE-SCORES.md](./LIVE-SCORES.md) §1 first** — it is the one place these
> two are told apart.

> ⭐ **NEW 2026-08-30 — onboarding redesigned, and an OPEN push-sync failure on the device.**
>
> **Shipped (committed `a0fef0a`, preview build `5dfdc4ed`):** welcome → 3-up club
> picker → alert primer, the icon's "Floodlight" look
> ([0076](./decisions/0076-onboarding-floodlight-redesign.md)); a language line on the
> welcome written in the *other* language, and the primer's `Not now` is the flow's only
> skip — a reader must follow one club ([0077](./decisions/0077-welcome-language-line-and-one-skip.md)).
> Seen on the simulator; the picked-tile state, the crest stack in the CTA and the
> language tap are **unverified** (taps can't be scripted — see the memory note). The
> design canvas with the alternates: `claude.ai/code/artifact/07484219-562c-4405-a8a2-51ea3dad3b75`.

> ⭐ **NEW 2026-09-01 — the "new paint" repaint is UNDERWAY: crown + aurora shell
> ([0087](./decisions/0087-crown-aurora-shell-adopted.md), design in
> `handoff_new-paint/` — `APP-SHELL.md` is the spec, the `.dc.html` is an
> interactive prototype of every screen, `screenshots/01–05` the four tabs).**
>
> **P1 shipped:** ground `#0a0b0c → #0f1316` with a static three-pool mesh
> (`atoms/mesh-ground.tsx`) behind every screen; body cards re-grounded from
> charcoal `card` to GLASS (`Surfaces.glass`); match-events recession moved to
> translucent `recess`; sheets opaque on `sheetGround #101316`; score chip on
> `scoreChip` (still neutral — trap 8). tsc + lint clean.
>
> **P2 shipped:** the CROWN on all four tabs (`templates/crown.tsx` +
> `ScreenScaffold` restructure — ⚠ the 20pt gutter moved off the scroll
> container onto a `body` wrapper; every `-Spacing.five` bleed depends on that
> contract). Today's live match is the crown's dark glass plate
> (`organisms/live-plate.tsx`, [0088](./decisions/0088-live-match-is-the-crown-payload.md));
> league chips are 36pt grayscale-inactive / near-black-selected
> ([0089](./decisions/0089-league-chips-grayscale-inactive.md) — ⚠ an SVG mark
> cannot pass through `FilterImage`, Serie A takes an opacity fallback).
> `/_debug/gallery?only=live` previews the plate's fabricated paths. All four
> crowns + plate verified on the simulator; ⚠ a REAL live match in the crown is
> unwatched (first chance: Valencia v Barcelona 2026-09-06).
>
> **P3 shipped:** the Clubs rail bubbles are LIQUID GLASS
> ([0090](./decisions/0090-clubs-bubbles-liquid-glass-and-trays.md) —
> `expo-glass-effect`'s first use, gated on `isLiquidGlassAvailable()` with a
> flat fallback; club-colour ring/radial/glow retired, frosted rank pill with a
> band-colour dot). `molecules/tray.tsx` is the double bezel as a component;
> the search field and browse list wear it.
>
> **P4 shipped:** the club page is rebuilt
> ([0091](./decisions/0091-club-page-hero-and-trays.md)) — bled hero with its
> own back pill (⚠ no native header on this screen any more), a standing strip,
> a NEXT UP card in the opponent's colour, an alerts+calendar tray, and a
> gradient spine rail. `club-header.tsx` is deleted. ⚠ The spine, the squad and
> the NOT-subscribed (solid lime) alert row sit below the fold and have not been
> seen — the simulator here cannot scroll or tap.
>
> **P5 shipped:** News is uniform glass story cards
> ([0092](./decisions/0092-news-uniform-story-cards.md) — reverses 0070's front
> page and 0071's Today lead picture; ⚠ the screen's `frontPagePick` split had
> to go in the same change or lead/tile stories would have vanished), filter
> chips go neutral when unselected, and News drops its native header for a
> labelled back link. Sheets sit on `sheetGround #101316`
> ([0093](./decisions/0093-sheets-on-their-own-ground.md), colour-only — trap
> 19 stands); the tab bar is opaque `tabBar`.
>
> **P6 shipped (the repaint is COMPLETE):** the dead-code sweep — `news-lead.tsx`
> and `news-tile.tsx` deleted, `frontPagePick`/`NewsFrontPagePick` removed from
> `lib/cronogol/news.ts`, and `bezelFill`/`bezelHighlight`/`sunken`/`NewsScrim`/
> `leagueTile*`/the three news ratios dropped from `theme.ts`; `_debug/gallery`
> re-grounded to the real `recess` and tray surfaces.
>
> ⚠ ~~Onboarding deliberately does NOT take the mesh.~~ **REVERSED 2026-09-01
> on Ed's call ([0099](./decisions/0099-onboarding-joins-the-crown-shell.md)):
> onboarding now wears the crown + aurora shell** — mesh on all three screens,
> a title-less crown on the welcome (the gradient head alone), the full crown
> on the picker and primer, and the picker's tiles replaced by the rail's
> liquid-glass `ClubBubble`s (`checked` prop — the rail's one-action rule is
> untouched). `Glow` is deleted with the floodlight look. Verified by
> screenshot on the simulator (ES); ⚠ picked-state checks, the language tap
> and the CTA crest stack still need a device pass — taps cannot be scripted
> here.
>
> ⚠ **Still unverified after the repaint:** a REAL live match in the Today
> crown (first chance Valencia v Barcelona 2026-09-06); the club page below the
> fold (spine, squad, the not-subscribed solid-lime alert row); Spanish; large
> Dynamic Type on the 40/48pt crown titles; and iPad width, where the crown is
> full-bleed but the body caps at `MaxContentWidth`. Taps and scrolls cannot be
> scripted on this simulator — those need a device pass.
>
> **Post-repaint, same session:** the crown now runs to y = 0 with an
> ADAPTIVE STATUS BAR and a FIXED 432pt gradient layer shared by all four tabs
> ([0094](./decisions/0094-crown-runs-to-the-top.md) — reverses 0087's
> crown-below-status-bar call), and Today's NEXT UP card moved INTO the crown
> as its idle payload ([0095](./decisions/0095-next-up-joins-the-crown.md) —
> `match-board.tsx` deleted, split into `next-up-card.tsx` +
> `last-result-card.tsx`; the 0052 kickoff contract moved verbatim). ⚠ The
> idle→kicked-off→live crown handover now swaps the payload COMPONENT at the
> whistle — watch for a layout jump on the first real match. The NEXT UP card
> itself is LIQUID GLASS now
> ([0096](./decisions/0096-next-up-goes-liquid-glass.md)) — club pair at
> whisper alpha, lime ring back on both variants, faint inks stepped up.
>
> Plan file: `~/.claude/plans/we-re-updating-our-apps-compiled-bonbon.md`.
>
> ⚠ While mid-repaint, `handoff_AG-ios/SPEC.md` is the BEHAVIOUR contract but no
> longer the look; where the two disagree on paint, `handoff_new-paint/` wins
> (carve-outs in 0087: League.zones ranks, UISwitch, honesty lines, 0063's
> NEXT-UP-first ordering).
>
> ⭐ **NEW 2026-09-01 — the WIDGETS join the shell
> ([0104](./decisions/0104-widgets-adopt-the-app-shell.md)), amending 0087 §10's
> `targets/` carve-out.** All three home-screen tiles now draw the aurora mesh as
> their container background (`targets/widget/Shell.swift` — `MeshPlate`,
> `GlassSurface`, `GlassGroup`), YOUR WEEK's floodlit `Plate` is deleted, and
> glass lands on what is genuinely a panel: YOUR WEEK's rail column, NEXT's
> `recess`-scrimmed live ledger, NEWS's uniform story rows.
>
> ⚠⚠ **The headline finding is a negative one: `SwiftUI.glassEffect()` DOES NOT
> WORK IN A WIDGET — it silently erases its own content (trap 52).** This was
> built with real glass on iOS 26 over a painted fallback and the glass path
> rendered blank tiles. `GlassSurface` is now ONE painted path at every version
> (`glassFill` + a 0.5pt `glassLine` + a masked `plateTop` edge), which is what
> most of the app draws anyway. ⚠ Do not "restore" it on a newer SDK without
> re-checking on a PLACED widget. The widget `deploymentTarget` stays 17.0 (0055)
> and now has no `#available` branch pulling the other way.
>
> ⚠⚠ **Second finding: copying `theme.ts`'s `Mesh` verbatim also rendered dead
> (trap 53)** — its pools are centred off a SCREEN, so a tile sees only their
> tails. New `theme.ts` `MeshTile` fixes it with geometry, alphas untouched,
> calibrated against a sampled screenshot of the real Today ground. Crest fallback tiles
> go unfilled on the widgets only (`CrestView.tone`, `.solid` still the default
> because `_shared/` compiles into the notification extensions). No wire change,
> no snapshot bump, no `Cadence` value touched — this is paint, so the reload
> budget (trap 34) is untouched.
>
> **Four new traps out of it: 50** (`EllipticalGradient` cannot do independent
> `rx`/`ry`), **51** (`.contentMarginsDisabled()` is configuration-wide and
> silently strips the Lock Screen accessories' margins), **52** (`glassEffect` in
> a widget) and **53** (`Mesh` at tile scale).
>
> **Verified** on the iOS 26.5 simulator with both widgets placed, across five
> `?sample=` states — `week1` (hero alone, no column), `week3`/`week3es` (rail
> column; ES worst case fits with no truncation), `live` and `ft` (the recessed
> ledger panel). Because there is now one painted path, those screenshots are
> what an iOS 17 reader sees too.
>
> ⚠⚠ **Two surfaces are UNSEEN and neither is small.** (1) **The NEWS tile has
> never been rendered** — it is not placed on this simulator and a widget cannot
> be placed without a tap, which cannot be scripted here. It is also the tile with
> the tightest height budget (three 44pt rows plus a 116pt lead), so it is the
> likeliest place for this change to overflow. (2) **The Live Activity** —
> nothing in this repo starts one (the server push-to-starts it), so its change is
> reasoned, typechecked and never rendered. That is exactly why it is
> ADDITION-only: the mesh's coolest pool at 0.28 and the lit top edge, zero height
> against the ~160pt cap, and NO glass (the card does not own its rectangle — the
> system already composites it onto a material).
>
> ⚠ Also unproven: every `?sample=` deep link carries FABRICATED fixture ids, so
> every crest in a sample screenshot is a fallback tile. The real-crest case was
> seen separately on live data (Betis / Real Madrid) before the samples ran.

> **OPEN — "Alert settings could not be saved" on Ed's iPhone (preview build).** That
> line is ADR 0079's verdict: the last `PUT /cronogol/push/device` from the phone got no
> ACK (`src/features/push/sync.ts:136-163` — HTTP error, timeout, or the server's echo
> differing from what was sent). It re-sends on every launch and switch change, so if it
> is still there it is failing *repeatedly*. The simulator cannot reproduce it (no APNs
> token → it shows the "saved on this device" line) and a preview build ships no console.
>
> **ROOT CAUSE FOUND, 2026-08-30 (Render logs via MCP) — it is the BACKEND DATABASE, not
> the app.** Every `PUT /cronogol/push/device` from the phone since 2026-08-29 21:28Z is a
> **500** thrown at `PushDeviceService.register` (the `device_tokens` upsert), message:
> `Device registration failed: invalid regular expression: invalid repetition count(s)`.
> That is Postgres rejecting the CHECK added by
> `senpai-backend/supabase/migrations/20261004000000_push_to_start_token.sql:35` —
> `push_to_start_token ~ '^[0-9a-f]{64,512}$'`. **Postgres regex bounds are capped at
> 255**, so the pattern itself is invalid; the operator is strict, so it is only ever
> compiled when the column is NON-NULL. That is why rows without an `activityToken` (the
> 08-28 19:24Z write, the simulator, last session's curl probes) succeed and every
> registration from the phone — which now sends its ActivityKit push-to-start token —
> fails. Not a 404, not a stale bearer, not the body: candidates 1–3 above are all closed.
>
> **FIXED AND VERIFIED, 2026-08-30 16:43Z.** `senpai-backend` commit `8459293`: migration
> `20261006000000_push_to_start_token_check_fix.sql` (CHECK rewritten as hex + `length()
> between 64 and 512`), decision 0037, CRONOGOL.md §104; applied with `yarn db:push`. Three
> `PUT /cronogol/push/device 200` from Ed's phone followed, each logging
> `Push device registered: 3 club(s), production, linked=true, liveActivity=true` — the row
> finally holds `alert_goals` as set on the phone AND a push-to-start token, so both the goal
> banner fan-out and Live Activities have their first production device. **The next LaLiga
> goal is the end-to-end test; nothing has been received yet.** No app change was needed.
> **THEN, 16:54:59Z — the 4th goal reached the device and APNs refused it: `0/1 device(s)`,
> `HTTP 403 InvalidProviderToken`.** The scheduler had logged that reason every 30 min since
> 08-29 06:45Z (`failed=1 … stay pending`). Render has NEVER delivered a push — every pass
> before 08-29 had `devices=0`, and the 08-25 production `200` was from Ed's Mac with `.env`,
> whose key still authenticates (`probe-apns.mjs` → `400 BadDeviceToken`). Render's
> `APNS_PRIVATE_KEY_BASE64` on Render was a DIFFERENT .p8 under the same key id (key id, team
> id, bundle id all matched). **CLOSED 17:48:05Z: Ed replaced it from `.env`, followed Valencia,
> and Deportivo v Valencia's first goal went out `Live push goal fixture=fbf156f3…: 1/1
> device(s)` — the first push Render has ever delivered. Goal alerts are END-TO-END in
> production.** `senpai-backend` verification-log 2026-08-30 (evening), CRONOGOL.md §104.4; the
> live path's warn now carries the APNs reason code (trap 45).
> ⚠ The 400s at 16:22–16:24Z on 08-30 (0–2 ms, no stack) were hand probes, not the phone.
> ⚠ When a registration footnote goes red, the Render request log for the route is the
> first read — the app and the DB both looked fine here; only the log had the message.
>
> Ruled out earlier the same day (probed `crono-gol.com` directly): the route is up; the
> body `buildRegistration` sends (`sync.ts:73-86`) matches production's DTO
> field-for-field; `clubSlugs` is capped client-side at the server's 20.

> ⭐ **NEW 2026-08-30 (late) — the widgets show LIVE SCORES** ([0080](./decisions/0080-widgets-live-scores-poll-plus-push.md)).
> Ed picked the "Ledger" layout on a design canvas
> (`claude.ai/code/artifact/1005481e-6a05-45df-aef8-93985fb80344`); small + medium now
> draw two team rows with scores, minute, HT/FT, kicked-off dashes and a stalled dim.
> Data is `<AppGroup>/widget/live.json`, written three ways: the widget extension's own
> **rationed poll** of `/cronogol/live` (5-min reloads inside a 150-min match window —
> the ONE sanctioned network call in that target, a deliberate carve-out from 0025's
> no-network rule), the notification service extension on every goal/red/FT push, and
> the foregrounded app off `useLive`. Snapshot bumped to **v3** (`leagueSlug`,
> `LIVE`/`HT`/`FT` copy; every Swift field optional, the 0059 pattern).
> ⚠⚠ **It shipped DEAD and is now fixed** ([0084](./decisions/0084-widget-live-gate-takes-the-api-league-slug.md),
> 2026-08-31): the `leagueSlug` gate compared against our `la-liga` while the wire
> carries `laliga`, so none of the below ever ran — Barcelona v Rayo (`19:30Z`,
> 2026-08-31) drew the upcoming layout throughout. The gate now takes the API slug.
> ⚠ **Still never seen against a real match** — next chance is Real Madrid,
> 2026-09-04 19:00Z, and it needs a new build (native).
> **Verified on the simulator** — `altagamafc://_debug/widgets?sample=live` (or `ft`)
> writes a fabricated snapshot + `live.json` and reloads, tap-free; both ledgers drew
> exactly the canvas, the FT merge fired against the real route (a fabricated fixture
> the route does not serve → `finished`, which is why sample ids get a `debug-` guard
> in `LiveMerge`), and a relaunch restored real data. **Still pending: a real match
> end-to-end (HT heuristic, FT hold) and the push writer on a device.** ⚠ The per-minute timeline ENTRIES are free; the 5-minute RELOAD is the
> rationed thing — do not "fix" the minute by shortening `Cadence.liveReload`.

> ⭐ **NEW 2026-08-31 — YOUR WEEK is redrawn** ([0086](./decisions/0086-week-widget-hero-and-rail.md),
> the whole of `handoff_week-widget/`). The medium tile stops being three equal rows:
> one **hero kickoff** on the left — time, day, side tag, then the two clubs stacked —
> a fading hairline, and the remaining two fixtures as a **rail**, all on a flush
> floodlit plate (`EllipticalGradient` lime + pitch pool, the 0085 language at widget
> scale). ⚠ **No wire change at all** — snapshot v3 already carried every field, so
> `snapshot.ts`, `Snapshot.swift`, `copy.ts` and `Tokens.swift` are untouched and there
> is nothing to bump.
> ⚠⚠ **The hero STACKS where the mock draws one row, and the number is why.** An
> `ImageRenderer` harness put the mock's `crest·name·v·crest·name` at **183pt** for the
> realistic worst pair (`R. Sociedad` v `Villarreal`) against a **157.3pt** hero column
> on an SE. Dropping the `v` saves 11pt; crests 20→18 save **4** — the crest never
> binds, the two NAMES do, which is exactly what 0085 §3 already paid to learn. Stacked
> it is 95pt, and the tile had 33pt of unused HEIGHT to spend. **Measure before you
> trim.**
> ⚠⚠ **The medium tile no longer draws the live ledger, and no longer polls for it.**
> `FixtureProvider` is shared, so the poll and the 5-minute cadence are gated on
> `context.family != .systemMedium` (`.systemMedium` is YOUR WEEK alone; NEXT is small
> + the three accessories). The small widget's ledger is untouched. **The cost: a match
> in play is simply ABSENT from the medium tile** — `rows(after:)` filters on
> `kickoffUtc > now`, so at kickoff the row leaves and the hero becomes the next
> fixture behind it.
> ⚠ **First `.contentMarginsDisabled()` in this repo.** It is what puts the plate
> against the system's own corner instead of floating it inside ~16pt margins; the
> mock's nested r24/r21.5 tray was deliberately NOT built, because a second radius
> inside the system mask double-rounds every edge (0085 §1).
> ⚠⚠ **NOT YET SEEN — not on a simulator, not on a device.** Everything above is
> `swiftc -typecheck` plus macOS SF Pro metrics. It needs a new build (native).
> New samples: `altagamafc://_debug/widgets?sample=week1|week2|week3|week3es` — 1, 2
> and 3 fixtures plus the Spanish furniture, tap-free. ⚠ They fabricate the **wire**
> (`WindowFixtureView`s through the real `buildSnapshot`), not the snapshot, so every
> derived field is production code — trap 48's rule, applied before it could bite twice.
> The clubs are the layout's worst case on purpose, not a flattering one.

> **2026-08-28 — the app icon is now set 1a "Floodlight"**
> ([0060](./decisions/0060-app-icon-1a-floodlight.md)): graphite field, lime glow,
> lime mark on every appearance. Same geometry as 1b, so nothing else re-cut.
> Source at `icon-handoff/AppIcon-1a-floodlight/`; not yet on a device.

**Read [ECOSYSTEM.md](./ECOSYSTEM.md) before touching data, naming or URLs.**
Read the decision log — [decisions/](./decisions/) — before changing anything that
looks arbitrary. Most of it isn't.

---

## What exists

```
src/
  app/                  21 routes: (tabs)/, club/[slug], (sheets)/, onboarding/, _debug/
  components/           12 atoms · 11 molecules · 14 organisms · 1 template
  lib/cronogol/         the ported data layer — path-mirrors cronogol/lib/cronogol/
  lib/{format,timezones}.ts · lib/i18n/{phrases,copy,use-i18n}
  queries/              React Query hooks + staleTime buckets
  store/                preferences (device-local) + push registration
  features/push/        capability seam · sync · reminders · routing
```

**Screens:** Today (board + FINISHED TODAY + follow card) · Matchdays · Table ·
Clubs · club page (season spine + squad). **Sheets:** alerts · calendar ·
matchday calendar · account. **Onboarding:** welcome → club picker → alert primer ([0076](./decisions/0076-onboarding-floodlight-redesign.md)); at least one club is required, and the primer's `Not now` is the only skip ([0077](./decisions/0077-welcome-language-line-and-one-skip.md)).

---

## ⚠ The traps that have already bitten

Every one of these is a real bug that shipped or nearly shipped here. They are
documented at the code that handles them; this is the index.

1. **`lastSyncedAt === null` is not a schedule.** An opponent-only club returns a
   handful of matches. Render the pending state, never the partial list.
2. **Jornada order is not chronological.** LaLiga matchday 1 had a deferred
   fixture *after* matchday 2 finished. `currentMatchweek` sorts on
   `firstKickoffUtc`; `completedMatchweek` walks contiguously and stops at the
   first gap — which is why the Table caption is legitimately `null` right now and
   degrades to a club count.
3. **`form` is NEWEST-FIRST on the wire.** Rendering it as given reverses a
   timeline and silently drops the *oldest* entry on a short array.
4. **Spanish `D` is a LOSS** (*Derrota*), the opposite of English `D` (draw).
   Letters come from `phrases.formLetters`; components never see a language.
5. **`to` is EXCLUSIVE on `/cronogol/fixtures`, INCLUSIVE on
   `/cronogol/teams/{slug}/fixtures`.** On purpose.
6. **Unknown query params are 400s**, not ignored — both those routes carry
   `forbidNonWhitelisted` DTOs. `toQuery`'s drop-undefined filter is load-bearing.
7. **`/cronogol/scores` is a WORLD scoreboard** with no crosswalk to our clubs
   (Liga Argentina, friendlies). It cannot serve FINISHED TODAY — that comes from
   `/cronogol/fixtures`. See [0022](./decisions/0022-finished-today-from-fixtures.md).
8. **Almost no DATA is live, and the exception is exactly one route.**
   `/cronogol/scores` sweeps ~4h, fixtures ~3h, standings lag ~3h. Every score
   off those states its age. **Never remove those lines.**
   ⚠⚠ **`GET /cronogol/live` is the exception and it is narrow**
   ([0048](./decisions/0048-live-scores-on-the-today-board.md)): ~30s refresh,
   joins to a fixture by `fixtureId`, carries a real minute — **LaLiga only**.
   A minute may be printed **only** off that route, and only in the shape 0048
   sets: the minute beside the pill, dimmed when stalled, and a note that states
   either the ~30s cadence or that updates are paused. Drop the stalled branch
   and a dead session looks identical to a live one, which is this trap by
   another route. Everything else still lands on the fixture sweep's card, with
   its `FeedAge` line intact — **that path is not dead code.** ⚠ The next-up countdown is the
   one exception and is not a counter-example: it is arithmetic on the device
   clock against a kickoff timestamp the API already gave us, so it cannot go
   stale — see [0034](./decisions/0034-next-up-card-live-seconds-countdown.md).
   ⚠ An in-play SCORE may now be shown, and only in the shape
   [0035](./decisions/0035-jornada-rows-show-in-play-scores.md) sets: the score,
   a caption that says *in play* (never "live"), and the cadence sentence beside
   it. Drop any one of the three and you are back to the claim this trap exists
   to stop. `statusText` in `scores.ts` still returns null for `live` — that
   guard is for `/cronogol/scores`, which no UI reads.
   ⚠ The score CHIP ([0044](./decisions/0044-scores-render-as-split-digits.md))
   is `raised`, a neutral ground, and must stay that way. Painting it `live` /
   `liveWash` would make every finished score in a list look current, which is
   this trap by another route.
9. **The APNs token must be lowercased** — the backend rejects uppercase hex with
   a 400 on *every* registration. Verified against production.
10. **The APNs environment follows the PROVISIONING PROFILE, not the build
    name.** EAS `distribution: internal` is **ad-hoc**, and ad-hoc carries
    `aps-environment: production` — so an EAS build called `development` issues a
    **production** token. Cost a debugging round; see
    [0026](./decisions/0026-apns-environment-is-the-provisioning-profile.md).
    ⚠ This failure is **silent**: the device registers fine and every push fails
    at APNs with nothing surfaced in the app. Also not `__DEV__` — that is false
    in a release-configuration dev-client build.
11. **iOS caps pending local notifications at 64.** `selectReminders` uses a
    rolling window of 60 and never schedules a `kickoffTbd` fixture (stored at
    midnight-UTC, so "30 min before" fires at 01:30 for a 21:00 match).
    ⚠ **That window counts NOTIFICATIONS, not fixtures** — a reader can pick up
    to three lead times (1 h / 30 / 15) and one match then costs three slots, so
    three leads buy ~20 fixtures of horizon where one buys 60. The selection
    expands fixtures × leads and sorts the whole expansion by FIRE TIME, so the
    nearest match is always fully covered and the horizon is what shortens. Going
    back to counting fixtures schedules 180 and hands the cap to iOS's silent
    truncation — which looks fine in testing, because nobody testing follows
    enough clubs to cross 64. See
    [0040](./decisions/0040-kickoff-reminder-lead-times.md).
    ⚠ The cutoff is tested PER LEAD: a match kicking off in 20 minutes has no
    60- or 30-minute reminder left but its 15-minute one is still ahead.
    ⚠ And an attachment file is per NOTIFICATION, not per fixture — see trap 13.
12. **Notification crests cannot be drawn on the device — for two leagues, not
    ever.** Bundesliga clubs publish `svg` and nothing else; Serie A crests are
    WebP. `UNNotificationAttachment` takes neither and Swift decodes neither, so
    `senpai-backend` composites every crest and the lettered fallback tile
    ([0037](./decisions/0037-rich-notifications-server-composed-crests.md)).
    ⚠ The tile is the DESIGN for those clubs, not a degradation. Never hot-link
    a provider to "fix" it.
13. **`UNNotificationAttachment` MOVES the file it is handed** into the
    notification's own store. Attaching a cached file empties the cache on every
    fire; `crest-cache.ts` hands over a copy, and `attachmentCopy` exists for
    exactly this. ⚠ It also needs `typeHint: 'public.png'` — iOS types the
    attachment from that and silently drops an untyped file.
    ⚠ **One copy PER NOTIFICATION, keyed `${fixtureId}-${lead}`.** Three lead
    times on one match are three notifications; sharing one copy between them
    means the first one scheduled consumes the file and the other two are handed
    a path with nothing at it — dropped silently, as above. This is also why
    `pruneCrestCache` takes TWO keep-lists: the plate cache and the App Group are
    per fixture, the attachment directory is per notification, and sweeping the
    latter against fixture ids deletes every copy on every re-arm (0040).
14. **A notification category identifier is a THREE-WAY contract that nothing
    validates**: `categories.ts`, the wire (`aps.category` from the backend and
    `categoryIdentifier` on every local reminder), and the content extension's
    `UNNotificationExtensionCategory`. A mismatch produces no error anywhere —
    the long-look card simply never appears.
15. **The long-look card is a second source of truth, twice over.** An app
    extension is a separate binary: `Tokens.swift` copies `theme.ts` by hand, and
    `en.lproj`/`es.lproj` copy nothing from `copy.ts` because the extension
    cannot read the JS bundle. Both will drift and nothing will catch it.
    ⚠ 0047 halved the first half and did NOT touch the second: `Tokens.swift` and
    `CrestView.swift` moved to **`targets/_shared/`**, which `@bacons/apple-targets`
    links into every target, so the widgets did not add a third copy. The
    `.lproj` files are still the content extension's alone — **and the widgets
    deliberately have none.** A widget renders in the SYSTEM language, so its copy
    travels inside the App Group snapshot instead, already resolved for the
    reader's `lang`/`tz`/`clock`. ⚠ Do not "fix" that inconsistency in either
    direction: the two surfaces have different constraints and 0047 argues it out. ⚠ 0040 widened this: the card's eyebrow now
    branches on `leadMinutes`, so **a lead added to `REMINDER_LEAD_OPTIONS` needs
    a `case` in `MatchCard.eyebrowText` AND a line in both `.lproj` files** or iOS
    prints the raw key on the card.
16. **Reminder artwork is capped at the soonest 12** (`REMINDER_ARTWORK_BUDGET`),
    because the re-arm runs on **every foreground**, not just on a data change.
    Lifting the cap puts 60 downloads on every resume from the app switcher.
17. **A `Directory`'s `uri` ends in a slash; a `File`'s does not.**
    `FileSystemPath.init` standardises through
    `appendingPathComponent(_:isDirectory:)`, so `entry.uri.split('/').pop()`
    yields `''` for every directory. `pruneCrestCache` walked a directory of
    directories that way and would have deleted the whole App Group crest cache
    on every re-arm — the long-look card showing lettered tiles for clubs that
    HAVE a crest, and re-downloading all of them on every foreground. ⚠ Caught
    by reading the native source, not by `tsc` and not by any test.
    ⚠⚠ **And it has a cousin, 0047.** That same App Group sweep is keyed on the
    REMINDER queue — the soonest 12 fixtures inside 7 days — while the widget
    snapshot is one fixture per followed club across **21**. A club whose next
    match is twelve days out is in the second and not the first, so the sweep
    deleted exactly the crests the widget was drawing, on the next foreground,
    silently. `features/widgets/pins.ts` holds the widget's keep-list and the App
    Group sweep takes the **union**; the two `Paths.cache` sweeps deliberately do
    not. ⚠ The pin is set SYNCHRONOUSLY in `use-push-sync`, before any await —
    losing that race only costs a re-download, but it shows as a flash of
    lettered tiles.
18. **An `_`-prefixed route is NOT private.** Only `_layout` is special. `/_debug`
    would have shipped; it is guarded by a `__DEV__` redirect in
    `_debug/_layout.tsx`.
19. **`presentation: 'formSheet'` in a nested `_layout.tsx` does NOTHING.** A
    group with a layout is a nested stack, and its first route is that stack's
    root — no navigator presents it, so it rendered full-screen with no grabber,
    no swipe-to-dismiss and (with `headerShown: false`) no way back. All four
    sheets shipped like that. They are declared in the ROOT stack now; a new
    sheet route needs a `Stack.Screen` line there or it silently reverts to a
    card. See [0030](./decisions/0030-sheets-are-presented-by-the-root-stack.md).
    ⚠ And inside a `formSheet`, **`flex: 1` collapses to zero** — the screen is
    laid out at its content's height, so a `flex: 1` wrapper paints its children
    on top of each other. A pinned header there is `stickyHeaderIndices`, not a
    sibling above the scroll.
20. **Bands are per-league CONFIG, never position arithmetic.** `bandsApply` also
    suppresses them on an incomplete or unplayed table — banding a zero-point
    table painted three clubs into relegation on the web app.
21. **The countdown's `AppState` listener is load-bearing.** `countdown.tsx`
    ticks once a second and tears the timer down whenever the app leaves
    `active`. iOS suspends JS timers in the background anyway, so dropping the
    listener does not save the wake — it just means the card comes back from a
    resume showing the number it was suspended on, and re-reading `Date.now()`
    on `active` is the whole fix. Each tick also schedules to the next WALL
    second, not a fixed period, or the digit drifts from whenever the card
    mounted. See [0034](./decisions/0034-next-up-card-live-seconds-countdown.md).
22. **`expo prebuild` FLATTENS the tinted app icon onto solid WHITE.**
    `withIosIcons` generates every variant with
    `removeTransparency: appearance !== 'dark'` and `backgroundColor: '#ffffff'`
    — only `dark` keeps its alpha. A tinted export drawn the usual way (a pale
    glyph on transparency) comes out white-on-white, and since iOS 18 maps
    *luminance* to the user's tint, the home-screen tile renders as flat colour
    with **no mark in it**. The icon-1a masters (0060; 1b before them) arrive pre-composited on opaque
    `#0b0b0b`, so the flatten is currently a no-op — **but the requirement did not
    go away, it just became the design source's default.** Any tinted export that
    comes back transparent reverts the bug. ⚠ It fails silently: nothing errors,
    `expo-doctor` passes, and it is visible only under Settings → Display &
    Brightness → **Tinted** on a real build. See
    [0036](./decisions/0036-app-icon-appearance-variants.md) →
    [0041](./decisions/0041-app-icon-1b-and-a-splash-of-its-own.md) →
    [0060](./decisions/0060-app-icon-1a-floodlight.md).
    ⚠ **And the `dark` master is OPAQUE now, so it is no longer splash-safe.**
    0036 had the splash reuse `icon-dark.png` because that variant was the glyph
    alone on transparency. Icon 1b's dark variant was a full-bleed `#0f1216` field
    (1a's is `#0a0b0c`, same shape of problem)
    — deliberately, so the lime stays the Home Screen signal — and 184pt of it
    centred on the `#0a0b0c` ground is a **visible dark square**. The splash has
    its own asset now: `assets/images/splash-lockup.png`, the full logo lockup. ⚠ It
    is TIGHT to the artwork — no padding — so `imageWidth` (300) is the artwork's
    true width, NOT 0036's 184, which was really 184 × 0.646 because the mark
    floated in a 1024 square. **Trim and `imageWidth` are one setting in two
    files**: re-trim the artwork without re-deriving the number and the launch
    screen silently resizes.
23. **A hand-authored `AppIcon.appiconset` in the repo does NOTHING.** This is a
    CNG project — `prebuild` regenerates `Images.xcassets/AppIcon.appiconset`
    from `app.json` and overwrites it. A complete, correct seventeen-file
    appiconset sat at `icons/` unread from `924828a` until 0036. The icon is
    configured in `app.json`, nowhere else. ⚠ `prebuild` also rewrites
    `package.json`'s `ios`/`android` scripts to `expo run:*` — revert that; the
    run command is still `npx expo start --dev-client --ios`.
    ⚠ Same trap, same shape: **`icon-handoff/` and `logos/` are design source and
    no build step reads a byte of either.** They are kept because the SVG masters
    and the geometry notes are worth having; the only files that reach a build are
    the four in `assets/images/` that `app.json` names.
24. **Signing out must never touch `followed`.** It is device state, this device's
    array IS the follow state, and nothing on the server can rebuild it
    ([0019](./decisions/0019-anonymous-v1.md) survives 0038 on this point). A
    sign-out that clears it silently unsubscribes the reader from every alert they
    have. `store/session.ts` clears the session and nothing else, deliberately.
25. **Apple hands over the user's name EXACTLY ONCE** — the first authorization
    ever for that Apple ID and this app — and the identity token carries no name
    claim, so Supabase never sees it either. `features/auth/apple.ts` writes it to
    `PATCH /cronogol/me` in the same function. Miss it and the account is nameless
    forever, short of the user revoking the app in Settings → Apple ID.
26. **An expired bearer is a 401 even on `@OptionalAuth()` routes.** "Optional"
    means a MISSING credential is acceptable, not a bad one — so
    `PUT /cronogol/push/device` must carry a freshly-resolved token or none at
    all. A cached one breaks push registration entirely and silently. Never store
    an access token anywhere; call `getAccessToken()`, which refreshes.
27. **There is no unlink.** A bearer links a device row to an account permanently;
    an anonymous re-register KEEPS the link, and signing out changes nothing
    server-side. Push therefore re-registers on sign-IN only — firing on sign-out
    would spend one of 20/min to tell the server what it already knows.
28. **`AUTH_STORAGE_KEY` can never change.** Unset, `supabase-js` derives it from
    the hostname; `cronogol` is pinned to a stale project ref forever because
    moving to the custom domain silently renamed its key and presented as "the app
    forgot me after a deploy", with no error anywhere.
29. **EAS checks that a provisioning profile is ACTIVE, not that it COVERS your
    entitlements.** Adding a capability to `app.json` and enabling it on the App
    ID is **not enough** — an already-issued profile does not gain it, and EAS
    happily prints *"All credentials are ready to build"* while handing Xcode a
    profile that cannot sign the app. It cost three failed builds on 2026-08-26.
    The error, if you hit it:
    `Provisioning profile "…" doesn't include the Sign In with Apple capability`.
    **The fix is to make Apple mint a NEW profile:**
    `eas credentials -p ios` → the build profile → the MAIN target → *Provisioning
    Profile: Delete one from your project*, then *All: Set up all the required
    credentials*. ⚠ When it asks *"All your registered devices are present… reuse
    the profile?"* answer **No, let me choose devices again** — "Yes" re-imports
    the same stale profile from Apple and nothing changes. Confirm success by the
    **Developer Portal ID changing** and `Updated` reading seconds rather than
    hours; the ID alone is the only reliable tell.
    ⚠ `--refresh-ad-hoc-provisioning-profile` is the non-interactive equivalent,
    but it is **non-interactive ONLY** and needs an **App Store Connect API key**,
    which this account does not have. ⚠ An APNs `.p8` is NOT one — different
    console, different service, different issuer claim, not interchangeable.
30. **React Native's `URL` and `URLSearchParams` corrupt credentials silently.**
    `URL.hash` is `match(/#([^/]*)/)` — it stops at the first `/`. `URLSearchParams`
    does `pair.split('=')` and takes two elements, cutting any value containing
    `=`. Both truncate rather than throw. `features/auth/google.ts` parses the
    OAuth redirect by hand for exactly this reason — do not "simplify" it back.
31. **The splash and the icon are NATIVE — Metro reloads will never change them.**
    Both are compiled into the binary from `app.json` at build time, so a dev build
    already installed on a device keeps the artwork it was built with no matter how
    many times it re-downloads the bundle. Seeing new launch artwork means
    installing a NEW NATIVE BUILD on **that** device; a simulator being right says
    nothing about the phone. ⚠ And `expo run:ios` **skips prebuild entirely when
    `ios/` already exists**, so an `app.json` change silently does not reach the
    native project — it reports "Build Succeeded" and installs the previous
    artwork. Delete `ios/` (or `expo prebuild --clean`) after ANY `app.json` edit,
    and verify against the GENERATED asset in
    `ios/*/Images.xcassets/SplashScreenLogo.imageset/`, never the build's exit code.

32. **An empty events array is NOT a goalless match, and the feed order is not
    always chronological.** `GET /cronogol/fixtures/{id}/events` returns
    `count: 0` for any fixture the 3-hourly, finished-only sweep has not reached
    — so a 4-1 that ended twenty minutes ago and a real 0-0 are the *same
    response*, and the API cannot tell them apart for us. Copy says "not
    published yet" and must never be tidied into "no goals"
    ([0045](./decisions/0045-match-events-expanded-row.md)).
    ⚠ **Two claims in `handoff_event-expansion/API-MATCH-EVENTS.md` did not
    survive first contact with production**, checked 2026-08-26:
    *"`minuteExtra` is Serie A only"* — it is not, LaLiga populates it; and
    *order comes from the server* implying chronological — on
    `c56084e3-df56-420d-9a05-714b3eadaaa5` a 46' substitution is served **before**
    the 45+3' booking, so the panel legitimately renders `46′` above `45+3′`.
    Shipped as served, per the instruction and design rule 2. A **stable** sort
    on the composed `(minute, minuteExtra)` would fix that inversion without the
    pair-flipping the doc warns about — it needs its own ADR, not a quiet edit.
33. **A fixed-width numeric column needs `adjustsFontSizeToFit`, not just a
    measured width.** The events panel's minute column was built to the spec's
    30pt and truncated `45+2′` to `45…` on the simulator — the spec's number was
    set against HTML, which overflows a fixed width silently rather than
    ellipsing it. ⚠ `tsc` and `expo export` both passed; **only the simulator
    caught it**, and the same is true of the chevron column that this change
    first added to the matchday row: it cost the name block 19pt and truncated
    `Espanyol de Barcelona`, which is the failure ADR 0029 exists to name. The
    chevron lives beside `FIN` in the timing column for exactly that reason.

34. **WidgetKit rations RELOADS, not timeline entries — and spending them is
    silent.** A widget gets roughly 40–70 reloads a day; spend them and it freezes
    for the rest of the day with nothing in any log, on the device or off it. The
    re-arm in `use-push-sync` runs on **every foreground**, so `snapshotKey()`
    excludes `writtenAt` — comparing whole snapshots would call every foreground a
    change and burn the budget in minutes of ordinary app switching. ⚠ The flip
    side is the useful half: **entries inside one timeline are free**, which is why
    the countdown can tick per minute in its last hour while still reloading at
    most once per kickoff. "Never per-minute" (0025) is about reloads.
35. **The board's fixture windows END AT `now`, so a match that kicks off after
    they were fetched is in NONE of them.** `todayBounds` is
    `[local midnight, now]` and `recentBounds` `[midnight-14d, now]`, `to` is
    exclusive (trap 5), and neither query carries an interval — so at kick-off the
    Today board held no row for the match that was starting, `boardLive` tier 1
    had nothing to join `/cronogol/live` onto, and the in-progress card **never
    appeared** however long the poll ran. The next-up countdown now announces
    kick-off (`onElapsed` → `onKickoff`) and the board refetches `finished`,
    `recent` and `live` on it. ⚠ **Never `upcoming` too** — its window starts at
    `now`, so refetching it drops the match that just started, and it is also the
    only query feeding `next`: leaving it alone is what stops a new
    `next.kickoffUtc` re-arming the countdown's guard into a request loop.
    ⚠ And the reason the obvious fix was not enough: window bounds used to be
    computed **during render** and closed over, so a `refetch()` re-asked for a
    window that had already ended. They are built inside the `queryFn` now. See
    [0052](./decisions/0052-kickoff-triggers-the-live-refetch.md).
40. **A gradient drawn behind a rounded card needs `overflow: 'hidden'` AND a
    unique SVG `id`.** `finished-today.tsx` hard-codes `id="band"` and survives
    only because one league has a gradient; a second `<LinearGradient id="band">`
    in the same tree makes both `url(#band)` fills resolve to whichever mounted
    first. `WashGradient` (0068) takes its id from `useId()` — use the atom, do
    not copy the Svg block. And without `overflow: 'hidden'` the absolute fill
    paints square corners over the card's radius (the `flush` trap, again).
41. **A "new since you last looked" count must read the stamp captured when the
    screen OPENED, not the live preference.** `news.tsx` writes `newsSeenAt` in
    a mount effect; a pill computed from `usePreferences().newsSeenAt` shows
    `6 NEW` for one frame and `0` for the rest. `useState(() => newsSeenAt)`
    freezes the value for the screen's lifetime (0070).
42. **`react-native-svg` paints an `rgba()` gradient stop OPAQUE.** The alpha
    channel of `stopColor` is dropped; a translucent stop needs `stopOpacity`.
    The News lead's scrim shipped as a black slab over the picture before
    `WashStop.opacity` existed (0070). Use the atom; never hand-roll a `Stop`.
43. **Never a bare `catch` on a native promise, and never `captureRef` under a
    presented sheet without `useRenderInContext`.** The XI export shipped both:
    iOS's `drawViewHierarchyInRect` refuses the presenting controller's
    hierarchy while a form sheet is up, view-shot rejects, and a bare `catch`
    turned the reason into "could not be rendered" with nothing in any log.
    `export.ts` now passes `useRenderInContext: true`; `xi-export.tsx` logs
    the rejection under `[xi-export]` (0073). ⚠ And the actual culprit that
    log revealed: **SDK 57's `expo-media-library` root entry re-exports the
    old function names as stubs that THROW** ("deprecated") — `tsc` is happy,
    the call fails at runtime. Use the class API (`Asset.create`) or the
    `/legacy` entry; never trust a name that still type-checks.

36. **A live push must not replay the first half.** `LiveSessionService` opens
    onto whatever is in its window — including a match already at 60 minutes,
    after a restart, a lease handover or a deploy. The stored row is then null
    and **every event of the match is "new"**, so the naive detector fans out
    five goal banners for goals scored an hour ago. `decideLiveAlerts` returns
    `[]` outright when `stored === null`: a match we have never seen starts
    silent and alerts only on what happens next. ⚠ The same shape bites twice —
    `finished` PERSISTS for every remaining cycle of the session, so full time
    keys on the **transition** (`stored.status !== 'finished'`), never on the
    state. See backend decision 0033.

37. **`interruption-level: time-sensitive` is SILENTLY DOWNGRADED without the
    entitlement.** No error, no log, nothing in the payload to inspect — the
    alert simply arrives without Focus break-through, which is the one thing it
    was marked for. `com.apple.developer.usernotifications.time-sensitive` is now
    in `app.json`'s `ios.entitlements`.
    ⚠ **You do NOT enable this by hand in the Apple Developer portal.** EAS Build
    syncs capabilities from `ios.entitlements` to the App ID on every build —
    watch for the `✔ Synced capabilities` step in the log. Time Sensitive
    Notifications is on its supported list.
    ⚠ **What DOES bite: the provisioning profile.** An existing profile does not
    know about a newly-synced capability, and EAS has been seen reusing a cached
    one (expo/expo#40851). If a build signs but the level still downgrades, run
    `eas credentials` and regenerate the iOS profile before suspecting the
    payload. `EXPO_DEBUG=1 eas build` shows the sync; `EXPO_NO_CAPABILITY_SYNC=1`
    turns it off.
    ⭐ **It bit, 2026-08-28.** The first `preview` build after the entitlement
    landed (`090c552a`) failed in Xcode with *"doesn't include the Time
    Sensitive Notifications capability"* while EAS had printed *All credentials
    are ready*. Fixed by trap 29's recipe (`npx eas-cli credentials -p ios` →
    delete the MAIN target's profile → set up all); the Portal ID moved
    `N9WSK26LXP` → `9KB5277ZHF`. ⚠ `eas` is not installed globally here — it is
    `npx eas-cli`, always.
    ⚠ This is why `reminders.ts` has always used `active`. The only way to
    confirm it works is to fire one at a device with a Focus on
    ([0053](./decisions/0053-live-match-push-alerts.md)).

38. **The live alert's meta row is the CARD, not the banner.** A standard iOS
    banner has title, subtitle and body and no third styled row — so
    `28' left · 🟨 3 · 🟥 1 · Getafe 10 men` can only exist on the long look,
    drawn by `MatchCard.swift` from `userInfo` keys. ⚠ A missing key **drops its
    segment**, deliberately: a zero would draw `🟨 0`. And if only the clock
    would remain, the whole row goes — a lone `28' left` under a scoreline is a
    widow. ⚠ Its five new strings need a line in **both** `.lproj` files or iOS
    prints the raw key (trap 15, again).
39. **An exclusive `to` on the kickoff MILLISECOND excludes the fixture — and the
    live card is no longer allowed to depend on that window at all.** Levante v
    Betis, 2026-08-29 15:00 UTC: the 0052 kickoff refetch fired from a tick
    aligned to the wall second, its `to` could equal the kickoff exactly, and
    measured against production `to=15:00:00.000Z` returns **zero** rows for a
    15:00:00 kickoff while `.001Z` returns it. One shot, zero margin, and nothing
    re-asks for fifteen minutes. The card sat on `00m 00s` for ninety minutes
    beside a healthy `/cronogol/live`. Fixed twice
    ([0066](./decisions/0066-live-card-reads-the-live-route-directly.md)):
    `routeLive` (tier 0) now builds the card from the live route alone, crests
    from the club catalogue, and `Countdown` fires strictly PAST the target.
    ⚠⚠ **And a third time, the next day** — Real Madrid v Málaga, 2026-08-30
    15:00 UTC: `/cronogol/live` had NO row at 15:04:15 and a `minute: 0` row
    at 15:04:26. **LaLiga flips a match to in-play at the ACTUAL whistle, two
    to five minutes after the scheduled kickoff the countdown counts to** —
    every match, not a bad day. In that gap tier 0 has nothing, and a fresh
    `upcoming` (which starts at `now`) has already dropped the match, so a
    cold launch showed the fixture AFTER it as NEXT UP. The board now holds
    the match itself — `kickedOff`, a tier between the route and the sweep,
    built from windows already on screen — and `next` excludes any passed
    kickoff. See [0078](./decisions/0078-kicked-off-lead-card.md).
    ⚠ The 0052 refetch stays — it still feeds FINISHED TODAY and the LAST
    RESULT card — and its "never `upcoming`" rule still holds.
    ⚠⚠ **Goal pushes were the same report and are NOT this bug.** The backend's
    `LivePushService` sends nothing until `CRONOGOL_LIVE_PUSH_ENABLED` is
    `'true'` on Render (`render.yaml` ships `'false'`; the gate is a matchday of
    `[dry-run] live push` log lines), and `alertGoals` defaults OFF in the app.
    No app change can produce a goal banner while that flag is off.
44. **A signed-in device can stop registering for days, and nothing said so.**
    Production, 2026-08-30: the Goals switch on, the flag on, three goals
    claimed in `live_push_sent` — and the only live `device_tokens` row read
    `alert_goals: false`, last written 2026-08-28 19:24Z. `syncPushRegistration`
    ended in a bare `catch { return 'failed' }`, and the route answers **401 to
    a stale bearer** rather than degrading to anonymous, while the sync read
    the session token with no refresh. `register()` now retries once with a
    refreshed bearer and then anonymously (lossless — the link persists
    server-side), every non-sent outcome logs `[push-sync] …`, and the account
    sheet's footnote says saved-at / could-not-save. ⚠ When a banner is
    missing, read that footnote and `device_tokens.alert_goals` BEFORE the
    backend: the fan-out filters on that column, and the Render log's
    `Live push goal …: 0/0 device(s)` is what a wrong row looks like. See
    [0079](./decisions/0079-push-sync-survives-a-stale-bearer.md).
45. **A credential proven from the Mac proves the Mac.** 2026-08-30: with the
    row finally right, the first goal to reach the device got `0/1 device(s)` —
    APNs `403 InvalidProviderToken` for Render's `APNS_*` set, while the same
    four values in `senpai-backend/.env` authenticate. No push had ever left
    Render: every earlier pass had `devices=0`, so the 08-25 delivery proof
    never exercised Render's copy. ⚠ Read the scheduler's `Push pass complete`
    line: `failed=N … stay pending` on a pass with `devices>0` is APNs auth,
    and it retries every 30 min — the cheapest verification there is. The
    live path's per-device warn carried only `HTTP 403` until that day; it
    now names the reason code like the dispatch path does.
46. **⚠⚠ `eas build` silently DISABLES the Broadcast capability, every time**
    ([0083](./decisions/0083-eas-capability-sync-strips-broadcast.md),
    [expo/eas-cli#3815](https://github.com/expo/eas-cli/issues/3815)). Broadcast
    is a sub-option under `PUSH_NOTIFICATIONS`, and EAS's syncer re-creates that
    capability at its defaults, dropping the flag. It ate the capability enabled
    on 2026-08-28 — the sandbox `--channel` proof passed, later builds stripped
    it, and the first production channel create returned
    `400 BroadcastFeatureNotEnabled`. ⚠ **Build with `yarn build:preview` (or
    `:development` / `:production`)**, which set `EXPO_NO_CAPABILITY_SYNC=1` in
    the SHELL — ⚠ and which invoke **`npx eas-cli`**, not a bare `eas`: they
    shipped with the bare form on 2026-08-31 and every one failed with
    `eas: command not found`, because `eas-cli` is installed neither globally nor
    as a dependency here (trap 37 already said so). Corrected 2026-09-01; the env
    var still reaches the syncer through `npx`, which was the thing to verify — ⚠⚠ it does NOT work from `eas.json`'s `env`, because capability
    sync runs during credential resolution before profile env is loaded. ⚠ There
    is no warning in the build log; the portal checkbox is just unticked next
    time somebody looks.
47. **⚠⚠ Symmetric-looking host constants hid an unshippable bug for three days**
    (backend [0039](../../senpai-backend/.claude/decisions/0039-apns-management-ports-are-not-symmetric.md)).
    APNs channel management is port **2195 on sandbox and 2196 on production** —
    the one host pair in the codebase that is not a straight `.sandbox.`
    substitution. Both constants said 2195, so the branch that had never run was
    the wrong one. ⚠ The failure is not a refusal: production answers on 2195
    and completes a TLS handshake with the SANDBOX certificate, so it surfaces as
    `ERR_TLS_CERT_ALTNAME_INVALID` or a bare timeout, neither of which mentions a
    port. ⚠ When two constants differ only by environment, verify BOTH — a
    passing test on one proves nothing about the other.

48. **⚠⚠ A `_debug` sample that INVENTS a field instead of copying the wire
    turns a red test green** ([0084](./decisions/0084-widget-live-gate-takes-the-api-league-slug.md)).
    0080's live ledger shipped in the 2026-08-31 preview build and never drew for
    a real match: `Snapshot.swift` gated `liveEligible` on `leagueSlug == "la-liga"`
    — OUR internal slug — while `snapshot.ts` writes what the server sends,
    `laliga`. False for every real fixture, so `rows(inPlayAt:)` was always empty,
    `anyInWindow` was always false, and `/cronogol/live` was never polled at all.
    Barcelona v Rayo played through it with the upcoming layout on screen.
    ⚠ The reason it passed review AND simulator verification: `_debug/widgets`'s
    fabricated rows hardcoded `leagueSlug: 'la-liga'` — the sample fed the gate the
    one value the bug accepted — and the doc comments on BOTH sides of the wire
    said "OUR league slug", so the comments agreed with the bug. ⚠ Two slugs exist
    for every league (`leagues.ts`: `slug: 'la-liga'`, `apiSlug: 'laliga'`) and
    `CRONOGOL-API.md` says the hyphenated one "no longer matches anything" since
    2026-08-05. **When a sample stands in for the wire, copy real values into it;
    a field you type by hand is a field the test cannot check.**

49. **⚠⚠ A deduped row is invisible to any filter keyed on the side that lost
    the dedupe** ([0102](./decisions/0102-widget-club-filter-matches-involvement.md)).
    The Edit Widget club filter matched `entry.clubSlug == selected`, but a derby
    between two followed clubs is ONE entry whose `clubSlug` is the home side
    (0029's tie-break), and the away club's next-match slot is consumed by that
    same fixture — so selecting the away club rendered "Sin partidos programados"
    with the club's own fixture sitting in the snapshot. Reported from a device
    2026-09-01; reproduced same day by running the real `buildSnapshot` over the
    live `/cronogol/fixtures` window (ATH v ATM, both followed → zero rows for
    `atletico-madrid`). Fix: entries carry `homeSlug`/`awaySlug` (snapshot v4)
    and Swift filters on `involves(club)`. ⚠ The general rule: when a writer
    collapses N owners to one row, every reader that FILTERS BY OWNER must match
    on all N, not on the one the collapse elected.
50. **⚠⚠ `EllipticalGradient`'s `center:`/`endRadiusFraction:` cannot express an
    ellipse whose `rx` and `ry` differ.** It takes ONE radius fraction and fits
    its ellipse to the view's own aspect ratio, so `Mesh`'s `0.64 × 0.40` pools
    — and every CSS `radial-gradient(70% 90% at …)` in every handoff — are
    unreachable through that initialiser. 0085 and 0086 both hit it and recorded
    an approximation; [0104](./decisions/0104-widgets-adopt-the-app-shell.md)
    resolves it: size the gradient's own FRAME to `2rx × 2ry` of the surface and
    `.position` that frame's centre at `cx, cy` inside a `GeometryReader`. The
    default `endRadiusFraction` of 0.5 then means exactly "fill this frame's
    inscribed ellipse". ⚠ The pool centres are legitimately OUTSIDE the surface
    (`cx` −0.12 and 1.08), so the result must be clipped.
51. **⚠⚠ `.contentMarginsDisabled()` is CONFIGURATION-wide and has no per-family
    form.** It is needed on any widget that paints its own ground, or the
    container background floats in a black frame (0086 §3) — but a configuration
    that also serves Lock Screen accessories strips THEIR margins in the same
    breath, and nothing warns. The fix is to disable it and hand the margins back
    in the view from `@Environment(\.widgetContentMargins)` (iOS 17.0, this
    target's floor exactly), applying our own only to the family that wanted
    them. `NextFixtureWidget` is the worked example.
52. **⚠⚠ `SwiftUI.glassEffect()` does not work in a WIDGET — it erases its own
    content, and nothing tells you.** ADR 0104 built `GlassSurface` with real
    glass under `#available(iOS 26.0, *)`; on the 26.5 simulator the entire
    modified subtree rendered as NOTHING — the YOUR WEEK rail column and the NEXT
    live ledger vanished, text included, while the eyebrow and footnote around
    them drew normally. Isolated to a bare
    `content.glassEffect(.clear, in: shape)` with no scrim, ring or overlay: the
    same blank. It compiles, it typechecks at 17.0 and 26.0, the build is clean,
    and no log line mentions it. A widget is rendered out of process into an
    ARCHIVE; `glassEffect` is a live backdrop filter needing a real context and a
    real backdrop, and has neither. ⚠ The general rule: **a widget surface is only
    verified when it has been seen on a PLACED widget.** A clean build proves
    nothing about a widget — `Info.plist`'s `NSExtensionPrincipalClass` note is
    the same class of silent failure.
53. **⚠⚠ `theme.ts`'s `Mesh` renders DEAD on a widget tile, at the values that
    are right on a screen.** Two of its three pools are centred OFF the surface
    (`cx` −0.12 and 1.08). A ~930pt screen still catches their cores; a 158pt
    tile catches only their tails, so the first build of 0104 was a grey-green
    murk with all its colour trapped in the corners and a dead centre exactly
    where the type sits. The fix is geometry, not alpha — `theme.ts` `MeshTile`
    pulls the centres onto the tile's edges and widens each fade, with the three
    ALPHAS unchanged. ⚠ The general rule: **a fraction-based background is not
    scale-free.** Its value distribution is aspect-independent, but WHERE the
    surface samples it is not, so any wash authored for one surface size has to
    be re-composed for another. ⚠ Calibrate it by sampling a screenshot of the
    real screen (the Today body ground measures `#0f3832` … `#101f1e`, green
    channel typically 31–45), never by eye.
54. **⚠⚠ A league can publish a FINISHED table over fixtures that are all still
    `scheduled`** ([0106](./decisions/0106-next-up-card-refuses-a-stale-pick.md)).
    Puerto Rico's federation enters results into the standings and never onto the
    matches: `lpr-pro-clausura` serves 11 clubs at 110 of 110 played with a form
    guide on every row, while all 20 of Ponce's fixtures sit `scheduled` with
    null scores and kickoffs in February–June. `nextUpIndex` — which picks by
    ORDER, deliberately, never by clock — therefore elected a February match and
    the club page announced it as NEXT UP, under a countdown. ⚠ The general rule:
    **`status` and the table are separate claims and either can be the stale
    one.** Null scores on a `scheduled` past fixture do NOT mean 0-0 and must
    never be written as such (the backend's own mapper carries the same warning).
55. **⚠ An unsupported league answers `200` with an empty collection, not 404 —
    so an ungated screen renders a convincing skeleton of nothing**
    ([0105](./decisions/0105-lpr-clausura-and-league-capability-flags.md)).
    `GET /cronogol/jornada/lpr-pro-clausura/2026` returns `matchweeks: []` beside
    `totalMatchweeks: 20`, which is enough for Matchdays to draw a full 20-round
    pager and strip where every single round is empty. `?matchweek=` on standings
    is the same shape — an empty table, deliberately. ⚠ The capability is not
    discoverable from any payload and there is no capabilities endpoint: it lives
    on `League` (`rounds`, `matchEvents`) and is copied by hand from
    `CRONOGOL-API.md`. Inferring it from an empty response is exactly how trap 32
    happens — an empty array is also what a WORKING league serves mid-sweep.
56. **⚠ A fixed-width row of chips given a FLEX SHARE overflows, and short test
    data hides it for months.** The club page's standing strip sized its form
    column at `flex: 1.45`. Five `FormChip`s are 22pt each plus 4pt gaps and the
    cell's padding — **142pt, fixed** — while 1.45 of a 402pt screen is 115. The
    fifth chip sat outside the tray. It shipped that way and was invisible the
    whole time because **no league had ever served five results**: every European
    table was three matchdays old, and Puerto Rico's completed season was the
    first full `form` array the component had seen. ⚠ Raising the fraction is not
    the fix — the value that fits a 402pt screen still overflows a 375pt one. The
    column takes `flex: 0` and sizes to its own chips. ⚠ The general rule:
    **content with an intrinsic width gets `flex: 0`, never a share** — and
    whenever a component is fed a capped list (`max = 5`), draw the cap once
    before believing the layout.

57. **⚠⚠ A COLD deep link builds the whole navigation stack from the URL — and
    without an anchor, the target is the stack's ONLY route.** Tapping a widget
    with the app killed resolved `altagamafc://club/{slug}` into `[club/[slug]]`
    alone: no tab bar (the club page sits outside `(tabs)`, trap-free by 0020),
    a hero back pill whose `router.back()` had nothing to pop, and a swipe-back
    with nothing beneath — the reader's only exit was force-quitting. It shipped
    because every test tap was WARM (a running app pushes the URL onto the
    existing stack, which works) and because the notification path is a
    different code path that never had the bug (`routing.ts` lands on `(tabs)`
    then pushes). The root `_layout.tsx` now exports
    `unstable_settings = { anchor: '(tabs)' }`
    ([0110](./decisions/0110-deep-links-anchor-on-the-tab-shell.md)) — the
    router inserts `(tabs)` beneath any deep-linked route. ⚠ A new top-level
    route reached by URL gets this floor for free; do not "fix" a specific
    screen with a hand-rolled fallback instead. ⚠ Verifying it needs a KILLED
    app — `simctl terminate` then `simctl openurl` — a warm tap proves nothing.
58. **⚠⚠ Crest WRITES are budgeted, foreground-only and debounced; crest DELETES
    are unbudgeted, run on the same foreground, and are the tail of a
    fire-and-forget promise.** The Live Activity is the one crest consumer whose
    demand set is chosen by the SERVER — a push-to-start at T−10 with the app
    closed — so its artwork must already be on disk, and three separate paths
    were destroying it. (a) `pinWidgetCrests` sits behind `if (snapshot)`, so a
    cold launch where the 7-day `useUpcoming` beats the 21-day `useWidgetWindow`
    ran `pruneCrestCache` against the module initialiser `[]` and swept the
    container down to the reminder queue — and a `widgetWindow` query that
    merely FAILED did it for the whole session. (b) `applyReminders` is fired
    with `void` and ends in the prune, while `scheduleWidgetSync`'s 1s timer
    runs `warmLongLookCrests` concurrently: the sweep can `delete()` the
    directory a download is mid-write into, the throw is swallowed, and the
    crest is silently absent **for a fixture that was in the keep-list**.
    (c) With `planned` and `pins` both empty the sweep emptied `crests/`
    outright. Both pin modules now answer `null` for "not yet known" and the
    App Group sweep is SKIPPED while either is, an in-flight set is treated as
    wanted, and the activity's own 48-hour selection is a fourth keep-list
    ([0111](./decisions/0111-live-activity-crests-are-a-fourth-keep-list.md)).
    ⚠ It shipped because 0085 §1 asserted the crest was "already warmed by
    `crests.ts`" and nothing ever checked — the widget kept drawing crests from
    a timeline rendered before the sweep, so the damage was invisible until a
    card rendered fresh on a lock screen. ⚠ Keeping too much is disk; deleting
    too much is artwork missing ninety minutes later, with nothing in any log.

59. **⚠⚠ ANYTHING layered directly behind a LIQUID-GLASS card shows through
    it — text ghosts, and even a featureless slab GLOWS.** The NEXT UP deck
    hit this twice ([0113](./decisions/0113-same-day-next-up-deck.md)). First
    build: full cards behind the lead under a dimming scrim — the under-card's
    kickoff double-exposed straight through the lead's `GlassView`; blur does
    not hide what is behind glass, it smears it into legibility. Second
    build: featureless full-height shells — and their fill + dimmed ring
    still glowed a light band across the lead's head row, washing out the
    venue text on the bright crown; cut to slivers, the peeks read as a
    pasted near-black slab. ⚠ The real fix was the SURFACE, not the layers:
    deck cards render `NextUpCard surface="opaque"` (Ed's call — "remove
    transparency from this card only"), and on an opaque lead the waiting
    cards are simply visible, scrim-dimmed, mock-exact. ⚠ The rule for every
    future glass surface stands: a glass card may refract ONLY the screen's
    own ground — gradient or mesh — never a sibling layer, however
    featureless it looks on a dark backdrop. If a design needs layers under
    a card, the card goes opaque.

---

## Where things stand

### Done and verified
- **Starting XI portraits on the pitch and the rail** ([0072](./decisions/0072-xi-portraits-on-the-board.md)):
  number badge on the corner, number token for a null or failed photo.
  `/_debug/xi` breaks two portraits on purpose.
- **XI export saves again** ([0073](./decisions/0073-xi-export-render-in-context.md)):
  SDK 57 removed `saveToLibraryAsync` from `expo-media-library`'s root entry
  and left a stub that throws; `Asset.create` is the call. Confirmed by tap
  2026-08-30. Read runtime errors with `xcrun simctl spawn booted log show
  --last 10m --predicate 'process == "AltaGamaFC"'` — no Metro terminal needed.
- **Export card: GK caption no longer clipped** ([0075](./decisions/0075-card-caption-reserve.md)):
  `PitchSlots.insetBottom` + `CARD.captionReserve`. ⚠ A taller caption means a
  bigger reserve — it is measured, not derived.
- **The export's receipt state** ([0074](./decisions/0074-export-receipt-state.md)):
  Save flips to an outline "✓ Saved to Photos", disabled until the size, title
  or lineup changes; lime `StatusBanner`; success haptic.
  `/_debug/xi?status=saved|denied|failed` shows the three states.
- **Today's news card leads with its picture** ([0071](./decisions/0071-today-news-card-lead-picture.md)):
  `NewsLead variant="compact"`, no kicker. `/_debug/gallery?only=news` opens
  with the two card states.
- **News screen is a front page** ([0070](./decisions/0070-news-front-page.md)):
  lead + tiles + hairline rows on the first day group. ⚠ The `N NEW` pill reads
  the seen stamp captured at open, not the live preference — see trap 41.
  `/_debug/gallery?only=news` is the screenshot path.
- **FINISHED TODAY rows are a stacked pair** ([0069](./decisions/0069-finished-today-stacked-rows.md)):
  home over away, fixed goal column, no `FT` word. ⚠ Nothing may be added to the
  right of the goals without re-measuring `Borussia Mönchengladbach` at 393pt.
  `/_debug/gallery?only=finished` is the screenshot path.
- **Club-colour wash on the next-up card and the club header**
  ([0068](./decisions/0068-club-colour-wash.md)): `lib/cronogol/club-wash.ts`
  tames `colorPrimary`/`colorSecondary` (harness-proven, 16 assertions); a
  `WashGradient` atom on `react-native-svg`; `/_debug/gallery` shows the four
  states. ⚠ Only LaLiga and Bundesliga carry colours — a Premier League or
  Serie A card renders exactly as before, and that is correct.
- **League header bands in FINISHED TODAY** ([0062](./decisions/0062-league-header-bands.md)):
  `LeagueBand` in `@/constants/theme`, keyed by API slug; Serie A's gradient via
  `react-native-svg`. ⚠ Not yet seen on the simulator — check the first band's
  top corners clip under the card radius and the Svg does not eat row taps.
- Phases 1–3 of the plan: foundation, all read-only screens, follows, sheets,
  onboarding, both languages.
- Push: registration, local reminders, deep-link routing — verified on the
  simulator build `7f90c3d6`, then **end-to-end on a physical device**
  (build `9a8ca060`): real APNs token obtained, registered, and a push from
  `senpai-backend`'s probe **delivered to the phone**. See
  [GO-LIVE.md §5](./GO-LIVE.md).
- The production push contract, exercised with a synthetic token that was deleted
  afterwards: 200 / uppercase 400 / unknown slug 404 / DELETE 204.
- Clubs browses every league behind the Matchdays filter row
  ([0032](./decisions/0032-clubs-browse-by-league.md)) — verified on the
  simulator switching LaLiga → Premier League. ⚠ Search stays global and hides
  the row; only the browse list waits on the roster, or switching league blanks
  the screen under the reader's finger.
- **Rich notifications — the whole of `handoff_notifications/`, both directions**
  ([0037](./decisions/0037-rich-notifications-server-composed-crests.md)),
  built and verified on hardware 2026-08-26 (build `cdb69968`).
  - **`1a`, the composed crest thumbnail.** `senpai-backend` draws every crest
    (`GET /cronogol/fixtures/{id}/crest.png?slot=pair|home|away`) because ⚠ half
    our leagues cannot be rasterised on the device at all — Bundesliga publishes
    SVG only, Serie A publishes WebP. Server pushes get it through a Notification
    Service Extension; the local reminder attaches a file cached at schedule
    time, since ⚠ a local notification can never invoke an NSE.
  - **`1b`, the long-look card.** A Notification Content Extension, all three
    variants: reminder, moved (`was → now`), postponed (`NO NEW DATE`). The NSE
    leaves both crests in the App Group and the card reads them off disk.
  - `@bacons/apple-targets` adopted, Swift in `targets/` and ⚠ **never** a
    committed `ios/` ([0025](./decisions/0025-widgets-deferred.md)). Three bundle
    IDs now; `ios.appleTeamId` is `8Q5L5A2M62`.
  - Proven on device: the attachment on both a real-crest and a lettered-tile
    fixture, the App Group hand-off between two processes, `ALTAGAMA FC`,
    a derived `TOMORROW`, the `Open club` action, and ⚠ **`apns-collapse-id`
    REPLACING rather than stacking** — one current card for a fixture that moves
    twice, which is what stops a wobbling kickoff from spamming a reader.
  - ⚠ **Nothing about APNs changed.** Same `.p8`, same device token, same
    `apns-topic: com.altagamafc.app` — extensions never appear on the wire, iOS
    invokes them locally. No second APNs key was created (the account caps at 2).
  - ⚠ One bug found and deliberately deferred: **a tapped notification lands on
    Today**, open item 3 below.
- **The widgets ship** (2026-08-27, [0047](./decisions/0047-widgets.md)) —
  `NextFixtureWidget` (small + the three Lock Screen accessories) and
  `YourWeekWidget` (medium), both configurable to one followed club or all of them.
  **Verified on the simulator**, with real production data for two followed clubs:
  - both sizes rendering real crests off the App Group, `NEXT · MD 1`, the crest
    pair, and `Thu 15:00 · Spotify Camp…`;
  - the countdown ticking **6m → 2m → 1m with the app closed** — minute-resolution
    timeline ENTRIES, and **not one reload spent** (see trap 20);
  - the played fixture **dropping out of both widgets the moment kickoff passed**,
    the small advancing to `NEXT · MD 3` / `2d 19h` / `Sun 11:00 · Bernabéu`;
  - a medium row tap deep-linking to **that row's** club page from a cold start.
    ⚠ Worth noting against open item 3: the notification path lands on Today, the
    widget path lands correctly. They are different mechanisms.
  - ⚠ **App Groups DO work in the iOS simulator** — this was an open question and
    it is now closed. What breaks them is building with `CODE_SIGNING_ALLOWED=NO`,
    which strips the entitlement so the container silently does not exist. That
    looks exactly like "the simulator does not support App Groups". It does.
  - ⚠ **NOT seen, by anyone:** the Lock Screen accessories and the Edit Widget
    club picker. Both are behind a long-press that cannot be driven from a script.
    They compile and are wired; nobody has looked at them.
  - **The medium row was redrawn 2026-08-28**
    ([0059](./decisions/0059-your-week-widget-names-both-sides.md)): both sides
    named home-first, the followed side in accent with a `HOME`/`AWAY` pill, and
    `SAT` over `21:00` on the right. Snapshot bumped to **v2**; every new field
    is optional in Swift. **Verified on an iPhone 17 Pro simulator** with four
    real clubs. ⚠ Names are CONTRACTED (`widgetName`: `R. Madrid`) — the full
    forms truncated one side or the other.
    ⚠⚠ **Superseded 2026-08-31 by [0086](./decisions/0086-week-widget-hero-and-rail.md)
    — see the entry below; that row no longer exists.**
- **The Starting XI builder is IN THE APP** (2026-08-29, [0065](./decisions/0065-starting-xi-builder.md)) —
  the whole of `handoff_squad-builder/`: a row on the club page (between the
  subscribe block and Fixtures / Players) pushing `/club/[slug]/starting-xi` —
  tap a slot, tap a player, rail filtered to the line, Shape / Look / Export as
  root-stack sheets, drag a placed token onto a teammate to swap, long-press
  for Swap / Remove / Player page, export a TRUE 1080-px card to the share
  sheet or Photos. Eleven formations; the spacing rule is asserted in code.
  `tsc`, lint (baseline unchanged), `expo export` and a **94-assertion
  harness** on `features/starting-xi/` are clean. ⚠ **Four new NATIVE
  modules** (`expo-haptics`, `react-native-view-shot`, `expo-sharing`,
  `expo-media-library`) — a dev client built before 2026-08-29 throws at
  import; rebuild first — **`preview` build `e5b4405e` (2026-08-29) carries all four**; install that. ⚠ `GestureHandlerRootView` is now the outermost view
  in `_layout.tsx`. ⚠ The club page is a FOLDER route now
  (`club/[slug]/index.tsx`); no `_layout` in it, on purpose. ⚠ The row
  enables off `players.length > 0`, not the league — squads exist for LaLiga
  AND the Premier League. ⚠ Placements key on the person `id`, never the
  shirt. ⚠ `tsconfig.json` excludes `handoff_*/**` — design source no longer
  gates `tsc`.
- **News is IN THE APP** (2026-08-29, [0064](./decisions/0064-news-card-and-screen.md)) —
  the whole of `handoff_news-card-page/`, phase 1: a NEWS card on the Today board
  (lead + two rows + `n NEW`, one tap) pushing `src/app/news.tsx` (chips ·
  TODAY/YESTERDAY groups · attribution line) and a `(sheets)/news-link` sheet
  that names the publisher before `Linking.openURL`. Reads the SAME `useNews()`
  the widget writer fills — one feed, three consumers. `tsc`, lint (baseline
  unchanged), `expo export` and a 20-assertion harness on `lib/cronogol/news.ts`
  are clean. **Verified on the simulator** (card, screen, sheet — see 0064 for
  what was and was not seen). ⚠ First-party rows drew a `STORY` chip until
  `articleTopic` learned that `categories[0]` is the editorial KIND there — the
  widget shared the bug. ⚠ Header is NEWS, not
  the handoff's AROUND YOUR CLUBS: the wire carries NO club slugs, so "Your
  clubs" is phase 2 (per-club fan-out). ⚠ Phase 2's in-app browser is one line
  in `features/news/open.ts` (`expo-web-browser` is already installed).
  ⚠ Preferences schema is **4** now (`newsSeenAt`); `FOLLOWED_RULE_VERSION`
  untouched.
- **The NEWS widget is built** (2026-08-28, [0061](./decisions/0061-news-widget.md)) —
  `systemLarge`, the whole of `handoff_news-widget/`: lead story with picture, three
  headlines, age derived in Swift. Global `GET /cronogol/news`, tap opens the
  publisher in Safari. `expo-image-manipulator` downscales each picture to
  924×348 before it reaches the App Group (`news/{id}.jpg`, `widget/news.json`).
  `tsc`, lint (baseline unchanged), `expo export` and a 14-assertion harness on
  `lib/cronogol/news.ts` are clean. **Verified on the simulator** with real
  MARCA/SPORT headlines — lead, gradient, topic chips, ages, no chip on a
  topicless row. ⚠ Not yet seen: cold-cache layout, empty state, Spanish, a tap
  reaching Safari. **`preview` build `94e46736` (2026-08-28) carries it** — the first build with `expo-image-manipulator`; install that, not an older client. ⚠ **`expo-image-manipulator` is a NATIVE module** — a dev client built before
  it throws on import, exactly as `react-native-svg` did (§3b). Rebuild first.
  `/_debug/widgets` has a News section that reads `news.json` back from disk.
- **Live scores reach the Today board** (2026-08-27,
  [0048](./decisions/0048-live-scores-on-the-today-board.md)). The in-progress card
  now has two paths: `/cronogol/live` with a real minute for LaLiga, and the ~3h
  fixture sweep — unchanged, `FeedAge` and all — for every other league.
  - `lib/cronogol/live.ts` is pure and **harness-proven, 25 assertions**: the
    10-minute cache-age cutoff, both selection tiers, `status: 'unknown'`
    withholding the minute, stoppage-inclusive minutes (`94`, never `90+4`), both
    stall tells, and every unparseable-stamp branch.
  - Contract checked against production: `400` on any undeclared query param, an
    empty list rather than a 404 on an unknown league, `max-age=10`, and
    `{"matches":[],"count":0,"polling":false}` — the normal answer.
  - Gates clean: `tsc`, `expo export`, and lint at its **unchanged 6-error / 9-warning
    baseline**.
  - ⭐ **VERIFIED against a real in-play match, 2026-08-28** — Racing v Elche,
    LaLiga, kickoff 17:00 UTC. Seen on the **simulator** and on a **physical
    device** via the `preview` build `12e1c602`. The `fixtureId` join holds against
    a real row: `/cronogol/live` and `/cronogol/fixtures` served the same
    `d70bfe7b…`, with the sweep still reading `scheduled` — which is exactly the
    case tier 1 exists for, now proven rather than argued.
  - ⚠ **`useIsFocused` under `NativeTabs` is unexercised.** It is the poll's gate;
    if it misreports, the app polls every 15s from a background tab. Confirm the
    network log goes quiet on a tab switch.
  - ~~⚠⚠ **KNOWN GAP — the card is hostage to the fixture window**~~ — **CLOSED
    2026-08-29** by [0066](./decisions/0066-live-card-reads-the-live-route-directly.md):
    `routeLive` builds the card from `/cronogol/live` alone, crests from
    `useTeams()` by slug. It bit exactly as predicted (trap 39) before it was fixed.
  - ~~⚠ **KNOWN GAP — `liveMinute` would render `0′`**~~ — closed in 0066; a
    literal `0` now returns null like the non-live cases.
  - ~~⚠ **`polling: false` was CONSTANT on a genuinely live match**~~ — **ROOT
    CAUSE FOUND AND FIXED IN THE BACKEND, 2026-08-28.** It was never an app
    question: `LiveSessionService.acquireLease()` stamped `lease_started_at`
    **once**, while `LiveReadService.isPolling()` reads that same stamp against
    the same 120s window — so a session running for hours reported itself dead
    from ~two minutes in. `senpai-backend@60b0ebf` renews the lease every poll
    cycle, and the renewal doubles as an ownership check.
    ⭐ **Verified in production at 18:39 UTC**: `polling: true` on Racing v Elche,
    the first `true` ever observed from this route.
    ⚠ **This does NOT reverse [0049](./decisions/0049-stall-is-lastseenat-not-polling.md).**
    `isStalled` still reads `lastSeenAt` alone. 0049 already says what a
    trustworthy flag would license — reinstating it as a **second** tell beside
    the stamp, never a swap back — and one afternoon's observation is not yet
    that. ⚠ The invariant it now rests on: `livePollIntervalMs` (30s) must stay
    comfortably under `liveLeaseSeconds` (120s).
    ~~⚠ The minute still lagged the wall clock (`minute: 4` at 17:07 on a 17:00
    kickoff); that half is unexplained and is a `senpai-backend` question.~~
    **Explained 2026-08-30** ([0078](./decisions/0078-kicked-off-lead-card.md)):
    the match started late. LaLiga's feed flips to in-play at the actual
    whistle, 2–5 min after the scheduled kickoff, and the minute counts from
    there. Not a backend question.
- **The push cron is ON** (2026-08-26, Render dashboard; `render.yaml:91` agrees).
  ⚠ It dispatches only what the ~3h sync newly detects, so silence is the normal
  state. Every notification seen on 2026-08-26 was hand-sent.

### Open — in priority order

0. **Front-end gaps** — see the section below. The Today board's lead states
   are now wired (0027); loading skeletons are the next most visible.
1. ~~**Widgets**~~ — DONE 2026-08-27, [0047](./decisions/0047-widgets.md).
   Both home-screen sizes, the Lock Screen accessories, and a per-club picker.
   Verified on the simulator; see "Done and verified" above for what was and was
   not seen. ⚠ ~~The remaining widget work is a device build~~ — **that profile is
   minted.** `widget phase 2` landed 15:44 on 2026-08-27 and the `preview` build at
   15:51 the same day succeeded with the widget target in it, as did `12e1c602` on
   2026-08-28. The third bundle id (`com.altagamafc.app.widget`) signs. What is
   still unseen is the widgets themselves ON a device — only the simulator has
   shown them.
1b. **`REMINDER_HORIZON_DAYS` is 21 over a 7-day dataset**, so it never binds:
   `selectReminders` filters `useUpcoming`'s seven days, and reminders therefore
   cover a week rather than three. Found while sizing the widget's own window
   (0047) and **deliberately not fixed there** — changing it changes the pending
   notification queue and deserves its own decision, not a drive-by in a widget
   commit.
1c. **The two notification targets are pinned at `deploymentTarget: 18.0`**, the
   plugin's default, while the app runs on 16.4. That silently means no
   long-look card for a reader on iOS 16.4–17.x. The widget target is at 17.0 by
   deliberate choice (0047); the notification pair was left alone because they
   are verified on device and this is not a widget change.
2. ~~**Device build**~~ — DONE 2026-08-26. `development` profile, ad-hoc, so a
   **production** token ([0026](./decisions/0026-apns-environment-is-the-provisioning-profile.md)).
   ⚠ The two extension targets each needed their own provisioning profile; the
   existing `.p8` was reused and **no second APNs key was created** (the account
   caps at 2 and one is spent). `ios.appleTeamId` is now `8Q5L5A2M62`.
3. 🐛 **BUG — tapping a notification lands on Today, not the club page.**
   Reproduced on device 2026-08-26, build `cdb69968`: tapping `Open club` on a
   `kickoff_moved` push opens the app on the Today tab. `deepLink` in that
   payload was `altagamafc://club/barcelona`. **Deferred to a later session by
   decision, not overlooked.**

   Ruled out, with evidence:
   - **Not the `actionIdentifier` filter.** `wantsRoute` accepts `open_club` and
     `DEFAULT_ACTION_IDENTIFIER`, and `NotificationRecords.swift:457` maps iOS's
     `UNNotificationDefaultActionIdentifier` onto exactly the string the JS
     constant holds. Both branches pass.
   - **Not `routeFor`.** Its regex matches `altagamafc://club/{slug}` and it is
     harness-proven across nine payload shapes ([0024](./decisions/0024-push-enabled.md)).
   - **Not `OnboardingGate`.** It only redirects while `!onboarded`, and this
     device is onboarded with a followed club.

   ⚠ **Leading hypothesis: the navigation is fired before the navigator is
   ready, and silently dropped.** `<PushSync />` is a SIBLING of `<Stack>` and is
   declared *before* it (`_layout.tsx:28`), so its effect runs before the
   navigator mounts its screens. `OnboardingGate` gets away with the same
   position only because `useSegments()` re-runs it once routing exists;
   `usePushSync`'s tap effect depends on `[router]` alone and fires once, on
   mount. A cold-start tap resolves `initialRoute()` into a `router.push` that
   has nothing to push onto, and the app settles on its default route — Today.

   To settle it: log inside the `.then` and inside `onNotificationTap`, then
   compare a COLD tap (app killed) against a WARM one (app backgrounded). If
   warm works and cold does not, it is the race above and the fix is to defer
   until routing is live — not to change `routeFor`.
4. ~~**Backend push cron**~~ — **ON since 2026-08-26**, set in the Render
   dashboard; `render.yaml:91` already reads `'true'`, so the two agree and a
   Blueprint sync will not revert it.
   ⚠ **"On" does not mean alerts are imminent.** The pass dispatches only what
   the ~3h fixture sync has newly detected — a kickoff moved, postponed,
   confirmed, TBD or reinstated. Those are genuinely rare, so days can pass with
   nothing sent, and that is the system working. Every push seen so far this
   session was hand-sent; the cron removes the last manual step, it does not
   create traffic.
   ⚠ Cadence is `:15` and `:45`, offset so it never stacks on the hour crons.
5. ~~**Live Activity**~~ — **BUILT 2026-08-28**, dark
   ([0055](./decisions/0055-live-activities-broadcast-channels.md),
   [0057](./decisions/0057-local-expo-module.md); backend `0034`). Broadcast
   channels, one per fixture, iOS 18+. The card REPLACES the goal banner for a
   device that has one.
   ⚠ **ALL FOUR FLAGS ARE NOW ON — 2026-08-31** (backend decision `0038`).
   `CRONOGOL_LIVE_CRON_ENABLED`, `CRONOGOL_LIVE_PUSH_ENABLED`,
   `CRONOGOL_LIVE_ACTIVITY_ENABLED` and `CRONOGOL_LIVE_ACTIVITY_DRY_RUN=false`.
   The dry-run matchday the backend's `render.yaml` named as the gate was
   deliberately skipped — one device holds a push-to-start token and it is ours,
   so the wrong-card-on-a-stranger's-lock-screen failure is unreachable. ⚠ That
   reasoning expires when a second device registers one.
   ✅ **RENDERED ON A REAL DEVICE 2026-08-31** — production channel create,
   push-to-start, broadcast update and end, via `probe-apns.mjs --start
   <pts-token> --production`. Two bugs stood between "flags on" and that card,
   and NEITHER was a flag: backend
   [0039](../../senpai-backend/.claude/decisions/0039-apns-management-ports-are-not-symmetric.md)
   (management port 2196 on production, not 2195) and
   [0083](./decisions/0083-eas-capability-sync-strips-broadcast.md) (every
   `eas build` disables the Broadcast capability). See traps 46 and 47.
   ⚠ **Still unproven: the REAL path.** The probe drives APNs by hand; nothing
   has yet started a card off a live match. First opportunity is **Valencia v
   Barcelona, 2026-09-06 14:15Z**, and ⚠ it needs the 0039 fix DEPLOYED to
   Render — it is a source constant, not an env var.
   ⚠ On that match, watch for 0085's two unverified claims: the card appearing at
   **~T−10 rather than at the whistle**, and the pre-match state surviving to
   kickoff **without greying** (the `staleAt` fix). Both fail silently.
   ⭐ **REDESIGNED 2026-08-31** ([0085](./decisions/0085-broadcast-card-redesign.md);
   backend `0040`) from `handoff_alerts-redo/` — the floodlight "broadcast card",
   two states, scorer columns. ⚠⚠ **The card now starts at ~T−10 rather than at
   the whistle**, which is what gives the pre-match state (form, points, kickoff
   time) a lifetime at all — and which needed a kickoff-aware `stale-date`,
   because the old 8-minute one greys the card BEFORE the match it advertises.
   ⚠⚠ **The band carries ONE scorer line a side.** The design as drawn measures
   **203.5pt** against Apple's ~160pt Lock Screen cap; two rows land at 159.5pt
   with zero margin, one line lands at 152.5pt. ⚠ The obvious trim — crests
   46→40 — saves EXACTLY NOTHING: the crest never binds the fixture row, the
   abbr-and-tag column beside it is 53.5pt. Measure before trimming.
   ⚠ The handoff's own `BroadcastActivity.swift` is a design artifact, not a
   port: a second incompatible `MatchAttributes`, `AsyncImage` crests (no network
   in that process) and `Image("goal-glyph")` from an asset catalog no target
   has. Read `BROADCAST-WIDGET.md` for the tokens, not that file for the code.
   ~~⚠ **Cosmetic:** `Side` draws `Text(abbr)` beside `CrestView`, whose fallback
   tile ALSO draws the abbr — `ATH ATH 1`.~~ **Fixed in 0085** — `CrestView` grew
   `showsAbbr`, and the card passes `false`.
   ✅ **THE REDESIGN RENDERED ON A REAL DEVICE 2026-08-31** — build `5499ecc4`
   (commit `470d75c`), all four states via `probe-apns.mjs --start --production`,
   no clipping. ⚠ That proves the DRAWING and the WIRE and nothing else: the
   probe supplies its own `RenderableActivity`, so the standings query, the
   `matchweek` column and the feed's real scorer names are still unexercised —
   and the T−10 start and kickoff-aware `stale-date` **cannot** be proven by a
   probe at all, because both are about WHEN the server acts.
   ⭐ **`probe-apns.mjs` now builds its card from the COMPILED MAPPER**
   (`dist/cronogol/live-activity.mapper.js`) instead of two hand-written
   literals, and looks the push-to-start token up from `device_tokens` instead of
   telling you to read it off `_debug/push` — which prints only the LENGTH, so
   that instruction was impossible. ⚠ Run `npm run build` in the backend first;
   a stale `dist/` probes the wrong contract. ⚠ This is trap 48 in reverse: the
   old literals described the pre-0040 contract, so the probe would have drawn
   the new card with every new field nil and made a working feature look dead.
   ⚠⚠ **The broadcast capability is a MANUAL Apple Developer portal step** —
   under Push Notifications on `com.altagamafc.app`. EAS capability sync does
   NOT cover it, and without it every channel create fails.
   ⚠ **First real Swift typecheck is `expo prebuild`**, and it now has a THIRD
   native input: `modules/live-activity/`, the app target's only Swift. A
   prebuild that skips it produces an app that compiles, runs, and never reports
   a push-to-start token.
   ⚠ `.claude/LIVE-ACTIVITIES.md` and 0054 both carry claims 0055 corrects —
   read 0055 first, not them.
6. ~~**Accounts**~~ — **shipped 2026-08-26**, Apple + Google, sign-in optional
   ([0038](./decisions/0038-accounts-apple-and-google.md),
   [0039](./decisions/0039-auth-goes-direct-to-supabase.md)). Guideline **4.8**
   turned out not to be a backend project at all: the backend authenticates
   nobody, and native-only Apple needs no Services ID or `.p8`.
   ⚠ **Built successfully 2026-08-26** with the Sign In with Apple entitlement
   ([build efdb732c](https://expo.dev/accounts/emedina24s-team/projects/alta-gama-fc/builds/efdb732c-94ed-4430-aa4a-efee47a59b1e)),
   but **not yet exercised on a device**. The nine checks below are still open.
   ⚠ **Reinstalling still loses the follow list.** Signing in does NOT sync
   follows: the backend has no follows endpoint, and the web derives them from
   claimed feeds, which 0019 excluded and 0038 did not add back.
   ⚠ **`AUTH_REQUIRED`** in `features/auth/capability.ts` is the seam for making
   sign-in mandatory. Flipping it also makes 5.1.1(v) unavoidable and needs the
   sign-in sheet re-presented without its `Close`.
   **Email/password added 2026-09-01**
   ([0103](./decisions/0103-email-password-sign-in.md), reversing 0038's "no
   email/password" clause): a quiet third option on the sign-in sheet pushes
   `(sheets)/sign-in-email`. Confirmation and reset links land on the WEB's own
   pages (`altagamafc.com/{locale}/auth/callback` and `/reset-password`) — no
   native deep links, no Supabase config changes. The Google button also gained
   Google's official mark (`atoms/google-mark.tsx`). Checks 10–12 below are new
   and open; `/_debug/sheets?which=email-auth` (+`&state=notice|error|resend`)
   previews the form's hard-to-reach states.
7. **App Store prep** — privacy nutrition labels. ⚠ **This changed with 0038** and
   the old answer is now wrong: it is no longer "device-keyed, **no account**".
   Collected: an APNs token and followed club slugs (device-keyed), **plus email
   and display name linked to an account** for readers who sign in. Sign in with
   Apple's Hide My Email means some of those addresses are
   `@privaterelay.appleid.com`.

   **Before the first build that ships auth:**
   - Enable **Sign In with Apple** on `com.altagamafc.app` in the Apple Developer
     portal, and rebuild — the entitlement changes the provisioning profile.
   - Supabase → Providers → **Apple** → enable, add `com.altagamafc.app` to
     *Client IDs*. Leave Services ID and Secret Key empty.
   - Supabase → URL Configuration → **Redirect URLs** → add `altagamafc://auth-callback`.
     ⚠ An unlisted value does not error — Supabase falls back to the Site URL, so
     Google sign-in lands on the website and the app never hears back.
     `/_debug/auth` prints the exact string to paste.
   - The Apple Sign In **entitlement is verified to generate correctly** — a
     `prebuild` on 2026-08-26 produced `com.apple.developer.applesignin` alongside
     the existing App Group, and the `altagamafc` URL scheme the Google redirect
     needs. ⚠ That proves the CONFIG, not the account: the capability still has to
     be enabled on the App ID or the build fails to sign.

   **Then verify on a PHYSICAL device** (Apple Sign In is unreliable in the
   simulator, and push already needs one — `getDeviceToken()` returns `null` on
   `!Device.isDevice`). `/_debug/auth` drives all of this:
   **Progress 2026-08-26** (build `efdb732c`, one iPhone). Items 1–5 partly done;
   **6–9 are untouched and 7 is the one that would ship broken.**

   1. ~~**Apple, first ever sign-in**~~ — **PASSED**, and it found a bug.
      `displayName: "Edgardo Medina"` reached `GET /cronogol/me`. But the response
      also carried `timeZone: "America/New_York"`, which **this app never
      writes** — so the account already existed on `altagamafc.com` and Supabase
      linked the Apple identity to it by matching verified email.
      ⚠ **That is the general case, not an edge case:** "first authorization" is
      once per Apple ID **per APP**, so every web user signing in here for the
      first time hits it against an established account. `apple.ts` was sending
      `notifyFixtureChanges: false` unconditionally and silently switching off
      their fixture-change emails. Fixed in `7b3e09a` — reads the account first,
      echoes the flag back, writes `displayName` only when there is none.
      ⚠ **Re-test needs a revoke:** Settings → Apple ID → Sign in with Apple →
      AltaGama FC → Stop Using. Otherwise `fullName` is null and the branch never
      runs. **Still unproven: the true new-account path** (no prior web account).
      ⚠ Ed's own `notifyFixtureChanges` reads `false` and may have been clobbered
      by the old code — re-enable on the web if it was on. There is no UI here.
   2. **Apple, second sign-in** — sign out, sign in again. `fullName` is `null`
      now; the name must still render, read back from `/cronogol/me`.
   3. **Hide My Email** — check the identity slot does not overflow.
   4. **Google** — the browser sheet returns to the app. ⚠ Landing on the website
      instead means the redirect URL is missing from Supabase, not broken code.
   5. **Push linking** — ⚠ **INCONCLUSIVE, needs re-checking.** The device
      answered `push → "unchanged"`, which is what a diff with nothing to send
      says — and that is the CORRECT answer once the sign-in effect has already
      auto-registered. But it is indistinguishable from a link that never
      happened. `/_debug/auth` grew a **`Linked to this account?`** button
      (`7b3e09a`) that settles it: the linked id is persisted ONLY when the
      server's response says `linked: true`.
   6. **Cancel paths** — dismiss the Apple sheet and the Google browser. Both must
      land back signed-out silently, with no error banner.
   7. **Follows survive sign-out** — follow three clubs, sign in, sign out. All
      three must still be there. This is trap 24 and the one that would ship broken.
   8. **Delete account** — two-step confirm → 204 → signed out. Re-run the same
      `DELETE`; it must 204 again.
   9. **Token expiry** — background past the ~1h access-token lifetime, foreground,
      confirm `/cronogol/me` still resolves rather than bouncing to signed-out.
   10. **Email create → confirm → sign in** (0103; works on the simulator) —
       Crear cuenta with a throwaway address must show the neutral "Revisa tu
       correo…" notice with the resend button locked, NOT an error; the mail's
       link lands on `altagamafc.com/{locale}/auth/callback`; back in the app,
       Entrar must dismiss both sheets onto a signed-in account sheet.
       ⚠ If dismissing the two stacked sheets at once misbehaves, the fallback
       is `router.dismissTo('/(sheets)/account')` in `(sheets)/sign-in-email.tsx`.
   11. **Unconfirmed branch** — Entrar before confirming must render the
       neutral `confirmFirst` notice + resend (60s lock), never a red error.
       Wrong password and an unknown address must both print the SAME
       `errorInvalidCredentials` line.
   12. **Uniform reset notice** — "¿Has olvidado la contraseña?" with a known
       AND an unknown address must show the identical `resetSent` notice
       (enumeration resistance; the rejection is swallowed on purpose).

   Also verified in passing: `AUTH_AVAILABLE true` / `AUTH_REQUIRED false`, an
   access token present, the Google redirect rendering as
   `altagamafc://auth-callback`, and `GET /cronogol/me` correctly throwing
   `NotSignedInError` while signed out.

   ⚠ **Not on the list but worth a look while testing:** the account sheet signed
   IN — the identity block, Sign out, and the two-step Delete account — has only
   been seen in `/_debug/sheets?which=account-in` with a stub, never against a
   real account.


---

## ⚠ `npm run lint` now works — and it has never run before

`eslint.config.js` has been in the repo since the start, but neither `eslint` nor
`eslint-config-expo` was ever installed, so `expo lint` only ever answered
`Cannot find module 'eslint'`. Both were added as devDependencies on 2026-08-26.

It immediately earned it. `tsc` had passed on a **duplicate `export interface
AccountView`** in `lib/cronogol/types.ts` — TypeScript *merges* same-named
interface declarations rather than erroring, so a second one appended to that file
silently widened the first instead of failing. Lint caught it as
`import/export`. ⚠ Worth remembering generally: `tsc --noEmit` is not a
duplicate-declaration check.

**6 errors remain, all pre-existing and none in auth code.** Left alone
deliberately — they are unrelated to accounts and each deserves its own look:

- `components/molecules/feed-age.tsx:30` and two spots in `_debug/gallery.tsx` —
  `Date.now()` called during render (`react-hooks/purity`). The one in
  `feed-age.tsx` is on a real screen, not a debug one.
- `(tabs)/matchdays.tsx:60`, `_debug/push.tsx:59`, `_debug/skip-onboarding.tsx:12`
  — `setState` synchronously inside an effect (`react-hooks/set-state-in-effect`).

Plus 9 warnings (unused vars, duplicate imports). `--fix` handles 2.

## Front-end work outstanding

The five screens are built and running on live data, but several designed states
are unbuilt or stubbed. Audited 2026-08-25 against `handoff_AG-ios/SPEC.md`.
Ordered by what a user would notice first.

### 1 · ~~The Today board is missing two of its three lead states~~ — DONE 2026-08-25

Wired in [0027](./decisions/0027-board-lead-cards-from-fixtures.md): both the
live and last-result cards read `/cronogol/fixtures` (a 14-day `recentBounds`
window plus today's), selected by `lib/cronogol/board.ts` — pure, harness-proven.
`useScoreboard` is gone; **the app's UI no longer reads `/cronogol/scores`**.
⚠ The score-age line now says "as of the last check · roughly every 3h" — the
fixture route has no per-row stamp, and our own fetch time would understate it.
Last-result card verified on the simulator (Elche 0–5 Barcelona, `V` pill); the
live card has not been seen against production yet — no fixture was in play.

### 2 · ~~Loading states are a literal `…`~~ — DONE 2026-08-25

All six sites render `SkeletonRows` at `Size.rowSkeleton`. `Skeleton` now honours
Reduce Motion (`useReducedMotion` → steady opacity), which closes that bullet of
item 7 too.

### 3 · ~~Matchdays header is incomplete~~ — DONE 2026-08-25

Built as `molecules/matchday-pager.tsx` ([0028](./decisions/0028-matchday-pager.md)):
prev/next squares on their own row under the title, range + count right-aligned.
The screen owns ONE clamped `goTo(n)` that the strip and both arrows call — there
is no second state. The range is gated on `kickoffsConfirmed`; a provisional round
prints `datesPending` and drops the zone with it. `formatDateRange` collapses
shared parts to the right and is harness-proven (same day / same month / cross
month / cross year, EN + ES).

Verified on the simulator: jornada 1 `SÁB 15 — JUE 27 AGO 2026` (the deferred-opener
span), jornada 5 `FECHAS POR CONFIRMAR · 10 PARTIDOS`, prev disabled on 1, next
disabled on 38. ⚠ Not yet seen in English or at large Dynamic Type.

Picked up on the way: `Size.pill` now holds the 34pt square for the strip and the
pager, and the strip's accessibility label is localised (it was hardcoded English).

### 3b · ~~Expanded match events~~ — DONE 2026-08-26

The whole of `handoff_event-expansion/`, built to
[0045](./decisions/0045-match-events-expanded-row.md). A finished match expands
in place into its timeline — goals with assists, cards, substitutions, VAR and
missed penalties, on `GET /cronogol/fixtures/{id}/events`, fetched on expand.
⚠ Three divergences from the design, each with a reason in the ADR: the **live**
card takes no chevron (in-progress matches have no events at all, so design rule
3 cannot be built) and the **last-result** card takes one instead; disclosure is
gated on **status, not data**, because gating on data means pre-fetching a whole
matchday; and all six wire types are drawn, not four.

⚠ **The first of those three was reversed on 2026-08-28** —
[0050](./decisions/0050-match-events-on-the-in-progress-card.md). The
in-progress card expands too now. Its premise expired rather than being wrong:
the upstream **does** publish the timeline during play, so an in-play match
having no events is a gap in our ingest, not a fact about football. ⚠⚠ **Nothing
serves it yet**, so that panel opens on *"aren't published yet"* on real data —
by design, and the state LIVE-SCORES.md §6 has been asking us to render
explicitly. The other two divergences stand.

⚠ **`react-native-svg` is now in use** — its first import in `src/`, for the
event glyphs and the chevron. It autolinks, so no config changed, but it is a
NATIVE module: a dev client built before it was declared throws rather than
degrading. `/_debug/gallery` carries the case that checks it, plus every glyph
and every null.

Verified on the simulator against production: LaLiga jornada 1 expanded, crests
per side, `45+3′` intact, the panel bleeding to both gutters, scheduled rows with
no chevron, and the board's last-result card (Elche 0–5 Barcelona).
⚠ **`FINISHED TODAY` was not exercised** — there were no finished matches that
day, so the section renders its quiet state and there is nothing to expand. It
shares `MatchEvents` with the two surfaces that were exercised, but its own row
geometry has only been seen in code.
⚠ Player links are deferred deliberately (§6 of the API doc): `player.slug` is a
PLAYER slug and ADR 0033's sheet keys on `{club slug, person id}`.

### 3c · ~~Event grouping tabs~~ — DONE 2026-08-27

`handoff_event-groups/`, built to
[0046](./decisions/0046-match-events-grouping-tabs.md). The panel from 3b now
opens on a four-segment counted control — `Goles · Tarjetas · Cambios · Otros` —
and shows one group at a time. It was twenty rows on a busy match, which pushed
the matches under it off screen.

⚠ **Four groups, where the design asked for three.** It was written against its
own four-kind model; ours is eight, and 0045 decision 1 forbids dropping a row,
so `var` / `missed-penalty` / `unknown` need somewhere to go. **`groupOf`'s
`default:` branch is the guarantee** — a ninth mark lands in `other` and is still
read. Never expand it into an exhaustive list of cases.

⚠ **The tabs replaced the eyebrow**, but `showTitle` did NOT go away — it now
gates on `events.length === 0`, so `MATCH EVENTS` still labels the pending, error
and not-published states. `match-board.tsx` still needs its `false`.

⚠ **The active group is derived from a nullable pick, not stored**, and there is
no `useEffect` in this feature. Seeding state with a group needs an effect to
correct it when the fetch lands, which flashes an empty `Goals` on a 0-0 with two
bookings. Resetting per match is free for the same reason — the component
unmounts with its row.

⚠ `Size.eventTab` is **28, under `minTouch`**, with `hitSlop` making up the
difference. The only control in the app that paints under the minimum; a 44pt
track spends the height the grouping won back.

⚠ `handoff_event-groups/EventTabs.tsx` is a **reference, not the shipped
mapping** — its `groupOf` files `own-goal`, `var`, `missed-penalty` and `unknown`
into `cards`. Read it for the values and the behaviour only.

Typecheck and lint clean (baseline unchanged: 6 pre-existing `Date.now()` purity
errors, none in the touched files). ⚠ **Not yet exercised on the simulator** —
`/_debug/gallery` carries a live tab case and a dimmed-`0` case, but the real
panel on real data has not been opened since the change.

### 4 · Today's stat tiles (SPEC §3.1 item 4)

Two tiles under the upcoming section — subscribed count → Clubs, feed count →
account sheet. Not built. (The upcoming section itself is done, and was
restyled on 2026-08-26 —
[0043](./decisions/0043-upcoming-cards-name-the-sides.md), superseding
[0029](./decisions/0029-upcoming-rows-read-from-the-followed-club.md): one card
per match, `MD n · ground` as the eyebrow with `TONIGHT` accent opposite it, the
two sides NAMED and stacked home-lit over away-dim, kickoff over its absolute
date on the right. ⚠ `formatRelativeDay` must never see a `kickoffTbd` row —
midnight-UTC would claim "tonight" for a match with no kickoff. ⚠ Only today is
named now; the `tomorrow` copy key is no longer rendered anywhere.)

### 5 · The account avatar exists on one screen

**Half done 2026-08-26.** The product answer arrived with accounts
([0038](./decisions/0038-accounts-apple-and-google.md)): `useIdentityInitials()`
derives them from `displayName`, falling back to the email's local part, and
`AvatarButton` now takes `string | null` and draws a neutral mark when signed out.
⚠ **Still only on Today.** The design puts it in every tab header, and that part
is unchanged — it is now plain wiring, with no product question left in it.

### 6 · ~~Onboarding club picker is 2-up, SPEC §3.7 says 3-up~~

Done 2026-08-30 in the onboarding redesign ([0076](./decisions/0076-onboarding-floodlight-redesign.md)).

### 7 · Accessibility pass

- ~~`Skeleton` pulses unconditionally~~ — honours Reduce Motion since 2026-08-25.
- Dynamic Type is inherited (system font, no `expo-font`) but has not been tested
  at large sizes; the table's fixed column widths are the likely first casualty.
- Hit targets were built to 44pt but not audited.

### 8 · Polish

- ~~`expo-haptics` is **not installed**~~ — it has been a dependency since the XI
  builder (ADR 0065), and since ADR 0081 every haptic lives in `lib/haptics.ts`,
  still the one file that imports it. ~~The design's haptic on
  **follow/unfollow**~~ — built 2026-08-31 on the Clubs screen's follow pill
  ([0082](./decisions/0082-clubs-screen-rail-redesign.md)). There is no
  unfollow on that screen any more, so `hapticToggle()` fires on follow alone.
  `NativeTabs` already gives tab haptics free.
- The Today eyebrow reads only a weekday. The design pairs it with a matchday —
  deliberately not built, because the board spans four leagues and no single
  matchday is true of all of them. **Needs a product call**, not a fix.

### Known gaps, deliberately
- ⚠ **Live scores are LaLiga-only, and live match EVENTS do not exist YET.**
  `/cronogol/live` (2026-08-27) covers LaLiga alone — every other league renders
  exactly as it does today, so the non-live path stays the fallback rather than
  being replaced. Wired on Today only
  ([0048](./decisions/0048-live-scores-on-the-today-board.md)); Matchdays rows and
  the club page are the two other surfaces keyed on `fixtureId` and are unbuilt. And `/cronogol/fixtures/{id}/events` is still a 3-hourly
  sweep: the expanded-row timeline ([0045](./decisions/0045-match-events-expanded-row.md),
  [0046](./decisions/0046-match-events-grouping-tabs.md)) does **not** fill in
  during a match. A live scoreline beside an empty timeline is the expected
  shape — handle it explicitly so it does not read as a bug.
  ⭐⭐ **Backend §98 is now WRITTEN** (2026-08-28, later the same day —
  `senpai-backend/CRONOGOL.md` §98, its `decisions/0032`). This supersedes
  "planned": `/cronogol/live` gains a per-match `events` array, and the durable
  timeline is written **at the whistle** instead of ≤3h later.
  ⭐⭐ **DEPLOYED, and the app consumes it** (2026-08-28, same day —
  [0051](./decisions/0051-live-match-events-inline.md)). `/cronogol/live` carries
  a per-match `events` array; the in-progress card renders it through 0050's
  `supplied` seam, in one expression: `suppliedEvents: match?.events`.
  ⚠ **It took two deploys.** The first was red — the backend committed the
  migration and the code that reads `events` but not the regenerated
  `database.types.ts`, against a column not yet applied to the database. Exactly
  what that migration's own header warns about.
  ⚠ **`undefined` vs `[]` selects the source and must not be collapsed.**
  `undefined` (the sweep path, every non-LaLiga league) falls back to the durable
  `/cronogol/fixtures/{id}/events`; `[]` means the live route holds an empty
  timeline and the panel says so. Never default it to `[]`.
  ⚠ **`eventKey()` keys BOTH sources**, and not because live events lack an
  `id`: the panel swaps source at full time, and keying one on `id` and the other
  on an index would remount every row at that moment.
  ⚠ **0050's 60s durable-route poll is GONE** (`STALE.liveEvents`, the `polling`
  option). Events ride the 15s live poll now; the second poll would be a request
  a minute at a finished-only sweep that cannot have anything for a live match.
  ⚠⚠ **Never verified against a real scorer.** No LaLiga match scored while this
  was wired — Tenerife v Sporting was 0-0 at 6′ with `events: []`. The triggers,
  the full-time hand-off, and "the event set grows during play" are all still
  inferred. `/_debug/gallery` proves the rendering, not the feed. **This is the
  first thing to watch on the next matchday.**
  [LIVE-SCORES.md](./LIVE-SCORES.md) §2 (shape) and §5 (wiring).
- ⛔⛔ **Player STATISTICS do not exist, and match events are NOT them.** Squads
  carry identity only — name, position, photo, age — never appearances, season
  goals, minutes or xG. No source has them at any price point yet found, so this
  is a purchase, not a backlog item. §98 will let a live match say *who scored*;
  it will never say *how many they have scored this season*. Per the backend's
  own decision log this is "the claim most likely to be lost in retelling"
  (`senpai-backend/.claude/decisions/0030`).
- ~~**Serie A has no mark**~~ — **it does now.** `GET /cronogol/leagues` serves
  Serie A a `primary` **SVG**, portrait (~0.64:1) with a gradient, verified
  2026-08-31 ([0082](./decisions/0082-clubs-screen-rail-redesign.md)). LaLiga
  also serves a **`wordmark`** cut, which nothing reads — `leagueOptions`
  prefers `onDark → icon → primary` and every league row in the app uses it.
  ⚠ A vector can decode and still report no intrinsic size — size a mark off
  its measured ratio with a zero-guard, never off a hard-coded one.
- **Tables exist for all four leagues, not just LaLiga.** `/cronogol/standings`
  returns complete, `bandsApply`-passing tables for LaLiga, the Premier League,
  Bundesliga and Serie A, plus `segunda` — which has no `League` config and
  must be skipped wherever a rank is quoted, because five LaLiga-roster clubs
  actually sit in it ([0082](./decisions/0082-clubs-screen-rail-redesign.md)).
- **Qualification bands are unconfirmed for 2026/27** — coefficient-driven, worth
  checking against the real allocation before launch.
- **`venue.city` is null on LaLiga, and Bundesliga has no `venue` object at
  all** — re-probed 2026-08-31: the Premier League and Serie A both state a
  city, LaLiga states none on all 20 (but does state `venue.name`), and
  Bundesliga states neither. The club page derives the city from the first
  home fixture via `homeGround()`; a LIST cannot, so the Clubs browse row
  falls back `city → venue.name → nothing`
  ([0082](./decisions/0082-clubs-screen-rail-redesign.md)).
- **`threadIdentifier` is not settable from JS in SDK 57**, so a local reminder
  cannot join the server's `fixture-{uuid}` thread. Two notifications, not one.
- **The Today eyebrow shows only a weekday.** The design pairs it with a matchday,
  but the board spans four leagues and no single matchday is true of all of them.

---

## Working rules

- **Every decision gets an ADR** in [decisions/](./decisions/), written with the
  code. Reversals are new entries; the old one is marked superseded, never edited.
  See [AGENTS.md](../AGENTS.md).
- **Read the Expo 57 docs before writing code** — the SDK changed.
- **No colour, space or font literal in a component.** Everything through
  `@/constants/theme`.
- **Dependencies point downward:** organisms → molecules → atoms. Nothing below
  organisms fetches.
- **Verify on the simulator, not just `tsc`.** Every visual bug in this project so
  far — a truncated monogram, merged band rails, a wrong next-card layout, tab
  labels that never translated — passed the type check.
- **Pure logic goes in a module with no native import**, so it can be run in a
  plain-JS harness. That is how the push contract and reminder rules were proven
  before a build existed.
