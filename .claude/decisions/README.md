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
| [0019](./0019-anonymous-v1.md) | Anonymous v1: follows are device-keyed, accounts designed-for | Superseded by 0038 |
| [0020](./0020-root-stack-wrapping-tabs.md) | Root layout is a `Stack` wrapping a `(tabs)` group | Accepted — sheets revised by 0030 |
| [0021](./0021-short-club-display-names.md) | Club names are shortened for display | Accepted |
| [0022](./0022-finished-today-from-fixtures.md) | `FINISHED TODAY` is built from `/cronogol/fixtures`, not the scoreboard | Accepted |
| [0023](./0023-phase-3-resequenced-no-apple-account.md) | Phase 3 resequenced around a pending Apple Developer account | Blocked half closed by 0024 |
| [0024](./0024-push-enabled.md) | Push enabled; Live Activity deferred to v1.1 | Accepted |
| [0025](./0025-widgets-deferred.md) | Widgets deferred; no native targets in the tree yet | Superseded by 0047 |
| [0026](./0026-apns-environment-is-the-provisioning-profile.md) | The APNs environment follows the provisioning profile, not the build name | Accepted |
| [0027](./0027-board-lead-cards-from-fixtures.md) | Today's live and last-result cards read `/cronogol/fixtures`; the scoreboard is not read by the app | Accepted |
| [0028](./0028-matchday-pager.md) | Matchdays pager: one clamped setter, text chevrons, no range while provisional | Accepted |
| [0029](./0029-upcoming-rows-read-from-the-followed-club.md) | `UPCOMING FROM YOUR CLUBS` rows are the crest pairing over `kickoff · day · venue`, with the relative day accented only today | Superseded by 0043 |
| [0030](./0030-sheets-are-presented-by-the-root-stack.md) | The sheets are presented by the ROOT stack, not a `(sheets)` layout | Accepted |
| [0031](./0031-league-filter-tiles-are-artwork-only.md) | The league filter tiles are artwork only, at one fixed size | Accepted |
| [0032](./0032-clubs-browse-by-league.md) | Clubs browses one league at a time, behind the Matchdays filter row; search stays global | Accepted |
| [0033](./0033-player-detail-sheet.md) | Tapping a squad row opens a player sheet, read from the cached squad payload; a null keeps its label and blanks its cell | Accepted |
| [0034](./0034-next-up-card-live-seconds-countdown.md) | The next-up card leads with its crests and an accent versus ring; its countdown ticks per second, torn down while backgrounded | Accepted |
| [0035](./0035-jornada-rows-show-in-play-scores.md) | Jornada rows: 40pt `v` crest pairing, a clock-split timing column, and an in-play score captioned `In play`, never `LIVE` | Accepted |
| [0036](./0036-app-icon-appearance-variants.md) | The app icon is three 1024s wired through `ios.icon`'s variant object; the tinted variant must be opaque | Superseded by 0041 |
| [0037](./0037-rich-notifications-server-composed-crests.md) | Rich notifications: the backend composes every crest; the app grows a service and a content extension | Accepted — verified on device |
| [0038](./0038-accounts-apple-and-google.md) | Accounts: Apple and Google, sign-in optional | Accepted |
| [0039](./0039-auth-goes-direct-to-supabase.md) | Auth goes direct to Supabase `/auth/v1`; the backend stays the only *data* gateway | Accepted — waypoint, proxied auth intended |
| [0040](./0040-kickoff-reminder-lead-times.md) | Kickoff reminders offer 1 h / 30 min / 15 min lead times; the notification budget counts notifications, not fixtures | Accepted — not yet on a device |
| [0041](./0041-app-icon-1b-and-a-splash-of-its-own.md) | App icon 1b: three opaque appearance masters, and a splash asset of its own | Icon superseded by 0060; splash arrangement stands |
| [0042](./0042-brand-spelling-spaced-form-reinstated.md) | The spaced `Alta Gama FC` is reinstated | Accepted — open across the ecosystem |
| [0043](./0043-upcoming-cards-name-the-sides.md) | `UPCOMING FROM YOUR CLUBS` is one card per match: the sides named home-lit over away-dim, `MD n · ground` as the eyebrow, kickoff over its date, accent only on today | Accepted |
| [0044](./0044-scores-render-as-split-digits.md) | A score is the `Score` atom — two digits split by a rule, the losing digit dimmed, chipped in a list and bare in the Today hero | Accepted — verified on the simulator |
| [0045](./0045-match-events-expanded-row.md) | A finished match expands into its event timeline: six event types drawn, disclosure gated on status not data, `react-native-svg` adopted | Accepted |
| [0046](./0046-match-events-grouping-tabs.md) | The events panel groups behind four counted tabs — `goals` / `cards` / `subs` / `other` — which replace its eyebrow; the shown group is derived, never stored | Accepted |
| [0047](./0047-widgets.md) | Widgets: both home-screen sizes, the Lock Screen accessories and a per-club picker; the App Group snapshot carries its own copy, and timeline ENTRIES are not reloads | Accepted — verified on the simulator |
| [0048](./0048-live-scores-on-the-today-board.md) | Live scores upgrade Today's in-progress card: `/cronogol/live` gives it a real minute where it can, the ~3h fixture sweep stays the fallback everywhere else, and the scoreboard's suppression is untouched | Accepted — decision 4 revised by 0049 |
| [0049](./0049-stall-is-lastseenat-not-polling.md) | The live card's stall signal is `lastSeenAt` alone; `polling` is not read — production served `polling: false` for a whole match that was updating fine | Accepted |
| [0050](./0050-match-events-on-the-in-progress-card.md) | The in-progress card expands into its timeline, reversing 0045's divergence 1: the chevron returns because that premise expired, `notPublished` is reused rather than given an in-play variant, and a `supplied` seam absorbs the backend's still-open decision on where live events land | Accepted — the panel is empty on real data until the backend lands live events |
| [0051](./0051-live-match-events-inline.md) | Live events arrive inline on `/cronogol/live` and reach the card through 0050's `supplied` seam; one composed `eventKey` serves both sources so the full-time handover does not remount; the durable-route poll is retired | Accepted |
| [0052](./0052-kickoff-triggers-the-live-refetch.md) | The next-up countdown announces kick-off and the board refetches on it — the fixture windows both END at `now`, so a match that starts after they were fetched is in neither and the live poll has nothing to join to; window bounds move into the `queryFn` so a refetch asks for the window as of now | Accepted |
| [0053](./0053-live-match-push-alerts.md) | Live match push alerts: goals, red cards and full time behind ONE `alertGoals` switch that defaults off; the 38pt attachment plate is drawn on device rather than composed by the backend, because a glyph has no upstream format to decode; the meta row is the long-look card, not the banner | Accepted — not yet on a device |
| [0054](./0054-live-activities-still-deferred.md) | Live Activities remain deferred and 0024's call stands — the blockers are now specific (a different APNs topic, a per-Activity token table, Apple's update budget) rather than "no data"; the phase-2 path is written down in `LIVE-ACTIVITIES.md` | Accepted |
| [0056](./0056-onboarding-league-chips-name-themselves.md) | Onboarding browses every league behind a 2-up chip grid that NAMES each one, narrowing 0031 to the filter row; no light plate, because the Premier League's mark is white-for-dark and 0031's faintness was the 50% idle opacity | Accepted — not yet run on the simulator |
| [0055](./0055-live-activities-broadcast-channels.md) | Live Activities ship on iOS 18 broadcast channels and REPLACE the goal banner for devices that have a card; the widget target stays at 17.0 with availability gating rather than raising its floor; push-to-start is a `device_tokens` column, not nothing; the check-age footer is retired and no stall line replaces it | Accepted — shipped dark, never on a device |
| [0057](./0057-local-expo-module.md) | A local Expo module at `modules/live-activity/` is how Swift reaches the APP target — `@bacons/apple-targets` builds extensions only, and the push-to-start token can only be read in the app process; the podspec reaches into `targets/_shared/` to keep `MatchAttributes` at one copy | Accepted |
| [0058](./0058-next-widget-centres-and-ticks.md) | The small NEXT widget centres on 38pt crests, and inside the final 12h its countdown ticks per second via `Text(timerInterval:)` — a SYSTEM-drawn timer that costs zero reloads, so 0025 step 5 still holds; beyond 12h the `1d 14h` string stays, because the system's timer format has no days unit | Accepted — verified on the simulator |
| [0059](./0059-your-week-widget-names-both-sides.md) | The medium YOUR WEEK row names BOTH sides home-first, lights the followed one and tags it `HOME`/`AWAY` — the inverse of 0043's unmarked sides, because a per-club list is about your club; kickoff becomes a stacked `SAT`/`21:00` column; snapshot v2 with every new field optional in Swift so a v1 file degrades instead of blanking; names contract (`R. Madrid`) because two full names and a pill do not fit one row | Accepted — verified on the simulator |
| [0060](./0060-app-icon-1a-floodlight.md) | App icon 1a "Floodlight": graphite field, lime glow, lime mark on every appearance; same geometry as 1b so the splash and widget mark are untouched; masters verified fully opaque before copying | Accepted — not yet on a device |
| [0061](./0061-news-widget.md) | The NEWS widget (`systemLarge`, design 1a) reads the GLOBAL `/cronogol/news` feed and opens the publisher in Safari; `expo-image-manipulator` encodes one cover-cropped 924×348 JPEG per item into `news/{id}.jpg`; a second App Group file `widget/news.json` with its own prune and change guard; age is derived in Swift from raw `filedAt`; `senpai-backend` untouched | Accepted — verified on the simulator |
| [0062](./0062-league-header-bands.md) | FINISHED TODAY's league headers sit on a per-league brand band from a front-end `LeagueBand` map keyed by API slug — NOT backend `accentColor` (null on Serie A/segunda, no gradient); segunda shares LaLiga's red; Serie A's gradient is drawn with `react-native-svg`, not `expo-linear-gradient`; unlisted slugs keep the neutral header | Accepted — not yet verified on the simulator |
| [0063](./0063-next-up-leads-the-board.md) | NEXT UP is the first card on the Today board, LAST RESULT beneath it — the reader opens the app for the next kickoff, not a result they were already pushed; only the live card outranks it | Accepted — not yet verified on the simulator |
| [0064](./0064-news-card-and-screen.md) | News in the app: a NEWS card on the Today board (three stories, one tap) pushing a root-stack News screen over the GLOBAL feed the widget already caches; link-out sheet names the publisher, phase 1 opens the default browser behind `features/news/open.ts` (phase 2: `expo-web-browser`); "Your clubs" deferred — the wire carries no club slugs; chips = `/news/leagues` ∩ `LEAGUES` in server order; `newsSeenAt` marked on opening the screen | Accepted — verified on the simulator |
| [0065](./0065-starting-xi-builder.md) | The Starting XI builder nests under the club page as a folder route; the entry row enables off the SQUAD (LaLiga + Premier League), placements key on the person id, eleven formations with the spacing rule asserted in code, a sibling `store/starting-xi.ts`, three root-stack sheets, a true-1080 off-screen capture via `react-native-view-shot` + `expo-sharing` + `expo-media-library`, drag-to-swap on gesture-handler, haptics via `expo-haptics`; no club switching | Accepted — harness-proven, not yet on the simulator |
| [0066](./0066-live-card-reads-the-live-route-directly.md) | The Today board's live card is picked from `/cronogol/live` ALONE (tier 0, `routeLive`) with crests from the club catalogue — no fixture window behind it; `BoardLive.fixture` narrows to `BoardFixture`; the countdown fires strictly PAST kickoff because an exclusive `to` on the kickoff millisecond excludes the fixture (measured); `liveMinute` nulls a literal 0; revises 0048 decision 2; goal pushes remain a backend flag | Accepted — harness-proven, not yet seen against a real kickoff |
| [0067](./0067-site-origin-and-contact-link.md) | A small "Contact us" text link closes the account sheet footer, opening `altagamafc.com/{locale}/contact` via `Linking`; `SITE_ORIGIN` is pinned in `lib/cronogol/site.ts` like `FEED_ORIGIN`, never env-derived; future website URLs go there | Accepted — not yet verified on the simulator |
| [0068](./0068-club-colour-wash.md) | A club-colour wash behind the next-up card (home top-left, away bottom-right, dark seam) and the club header, from `colorPrimary`/`colorSecondary` tamed by a pure `lib/cronogol/club-wash.ts` (L 22–30 %, yellow/green ≤ 26 %, S ≥ 45 %; near-black/white → secondary → graphite); no colour on either side → today's card unchanged (all PL and Serie A); chrome on a wash goes white not lime; drawn via a `WashGradient` atom on `react-native-svg` with `useId` ids; Today screen joins `TeamRef` to the catalogue by slug | Accepted — harness-proven (16 assertions), verified on the simulator |
| [0069](./0069-finished-today-stacked-rows.md) | FINISHED TODAY rows become a stacked pair — home over away, one crest and name per line, goals in a fixed right-aligned tabular `Size.goalColumn` behind a hairline, chevron in its own column, the `FT` word and `finishedLabel` prop removed; `scoreEmphasis` mutes the loser's name and goal; the `Score` chip stays on every other card | Accepted — verified on the simulator |
| [0070](./0070-news-front-page.md) | The News screen's first day group is a FRONT PAGE — `frontPagePick` → `NewsLead` (picture under a `WashGradient` scrim, kicker, 3-line `title`, 2-line excerpt; a failed picture keeps the story as a text lead) + up to two `NewsTile`s (16:10) + hairline `NewsRow`s; later days are rows; `N NEW` pill on the first header via `SectionHeader.accessory`, counted over the whole feed from the seen stamp CAPTURED AT OPEN; masthead date; `copy.news.lead` | Accepted — verified on the simulator |
| [0071](./0071-today-news-card-lead-picture.md) | The Today card's lead carries its picture across the top of the card via `NewsLead variant="compact"` (2:1.15 `Size.newsCardLeadRatio`, two-line `headline`, no kicker, no excerpt, no Pressable of its own — `onPress` optional); a failed picture → headline-first at `title3`; the card drops its horizontal padding and the rule under the lead; `Size.newsLead` retired | Accepted — verified on the simulator |
| [0072](./0072-xi-portraits-on-the-board.md) | Starting XI pitch tokens and rail tiles draw the player's portrait when `photoUrl` is set, with the shirt number as a corner badge (`Size.xiBadge` 18 / `xiRailBadge` 14, `Type.xiBadge`); null → the number token, a 404 → the number token via `onError`; the selected ring now draws around a portrait; no toggle, no silhouette, `Size.xiToken` untouched | Accepted — verified on the simulator |
| [0073](./0073-xi-export-render-in-context.md) | Save to Photos calls `MediaLibrary.Asset.create(file://…)` — SDK 57 removed `saveToLibraryAsync` from the root entry and left a throwing stub, which was the whole "could not be rendered" error (found from the device log once the catch logged); the XI capture also passes `useRenderInContext: true` (iOS `drawViewHierarchyInRect` refuses the builder's hierarchy while the export sheet is presented over it); the sheet logs every rejection under `[xi-export]` instead of a bare catch; the host guard rejects `capture-host-not-mounted` on a null ref; `LineupCard` settles in an effect, not during render | Accepted — confirmed by the reader's tap: "Saved to Photos" |
| [0074](./0074-export-receipt-state.md) | After a save the Save button becomes the receipt — `outline` + `Check` + `Saved to Photos`, disabled until size/title/lineup change (route clears the typed `ExportStatus` in its handlers); a `StatusBanner` molecule (lime success / red error / amber warning, `FadeInDown` unless Reduce Motion) replaces the caption; `hapticSaved()` Success notification; `shared` clears the status | Accepted — verified on the simulator |
| [0075](./0075-card-caption-reserve.md) | The export card's `PitchSlots` projects y onto `height − insetBottom`, with `CARD.captionReserve` (120 = ring/2 + nameGap + tallest caption) so the goalkeeper's name is never clipped on 1:1 and 4:5; the board passes no inset and is unchanged | Accepted — verified on the simulator |
| [0076](./0076-onboarding-floodlight-redesign.md) | Onboarding is redesigned around the icon's "Floodlight": a new welcome screen (`Mark` + `Glow` atoms, `StepDots`), 0056's chip grid becomes a horizontal `LeaguePills` row with the same rules, the picker goes 3-up crest-led on a new `pickerName`, the CTA carries a `PickStack` of picked crests (revisiting 0056's rejected strip — same feedback, smaller surface), the primer shows a sample `AlertPreview` and `AlertGlyph` rows; `Button tall`; gate and Replay route to `/onboarding/welcome` | Accepted — not yet run on the simulator |
| [0077](./0077-welcome-language-line-and-one-skip.md) | The welcome screen carries a one-line language override written in the OTHER language (`copy.onboarding.switchLanguage` + `GlobeGlyph`, swaps copy in place via `setLanguage`), chosen over an `EN \| ES` pill because only the reader it is for can see it; the welcome and picker skips are removed — the primer's `Not now` is the flow's only skip, so a reader must follow one club to reach the app | Accepted — not yet run on the simulator |
