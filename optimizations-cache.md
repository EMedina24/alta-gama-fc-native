# Cache hardening — surviving a backend outage

**Goal, Ed's words, 2026-09-14:** *"I'd like the app to be able to be fed off of cache if our backend
crashes."*

This file is the plan for the client half. **The server half already shipped** — see "What already
landed" below — and it changes what the client half needs to do, so read that first.

---

## What already landed (2026-09-14, backend)

`stale-if-error` on every public read (`senpai-backend` `CRONOGOL.md` §133, contract in
`cronogol-api.md`). When the origin answers **5xx**, Cloudflare may serve the last good copy instead
of the error, for up to **24 hours** — except `/cronogol/live`, deliberately capped at **5 minutes**.

Two consequences for this app, and the second one is the awkward one:

1. **A backend crash is now largely invisible to us.** Reads keep answering `200` from the edge. Much
   of the original problem is solved without an App Store release.
2. ⚠⚠ **A `200` no longer means "fresh".** The app can now be handed a day-old fixture list, a
   day-old table or a day-old news feed and told it succeeded. Nothing in this codebase currently
   notices. That makes §3 below — showing how old the data is — no longer a nicety but the thing
   that keeps the app honest.

The edge cannot help with a **cold start during an outage**, because the app still has nothing on
disk, and it cannot help with a URL the edge has never seen. That is what §2 is for.

---

## §0 ⚠ The prerequisite — settle this before building anything

Several screens branch on `isError` **before** asking whether usable data exists:

- `src/app/(tabs)/clubs.tsx:233`
- `src/app/(tabs)/matchdays.tsx:477`
- `src/app/club/[slug]/season-stats.tsx:305`, `:332`

If a query that already holds good data enters error status when its background refetch fails, those
screens discard a perfectly good cache and render an error. **Every other item in this file is worth
nothing until that is known**, because persistence only matters if the UI will actually show what it
restores.

**How to settle it:** point the app at a dead base URL (`EXPO_PUBLIC_CRONOGOL_API_URL`) *after* a
successful load, and watch what those screens do. Ten minutes, and it decides whether the work below
is "add persistence" or "add persistence and rework six screens".

The fix, if needed, is the same everywhere: branch on `data` first and treat `isError` as a banner,
not a state. TanStack keeps the last successful `data` on a failed refetch; the question is only
whether our own conditionals look at it.

---

## §2 Persist the query cache

**The gap.** `src/queries/client.ts` sets `gcTime: GC_TIME` (1 hour) and nothing else. The cache is
memory-only — `src/features/widgets/snapshot.ts` says so itself: the widget extension "cannot reach
the TanStack Query cache (which is never persisted to disk)". So a kill-and-relaunch, or an hour in
the background, starts from nothing. With the backend down, that is a blank app.

**The shape.** `@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister`.
`@react-native-async-storage/async-storage` is already a dependency, so no native module is added.

**The decisions that actually matter** — the wiring is the easy part:

- ⚠⚠ **`gcTime` must rise first.** At 1 hour, entries are evicted from memory before they can be
  written back, so persistence with today's value would quietly do almost nothing. `gcTime` has to be
  at least the persister's `maxAge`. This is the single most likely way to ship this and believe it
  works when it does not.
- ⚠⚠ **A `buster` tied to the build number.** Without it, a DTO change on the backend hydrates
  yesterday's shape into today's code — a crash generator rather than a safety net. `cronogol-api.md`
  changes often enough that this is not hypothetical. Use the build/`runtimeVersion`, not the
  marketing version.
- **Exclude queries deliberately**, via `dehydrateOptions.shouldDehydrateQuery`:
  - `live` — 15 s data has no value at cold start and actively misleads. The backend already refuses
    to serve `/live` stale beyond 5 minutes; persisting it locally would undo that decision.
  - anything account-shaped (`use-account.ts`) — `/cronogol/me` is `no-store` server-side, and that
    posture should not be silently reversed by writing it to disk.
- **Pick `maxAge` against the outage you are insuring against**, not against freshness. A day is the
  natural match for the backend's own `stale-if-error=86400`.
- **Size.** AsyncStorage serialises the whole cache as one blob per write (throttled, default 1 s).
  Measure it with a realistic cache rather than assuming; `catalogue` queries are the large ones.

**Trade-off.** Everything this restores is stale by definition, which is exactly why §3 is not
optional.

---

## §3 Make staleness visible — now mandatory, not cosmetic

`dataUpdatedAt` is already on every query result; nothing renders it.

An app that shows a three-hour-old score as though it were live is worse than one that shows nothing
— and since `stale-if-error` shipped, this is no longer a hypothetical failure mode but the
**designed** behaviour during an outage. The backend explicitly caps `/cronogol/live` at 5 minutes
*because* this app cannot yet tell the difference; building this is what would let that cap be
reconsidered.

Scope: a shared "last updated" treatment, plus an explicit rule for anything with a clock on it — the
live minute, the "live" badge, in-play scores. The `Age` response header on an edge hit is the
server-side signal; ⚠ it has not been observed during a real outage yet, so key off `Age` rather than
a Cloudflare-specific `cf-cache-status` string.

---

## §4 Stop the app becoming the thundering herd

**The gap.** `src/queries/client.ts` retries twice on 5xx and network errors, with TanStack's default
backoff and **no jitter**. During an outage every screen mount costs 3 attempts × N queries, and when
the backend recovers every installed copy retries in lockstep.

The backend takes this seriously for itself — `src/common/retry.ts` there uses exponential backoff
with full jitter because "a synchronised retry storm across replicas is worse than the original
failure". The same argument applies here with a much larger N.

Two concrete pieces:

- **Jitter the `retryDelay`.** Small change, one file.
- ⚠ **Honour `Retry-After`.** The backend's Supabase concurrency gate already sheds with
  **`503` + `Retry-After`**, and this app currently ignores the header entirely. That is server-side
  work already paid for and unused — arguably the highest value-per-line item in this whole file.
  `CronogolApiError` in `src/lib/cronogol/client.ts` would need to carry it.

---

## §5 Wire `onlineManager` to NetInfo

Nothing calls `onlineManager` or `focusManager` today, so TanStack assumes it is always online and
treats "airplane mode" and "backend on fire" identically — both become failed fetches.

Wiring `@react-native-community/netinfo` lets genuine offline **pause** queries (keeping cached data
on screen) instead of failing them, and lets a recovery refetch fire when connectivity returns. Small,
Expo-supported, and it makes §2 and §4 behave sensibly rather than fighting each other.

⚠ Check the interaction with `refetchOnWindowFocus: false` and the existing `AppState` listeners
(`use-push-sync.ts` already runs two, deliberately, and its comments explain why) before adding
another.

---

## §6 Prefetch the shell on first good launch

Persistence only preserves what someone visited, so a user who has only ever opened one tab still
gets a blank everywhere else during an outage.

Warming the handful of `catalogue` queries at launch — leagues, teams, the followed club — means a
cold start during an outage has something on every tab. Cheap, because `STALE.catalogue` is already
24 hours, so this costs a few requests once a day at most.

---

## Suggested order

1. **§0**, because it gates everything and costs ten minutes.
2. **§2 + §3 together.** Shipping persistence without the staleness UI means shipping an app that
   lies confidently; shipping the staleness UI alone has little to show. They are one piece of work.
3. **§4**, in whichever release is convenient — `Retry-After` first, it is nearly free.
4. **§5**, then **§6**.

## Deliberately not here

- **Anything that replaces TanStack Query.** The `STALE` buckets in `src/queries/stale.ts` are a
  considered design ported from the web app's `REVALIDATE` table (ADR 0017); none of the above
  disturbs them.
- **A second on-disk cache of our own.** `src/features/widgets/snapshot.ts` already writes an App
  Group snapshot for WidgetKit, and that is a different contract with a different consumer. Reusing
  it as a general app cache would couple two things that only look similar.
- **Offline writes.** Queueing mutations while the backend is down is a much larger problem
  (conflict resolution, auth expiry) and nothing in the current product asks for it.
