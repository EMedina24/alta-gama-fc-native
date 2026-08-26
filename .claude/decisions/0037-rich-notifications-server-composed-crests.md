# 0037 — Rich notifications: the backend composes the crests, and the app grows two Apple targets

- **Date:** 2026-08-25
- **Status:** Accepted — **verified end-to-end on hardware 2026-08-26**
- **Decided by:** Ed Medina
- **Partially unblocks:** [0025](./0025-widgets-deferred.md)

## Context
`handoff_notifications/` specifies two surfaces: a standard notification whose
single attachment carries **both** club crests composed into one image (`1a`),
and a long-look match card shown on long-press (`1b`). Neither is possible with
what shipped in [0024](./0024-push-enabled.md) — the app sends four content keys
and nothing else.

Three facts decided the shape, and two of them are not in the design handoff:

1. **iOS allows exactly one attachment per notification**, so a home-and-away
   pair must be one composed file.
2. **A local notification cannot run a Notification Service Extension.** The
   kickoff reminder is scheduled on-device, so its artwork must already be on
   disk when it is scheduled.
3. ⚠ **Half our leagues cannot be rasterised on this device at all.**
   Bundesliga clubs publish `svg` and nothing else; Serie A crests are WebP.
   `UNNotificationAttachment` takes neither, and Swift has no decoder for either.

## Decision

**`senpai-backend` draws every crest.** One route —
`GET /cronogol/fixtures/{id}/crest.png?slot=pair|home|away` — returns a finished
PNG, including the lettered fallback tile for clubs whose artwork will not
decode. It already owns a complete pure-TypeScript PNG compositor
(`src/imaging/png-compose.ts`), which is the only such thing in the ecosystem.
The app and both extensions do nothing but download.

The backend half shipped the same day (`senpai-backend` `56f23da`, ADR 0029
there) and is **verified live**: the route answers 256×256 for `pair` and
128×128 for `home`/`away`, the plate is `rgba(12,15,18,.55)` on transparent
corners, and the two SVG/WebP leagues render lettered tiles rather than blanks —
Bundesliga `FCB`/`VFB`, Serie A `MIL`/`VEN`. A bad `slot` 400s, an unknown
fixture 404s. It also went further than the spec asked and put `homeAbbr` /
`awayAbbr` on the payload, so the card's tile letters and the plate's can never
disagree for a server push.

**`@bacons/apple-targets` is adopted**, with two targets in `targets/`:

- `notification-service` — attaches the composed plate to **server pushes only**,
  and leaves the two single crests in the App Group for the card. ⚠ Runs only
  when the payload carries `mutable-content: 1`, which the backend does not send
  yet.
- `notification-content` — the `1b` card, three variants off one payload.

**One action, `Open club`.** The design draws a second, `Mute this club`. Not
built: a mute needs an unfollow, a re-registration and a reminder re-arm, and a
background action cannot promise iOS keeps JS alive for the round-trip. The mute
lives where it can be confirmed.

**Artwork is bounded to the soonest 12 reminders** (`REMINDER_ARTWORK_BUDGET`).
The re-arm runs on every foreground, and 60 downloads per resume is not a thing
to do to a phone.

## Verified on device (2026-08-26)

Build `74b7991e`'s successor, `development` profile, production APNs token.
Both rich payloads sent with `mutable-content: 1` and a `category`:

- **The service extension ran** — both banners carried the composed plate.
  LaLiga showed real crests, Bundesliga the `FCB`/`VFB` lettered tiles. ⚠ This
  is the one thing no simulator can prove: `simctl push` never invokes an NSE.
- **The App Group hand-off works across processes** — the long-look card drew
  real Barcelona and Athletic crests, written by the NSE and read by the content
  extension.
- `WAS 3:00 PM → NOW 4:00 PM` converted correctly from the payload's UTC
  instants; `POSTPONED` drew the orange `NO NEW DATE` chip over a struck kickoff.
- The `Open club` action rendered, so the category registration holds on device.
- The card localised to the **device** language (English) while the alert copy
  was Spanish — correct: the card owns its own strings, the sender owns the
  alert. It also proves `en.lproj` resolves inside the extension bundle.

## Re-verified on build `cdb69968` (2026-08-26)

- `ALTAGAMA FC` on all three cards; the reminder card reads **`TOMORROW`** for an
  Aug-27 kickoff seen on Aug 26 — the exact input that previously read `TODAY`.
- ⚠ **`apns-collapse-id` REPLACES, proven.** The same fixture sent twice with a
  changed kickoff left ONE notification carrying the newer time (`NOW 5:00 PM`);
  the earlier `4:00 PM` was gone rather than stacked beneath it. This is the
  behaviour that keeps a repeatedly-adjusted fixture from spamming a reader, and
  it had never been exercised before.

## Known bug, deferred

⚠ **A tapped notification lands on Today rather than `/club/{slug}`** (device,
2026-08-26). The routing LOGIC is not at fault — `routeFor` and the
`actionIdentifier` filter both check out — so the suspicion falls on `<PushSync />`
firing `router.push` before the navigator is mounted. Full triage, including what
is ruled out and the experiment that would settle it, is in
[HANDOFF.md](../HANDOFF.md) open item 3. Deferred deliberately.

## Corrected after the device run

- ⚠ **`TODAY` was hardcoded on the reminder card** and demonstrably wrong: on
  2026-08-26 a card for an Aug-27 kickoff read `TODAY`. A reminder normally
  fires 30 minutes before kickoff so the label is usually right by timing, not
  by construction — a kickoff just past local midnight fires the evening before.
  Now derived, with `TOMORROW` and a weekday fallback.
- ⚠ **The card named no app.** `UNNotificationExtensionDefaultContentHidden`
  hides iOS's header along with the title and body, so an expanded notification
  carried no sender identity at all. Now carries `ALTAGAMA FC` — ⚠ **one word**;
  the design mock writes the RETIRED "Alta Gama FC" three times.
- The mock's 16pt icon beside the wordmark is **not drawn**, deliberately: the
  shipping mark is green-on-transparent while `radius 4.5` implies a filled
  tile, and embedding it would generate an `Assets.xcassets` into `targets/`.

## Consequences
- ⚠ **A category identifier is now a three-way contract with no validation** —
  `categories.ts`, the wire (`aps.category` / `categoryIdentifier`), and the
  extension's `UNNotificationExtensionCategory`. A mismatch shows no error
  anywhere; the card just never appears.
- ⚠ **`UNNotificationAttachment` MOVES the file it is given.** Everything handed
  to `scheduleNotificationAsync` is a copy (`crest-cache.ts`), or the cache
  empties itself on every fire.
- ⚠ **The card is a second source of truth, twice over** — `Tokens.swift`
  mirrors `theme.ts`, and `en.lproj`/`es.lproj` mirror nothing in `copy.ts`
  because an extension cannot read the JS bundle. Both will drift; there is no
  mechanism that would catch it.
- ⚠ **Two abbreviation rules now exist for the same club** — `abbreviateClub` in
  the backend and `abbreviate` in `derive.ts`. They agree on **all 78 clubs
  across the four leagues today** (every one has a plain 3-character
  `shortName`, checked against production), but they are not the same function:
  ours consults a `CLUB_CODES` table and keeps `shortName` verbatim, theirs
  folds accents and truncates to three. A club arriving with a longer or
  accented `shortName` would show one code on the banner plate and another on
  the card — and only for a LOCAL reminder, where the app fills `homeAbbr`
  itself. A server push takes both from the backend and cannot drift.
- **Three bundle IDs now, not one.** Extensions are separate signed binaries, so
  `…app.notification-service` and `…app.notification-content` each need their own
  App ID and provisioning profile with the App Group enabled. EAS says it plainly:
  *"They can share the same Distribution Certificate but require separate
  Provisioning Profiles."* ⚠ **Nothing about APNs changes** — the push is still
  addressed to `apns-topic: com.altagamafc.app` and iOS invokes the extension
  locally, so the same `.p8` and the same device token carry over. **Never accept
  an offer to create a second APNs key**; the account is capped at two and one is
  spent.
- `ios.appleTeamId` is now set to `8Q5L5A2M62`, which the plugin requires.
- ⚠ **Bundesliga and Serie A will show lettered tiles forever**, not as a
  degradation but as the design. Do not "fix" this by hot-linking a provider.
- `expo-file-system` is now a declared dependency; it was only transitive.
- ⚠ **`expo prebuild` rewrote `package.json`'s run scripts again** and they were
  reverted again, per trap 22 in [HANDOFF.md](../HANDOFF.md). Expect this every
  time a target change needs a prebuild.
- The App Group `group.com.altagamafc.app` now has its first real consumer, which
  is most of what [0025](./0025-widgets-deferred.md) was waiting to prove.
- ⚠ **Still no `threadIdentifier`.** SDK 57 keeps it output-only, so the
  divergence [0024](./0024-push-enabled.md) recorded stands unchanged.

## Alternatives considered
- **Compose in the service extension.** Cheaper — no backend route — but it
  cannot help the local reminder (no NSE), and it cannot draw Bundesliga or
  Serie A at all. It would have shipped a feature that works for half the app.
- **A single followed-club crest everywhere.** No composition needed anywhere,
  and all three alerts would look alike. Rejected: it is not the design, and it
  still leaves two leagues blank.
- **Ship `1a` only, no content extension.** The handoff's own recommendation for
  the reminder. Rejected because the two change alerts are exactly where
  *was → now* beats a sentence, and that is the card's whole argument.
