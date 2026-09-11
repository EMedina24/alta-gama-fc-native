/**
 * Wire types for the CronoGol API (`senpai-backend`, https://crono-gol.com).
 *
 * ⚠ PORTED FROM `cronogol/lib/cronogol/types.ts` — keep the path mirrored and the
 * caveat comments intact (ADR 0018). The comments here are the reason this file
 * is worth more than the shapes: they record what the wire actually does, which
 * is repeatedly not what the field names suggest.
 *
 * Authoritative contract: `senpai-backend/CRONOGOL-API.md`.
 */
/**
 * Server DTOs, mirrored exactly from `cronogol-api.md`.
 *
 * Nearly everything except `slug`, `name`, `id`, `kickoffUtc`, `status`,
 * `competition` and `homeAway` is nullable. `venue`, `round` and `opponent`
 * are genuinely absent sometimes — design for it rather than asserting
 * non-null.
 */

/**
 * ⚠ Valores de protocolo — no traducir. Every union in this file is an API
 * DTO value: sent in requests and matched against responses. The Spanish a
 * user sees for any of them is written at the render site.
 */
export type Competition = "league" | "cup" | "friendly" | "other";

export type FixtureStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

/**
 * Every size a crest or venue photo is published at, keyed by name.
 *
 * ⚠ Pick by key, never by position. The key set varies per club — most carry
 * `xsmall`/`small`/`medium`/`large`/`xlarge`, several add an `hl` the API doc
 * does not mention — and the keys are not ordered by weight, so `large` (740px)
 * is heavier than `xlarge` (900px). Only `xsmall`, `small` and `medium` are
 * present on every club, and only those three are mirrored into our own bucket.
 */
export type ImageUrls = Record<string, string>;

/**
 * A club's home ground.
 *
 * ⚠ Verified 2026-07-29: only `name` and the images are populated. `city`,
 * `capacity`, `latitude` and `longitude` are null on all 20 tracked clubs, so
 * the city still has to come off a fixture — see `homeGround`.
 */
export interface VenueView {
  name: string;
  city: string | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  imageUrls: ImageUrls | null;
}

export interface TeamView {
  slug: string;
  /** Display name — `Deportivo Alavés`, not the legal `… SAD`. */
  name: string;
  /** 3-letter code: `RMA`, `ALA`. Null on every club reached only as an opponent. */
  shortName: string | null;
  country: string | null;
  /** The crest to render with no particular size in mind. Equals `logoUrls.xsmall`. */
  logoUrl: string | null;
  /**
   * Null for the 176 opponent-only clubs, which still carry a `logoUrl`
   * hot-linked from the provider. Read it through `crestSrc`.
   */
  logoUrls: ImageUrls | null;
  /** Club hex, verbatim and unvalidated. Several are near-black or near-white. */
  colorPrimary: string | null;
  colorSecondary: string | null;
  venue: VenueView | null;
  tracked: boolean;
  /** null => no complete schedule has been fetched. Never present as a schedule. */
  lastSyncedAt: string | null;
}

export interface FixtureView {
  id: string;
  /** Perspective of the requested team. */
  homeAway: "H" | "A";
  opponent: string | null;
  opponentLogoUrl: string | null;
  /** As `TeamView.logoUrls`, for the opponent. */
  opponentLogoUrls: ImageUrls | null;
  competition: Competition;
  competitionName: string | null;
  round: string | null;
  /** ISO 8601 with offset. */
  kickoffUtc: string;
  /** true => the time is a placeholder; render as all-day. */
  kickoffTbd: boolean;
  venue: string | null;
  venueCity: string | null;
  status: FixtureStatus;
  /** Requested team's goals, not the home team's. */
  goalsFor: number | null;
  goalsAgainst: number | null;
}

export interface TeamFixturesView {
  team: TeamView;
  count: number;
  fixtures: FixtureView[];
}

/** `GET /cronogol/me`, `PATCH /cronogol/me` and `POST /cronogol/me/email`. */
export interface AccountView {
  id: string;
  /**
   * ⚠ Read from Supabase Auth, not from this service's mirror of it — so it is
   * right during the hour after a confirmed email change, while the access
   * token still carries the old address. Never render `session.user.email`
   * instead: for that hour the two disagree and this one is correct.
   *
   * ⚠ **May be a `@privaterelay.appleid.com` address** since Sign in with Apple
   * shipped (ADR 0038) — real and forwarding, but not one the reader recognises.
   * Copy must never imply they would.
   */
  email: string | null;
  /**
   * null until the user sets one; an email/password signup starts with none.
   *
   * ⚠ **Apple supplies a name on the FIRST authorization only**, ever, per Apple
   * ID per app — and the identity token carries no name claim, so nothing
   * downstream can recover it. `features/auth/apple.ts` writes it here on that
   * one call; miss it and the account stays nameless (ADR 0038).
   */
  displayName: string | null;
  timeZone: string | null;
  /**
   * An email change that has been requested but not yet confirmed, or null.
   *
   * Clears itself once the change lands, so there is nothing to poll and
   * nothing to reset — and while it is set, `email` is still the address the
   * account actually signs in with.
   */
  pendingEmail: string | null;
  /**
   * Opt-in for fixture-change email. Always a boolean — the column is
   * `not null default false`, so a new account reads as off without the client
   * having to invent a default.
   *
   * ⚠ Never cache it. The one-click unsubscribe link in the mail flips this
   * server-side, so a stored `true` renders a control that lies about whether
   * mail is coming.
   */
  notifyFixtureChanges: boolean;
}

/**
 * `all` re-reads the club on every fetch, so cup fixtures drawn later still
 * appear. `subset` is frozen at the ids it was given and never grows — which is
 * why "select all" must map to `all` and not to a list of every current id.
 */
export type FeedSelectionMode = "all" | "subset";

export interface FeedSelectionView {
  token: string;
  /** Prepend your own origin. Deliberately not an absolute URL. */
  path: string;
  mode: FeedSelectionMode;
  /** Fixtures the feed currently contains. 0 once revoked. */
  count: number;
  /** Whether it belongs to an account. Never says which one. */
  claimed: boolean;
  /** ISO 8601 once unsubscribed; the feed then serves an empty calendar. */
  revokedAt: string | null;
}

/** `GET /cronogol/selections/{token}` and `GET /cronogol/me/feeds`. */
export interface FeedSelectionDetailView extends FeedSelectionView {
  slug: string;
  /** null when mode is `all`. */
  fixtureIds: string[] | null;
}

/** `POST /cronogol/feed` only. */
export interface CreatedFeedSelectionView extends FeedSelectionView {
  /**
   * ⚠ Returned exactly once and never retrievable again — only its hash is
   * stored. Persist it for an anonymous feed; ignore it when signed in.
   */
  editSecret: string;
}

/* ── Jornada ─────────────────────────────────────────────────────────────── */

/** A club on a page that belongs to no club. Deliberately slimmer than `TeamView`. */
export interface TeamRef {
  slug: string;
  name: string;
  /**
   * The three-letter code — `SEV`, `TOT`, `BVB`. Added 2026-08-08 alongside the
   * fixture window, which is why it lands on the jornada payloads too.
   *
   * ⚠ **A label, never a key.** It is not unique: Valencia and Valladolid have
   * collided. Populated on all 83 tracked clubs today but typed nullable — fall
   * back to `abbreviate()` in `./derive`, which is the same guard the club
   * pages already use.
   */
  shortName: string | null;
  logoUrl: string | null;
  logoUrls: ImageUrls | null;
}

export interface LeagueRef {
  /** ⚠ A `League.apiSlug` — `laliga` or `serie-a`, never the URL slug. */
  slug: string;
  /** `LALIGA EA SPORTS` — the provider's competition name, verbatim. */
  name: string;
  /**
   * The league's own mark, mirrored into our storage — added 2026-08-08. All
   * four fixture leagues carry one; a cup or UEFA competition reached through a
   * fixture does not, hence the null.
   *
   * ⚠ Drawn for a **light** background, every one of them. Render it through
   * `ui/atoms/league-mark`, which is where that is handled — three of the four
   * are illegible on this app's surfaces without its plate.
   */
  logoUrl: string | null;
  /**
   * ⚠ **Semantic keys, not sizes** — the opposite of `TeamView.logoUrls`.
   * `primary` is the full lockup and always equals `logoUrl`; `icon` is the
   * icon-only mark and is LaLiga's alone today. Reading `logoUrl` and ignoring
   * this map is always correct.
   */
  logoUrls: ImageUrls | null;
  /**
   * The league's tint — **ours**, not the provider's. Added 2026-08-08 so the
   * week grid's colour bars survive a fifth league without a front-end deploy.
   *
   * ⚠ Key on `slug` to reach it, never on `name`: the provider's copy is
   * `LALIGA EA SPORTS`, not `LaLiga`, and it can be re-marketed at any time.
   *
   * ⚠ **Null is a live value, not an outage.** Serie A has no tint — the design
   * supplied none and the backend refused to invent one — so every consumer
   * needs a neutral fallback.
   *
   * ⚠ **These are warm reds on a cool page.** LaLiga's `#ff563c` used to be the
   * same hex as our brand accent, which made its bar invisible as a league
   * signal; the Floodlight re-tone moved the accent to lime and ended that, but
   * left the bar sitting near the new `danger` role instead. Nothing reads the
   * two together today. Re-picking the tints is a backend change, not a
   * front-end one — the values come from the database precisely so a fifth
   * league needs no deploy here.
   *
   * ⚠ The app does not consume this today: FINISHED TODAY's header bands come
   * from `LeagueBand` in `@/constants/theme` instead (ADR 0062).
   */
  accentColor: string | null;
}

/**
 * ⚠ NOT `FixtureView`. A club page asks "what are *my* fixtures" and gets
 * `homeAway`/`opponent`/`goalsFor`/`goalsAgainst`; a jornada page has no
 * requesting club, so home and away are both named and the score is
 * home-away. There is no honest mapping between the two — do not try to
 * reuse the club fixture row component.
 *
 * ⚠⚠ **The two rows now look identical, and that is not an invitation.** Since
 * 2026-08-14 they are drawn to one spec and share `CrestPair`, the class strings
 * and the numbers — see docs/features/the-match-row.md — so the next reader will
 * reasonably assume the components should merge too. They must not. Merging
 * means one pair of score props for two orientations, and the moment anyone adds
 * a perspective flip for the club page it silently reverses every round page.
 */
export interface JornadaFixtureView {
  id: string;
  /** Null only for a row whose club could not be resolved. */
  homeTeam: TeamRef | null;
  awayTeam: TeamRef | null;
  competition: Competition;
  competitionName: string | null;
  /** The provider's label, e.g. "Jornada 4". The number is on the parent. */
  round: string | null;
  kickoffUtc: string;
  /** ⚠ True for most of the season. Render `--:--`, never midnight. */
  kickoffTbd: boolean;
  venue: string | null;
  venueCity: string | null;
  status: FixtureStatus;
  /** ⚠ Home-away, not for-against. This page has no perspective to flip. */
  goalsHome: number | null;
  goalsAway: number | null;
}

/** `GET /cronogol/jornada/{league}/{season}/{n}`. */
export interface JornadaView {
  league: LeagueRef;
  season: number;
  matchweek: number;
  count: number;
  /** `clubs / 2` — derived, never hardcode 10. Null when nothing is stored. */
  expectedCount: number | null;
  /** `2 * (clubs - 1)` — 38 primera, 42 segunda. Never write either down. */
  totalMatchweeks: number | null;
  /** COVERAGE: we hold every match. False means missing data. */
  complete: boolean;
  /**
   * SCHEDULE: LaLiga has published the times. False is NORMAL for most of the
   * season — verified 2026-08-04: 34 of 38 matchweeks — and must never be
   * styled as an error. Routinely differs from `complete`, in both directions.
   */
  kickoffsConfirmed: boolean;
  fixtures: JornadaFixtureView[];
}

/** One pager entry on the season index. */
export interface JornadaSummaryView {
  matchweek: number;
  count: number;
  complete: boolean;
  kickoffsConfirmed: boolean;
  /**
   * ⚠ Provisional while `kickoffsConfirmed` is false, and can span far more
   * than a weekend — jornada 1 runs 15–27 Aug thanks to a deferred opener.
   */
  firstKickoffUtc: string | null;
  lastKickoffUtc: string | null;
}

/** `GET /cronogol/jornada/{league}/{season}`. */
export interface SeasonJornadasView {
  league: LeagueRef;
  season: number;
  expectedCount: number | null;
  totalMatchweeks: number | null;
  /**
   * ⚠ Ordered by NUMBER, which is not date order: matchweek 6 kicks off before
   * matchweek 5 on live data. A time axis needs a sort on `firstKickoffUtc`.
   */
  matchweeks: JornadaSummaryView[];
}

/* ── The fixture window ──────────────────────────────────────────────────── */

/**
 * One match in a cross-league date window.
 *
 * A `JornadaFixtureView` plus the three fields a flat multi-league list needs to
 * say which competition and which round a row belongs to — on a jornada page all
 * three are on the parent, and here there is no parent.
 */
export interface WindowFixtureView extends JornadaFixtureView {
  /** Key into `FixtureWindowView.leagues`, where the name, mark and tint live. */
  leagueSlug: string;
  /** ⚠ Per FIXTURE. A window can straddle a season change; the envelope cannot. */
  season: number;
  /**
   * The round this match belongs to, for a deep link into our own round routes.
   *
   * ⚠ A label, not a position — matchweek order is not chronological. Null for a
   * competition without rounds.
   */
  matchweek: number | null;
}

/**
 * `GET /cronogol/fixtures` — every league in one date window.
 *
 * The primitive behind the home page's seven-day band. Before it existed the
 * band was 83 requests, one per club.
 *
 * ⚠ **League competitions only.** No cups, no European ties, no friendlies and
 * no segunda, so five tracked clubs never appear here at all — Girona, Las
 * Palmas, Leganés, Mallorca and Valladolid all play in segunda. A reader
 * following one of them sees an empty band with no error anywhere, which is why
 * no copy on top of this may claim to cover "every match".
 *
 * ⚠ The Today board, the reminders and the widget snapshot no longer inherit
 * this limitation: since ADR 0132 they merge the followed clubs' own
 * `GET /cronogol/teams/{slug}/fixtures` windows underneath (`team-window.ts`).
 * FINISHED TODAY and the Matchdays/Table screens still read window and jornada
 * routes alone, deliberately.
 */
export interface FixtureWindowView {
  /** The resolved bounds after defaulting. ⚠ HALF-OPEN: `[from, to)`. */
  from: string;
  to: string;
  /** Renderable fixtures returned — the number a meta line can print. */
  count: number;
  /**
   * ⚠ True means the **last day is partial**, not that the response is invalid.
   * Narrow the range or drop that column; never caption it as a quiet day.
   */
  truncated: boolean;
  /**
   * First kickoff at or after `to`, so an empty band can say when the season
   * starts instead of rendering blank.
   *
   * ⚠ Computed **only when `count === 0`**. Null otherwise means "not looked
   * up", never "nothing ahead" — read it only once `count` is 0.
   */
  nextKickoffUtc: string | null;
  /**
   * ⚠ What the window was **scoped to**, not what has matches in it. A league
   * between matchweeks still appears. It is the legend, and a legend that
   * flickers as a week empties is worse than one that does not.
   */
  leagues: LeagueRef[];
  /** `kickoffUtc` ascending. ⚠ Not the jornada's TBD-first order. */
  fixtures: WindowFixtureView[];
}

/* ── News ────────────────────────────────────────────────────────────────── */

/** Who wrote the article. Comes from the API's registry, never from feed content. */
export interface NewsPublisherView {
  /** `marca` | `laliga` | `cronogol`. Also the `?publisher=` filter value. */
  id: string;
  /** ⚠ MUST be rendered on every card — see the note in `components/news-feed.tsx`. */
  name: string;
  siteUrl: string | null;
  /**
   * Whether this publisher's articles live on **our own site**.
   *
   * True for our editorial (`cronogol`), false for every aggregated publisher.
   * It is a **navigation** signal: true means route in-app with expo-router `<Link>`,
   * false means `target="_blank" rel="noopener noreferrer"`.
   *
   * ⚠ Branch on this, never on `id === "cronogol"` and never on the URL's host.
   * The registry is the API's to own — the same reason league tabs come from
   * `/cronogol/news/leagues` rather than from a hardcoded list.
   */
  isFirstParty: boolean;
}

export interface NewsArticleView {
  /**
   * ⚠ NOT a permanent handle. Articles are deleted after 30 days, so this must
   * never be persisted in a bookmark, a share URL or anything else expected to
   * outlive a month. Store `url` for that.
   */
  id: string;
  title: string;
  /**
   * The publisher's own summary, ~1–3 sentences, already truncated server-side
   * to 400 chars on a word boundary. Clamp with CSS if the layout needs it, but
   * never re-truncate in JS — that cuts an already-cut string and ends up with
   * two ellipses. Null on roughly one article in ten.
   */
  excerpt: string | null;
  /**
   * The article's canonical address — an absolute URL either way.
   *
   * ⚠ **External UNLESS `publisher.isFirstParty`.** Aggregated news is
   * `target="_blank" rel="noopener noreferrer"`; our own editorial is on this
   * site and must be an in-app `<Link>` to the URL's pathname. Use `articleHref()`
   * in `lib/cronogol/news.ts` rather than branching by hand.
   */
  url: string;
  /**
   * ⚠ For aggregated news this is hot-linked to the publisher's CDN and, unlike
   * a crest, **not** mirrored by us: it can 404 or be hotlink-blocked at any
   * time, and is null on about one article in fifty. For first-party articles
   * it is our own storage and is stable. Render through `RemoteImage` inside a
   * fixed-aspect box either way; never proxy or re-host a publisher's.
   */
  imageUrl: string | null;
  publishedAt: string;
  publisher: NewsPublisherView;
  /**
   * Often null — LALIGA supplies no byline at all. Falls back to the publisher
   * name through `articleByline`; never render an empty author.
   */
  author: string | null;
  /**
   * The publisher's own tags, and in practice always exactly one. ⚠ NOT our
   * team slugs and not always even a club: `["Osasuna"]`, but also `["Fútbol"]`
   * and `["Nota de Prensa"]`. A label only — never a filter key.
   */
  categories: string[];
}

/** `GET /cronogol/news`. */
export interface NewsFeedView {
  count: number;
  /** Pass as `?before=` for the next page. Null means there is no next page. */
  nextBefore: string | null;
  articles: NewsArticleView[];
}

/** `GET /cronogol/teams/{slug}/news`. */
export interface TeamNewsView extends NewsFeedView {
  /** ⚠ Deliberately slimmer than `TeamView` — no venue, colours or sync state. */
  team: {
    slug: string;
    name: string;
    logoUrl: string | null;
    logoUrls: ImageUrls | null;
  };
}

/**
 * One entry of `GET /cronogol/news/leagues` — how the *feed* can be sliced.
 *
 * ⚠ **This is not the same dimension as `LEAGUES`.** That catalogue answers
 * "do we hold a club roster and a fixture schedule", and five screens depend on
 * its `live` flag. This one answers "can the news feed be filtered this way",
 * and today it says yes to nine leagues — seven of which we carry no clubs for.
 * A league appearing here is not a reason to show it a club picker.
 *
 * ⚠ **Database-owned; render the array's order and do not re-sort it.** There is
 * no `sortOrder` and no `enabled` — a disabled league is simply absent — so a
 * front end that sorts its own way will disagree with the server for no gain.
 *
 * `id` is a protocol value: it is what `?league=` takes on both news endpoints,
 * and it is what our own `?league=` search param now carries.
 */
export interface NewsLeagueView {
  id: string;
  /** Full name — "LALIGA", "Major League Soccer". Prose, not a pill. */
  name: string;
  /** "LaLiga", "MLS". What fits on a segmented track. */
  shortName: string;
  /**
   * The league's own mark, mirrored into our storage — added 2026-08-08.
   *
   * ⚠ **Null for most of this list, and that is normal.** Only the four leagues
   * we hold fixtures for have artwork; Ligue 1, the UEFA competitions, Liga MX
   * and MLS sit here without one. Render the name alone when it is null — never
   * a placeholder box.
   *
   * ⚠ Every mark is drawn for a *light* background. See `ui/atoms/league-mark`,
   * which is the only thing that should render one.
   */
  logoUrl: string | null;
  /**
   * ⚠ **Semantic keys, unlike `TeamView.logoUrls`' sizes.** A club's variants
   * are one image at several resolutions, so the wrong key is a sharpness
   * mistake. A league's are *different artwork*: `primary` is the full lockup
   * and always equals `logoUrl`; `icon` is the icon-only mark and exists for
   * LaLiga alone today. Reading `logoUrl` and ignoring this is always correct.
   */
  logoUrls: Record<string, string> | null;
}

/* ── Scores ────────────────────────────────────────────────────────────────
   ⚠ **A DIFFERENT SOURCE from everything above this line.** Fixtures, clubs,
   jornadas and the `.ics` feeds come from our licensed providers. The
   scoreboard is a third party we have no agreement with, scraped into our own
   database on a six-hourly schedule.

   ⚠ **There is no crosswalk.** These events carry the source's own club names
   and Opta ids — no slug, no `TeamView` id, nothing that joins to
   `GET /cronogol/teams`. The two describe different sets of matches: verified
   2026-08-07, one response held Liga Argentina, Europa League qualifiers, a
   club friendly and the Primeira Liga, and not one LaLiga match. Do not try to
   resolve a club here against one of ours.

   And because the shape is home-away with two named clubs but a third status
   vocabulary, it is not `JornadaFixtureView` either. It gets its own row.
   ──────────────────────────────────────────────────────────────────────── */

/**
 * ⚠ Valores de protocolo — no traducir.
 *
 * `unknown` is a NORMAL value, not an error: the source reported a state we do
 * not recognise, and `statusLabel` is then the only thing that says anything
 * useful about the match. `postponed` covers suspended, cancelled and abandoned
 * and has never been observed in the wild.
 *
 * ⚠ Not `FixtureStatus`. That union has `cancelled` and no `unknown`, so the
 * two are not interchangeable even where they happen to share a word.
 */
export type ScoreboardStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "unknown";

export interface ScoreboardTeamView {
  name: string;
  /**
   * ⚠ NOT reliably a three-letter code. Production returns nulls, and returns
   * whole club names for some clubs — so it cannot go straight into a monogram
   * without a length guard. `scoreAbbr` in `./scores` is that guard.
   */
  shortName: string | null;
  /** Opta's public club id. Stable, but NOT a key into anything else here. */
  optaId: string | null;
  /**
   * ⚠ The one image URL in this API that is not on our own storage — it is
   * hot-linked straight off the source's CDN, which is exactly what every other
   * crest field here tells you not to do. It may 404 or vanish without notice,
   * so a fallback is mandatory rather than defensive.
   */
  crestUrl: string | null;
}

export interface ScoreboardEventView {
  id: string;
  /**
   * ⚠ The source's EDITORIAL day bucket, not a UTC window over kickoffs.
   * Verified 2026-08-07: a match kicking off at `2026-08-05T22:00Z` is filed
   * under `2026-08-06`. Never sort or group on this — sort on `kickoffUtc`.
   */
  date: string;
  /**
   * ⚠ Comes back with a `+00:00` offset rather than a `Z`. Both are valid ISO
   * 8601 and `new Date()` parses either, but they do not string-compare.
   */
  kickoffUtc: string;
  /** The source's own competition naming — "Liga Argentina", "Amistosos clubes". */
  tournament: { id: string | null; name: string | null };
  status: ScoreboardStatus;
  /**
   * The source's own wording, in its own two languages. Print THIS; branch on
   * `status`. When `status` is `unknown` this is the only thing left that
   * describes the match.
   */
  statusLabel: { es: string | null; en: string | null };
  home: ScoreboardTeamView;
  away: ScoreboardTeamView;
  /**
   * ⚠ Null before kick-off, and withheld when `status` is `unknown`. The
   * upstream really does send zeros for unplayed matches and we strip them, so
   * null means "no score" and never nil-nil. Render a dash — never `0`.
   */
  score: { home: number | null; away: number | null };
  /** When the SOURCE last moved this row, not when we read it. */
  lastUpdateAt: string | null;
}

/**
 * `GET /cronogol/scores`.
 *
 * ⚠ **Nothing here is live.** The ingest runs every six hours, so a
 * `status: "live"` row is a snapshot that was true at the last sweep — possibly
 * hours ago. Nothing built on this may poll it, tick a minute counter, or imply
 * real time.
 */
export interface ScoreboardDayView {
  /** ⚠ The ANCHOR bucket. With `?days=2` this is still only the newest one. */
  date: string;
  /** Every bucket included, newest first. `[date]` when days is 1 or absent. */
  dates: string[];
  count: number;
  /** ⚠ Ascending by kickoff across the WHOLE span — yesterday comes first. */
  events: ScoreboardEventView[];
}

/* ── Live ──────────────────────────────────────────────────────────────────
   Added 2026-08-27. `GET /cronogol/live` — the only route in this API that
   carries a MINUTE OF PLAY, and the only live data that joins to a fixture.

   ⚠⚠ **A THIRD source, and it merges with neither of the other two.** There
   are now three ways this API describes a match, and telling them apart is the
   whole point of this band:

     · the FIXTURE routes — our own ids and slugs, swept every ~3h. `status:
       "live"` there was true at the last sweep and the match has probably
       finished since.
     · the SCOREBOARD above — a scraped world feed, opta-keyed, swept every
       ~4h, no crosswalk to our clubs at all. Liveness on it is NOT
       trustworthy, which is what `./scores` exists to suppress.
     · THIS — refreshed every ~30s while a match is being played, and every row
       carries our own `fixtures.id`. Liveness is honest here and only here.

   ⚠ Because it joins, nothing like `scoreAbbr` is needed: `home.slug` and
   `away.slug` are our own slugs and the ordinary crest machinery applies.

   ⚠⚠ **This does not license un-suppressing the scoreboard.** `statusText` in
   `./scores` still returns `null` for a `live` row, and `concludedScores`
   still filters those rows out. That guard is about the 4-hourly sweep, which
   this change does nothing to make fresher. See `.claude/LIVE-SCORES.md` §1.
   ──────────────────────────────────────────────────────────────────────── */

/**
 * ⚠ Valores de protocolo — no traducir.
 *
 * ⚠ **Narrower than `FixtureStatus` and not `ScoreboardStatus` either.** A live
 * poll never observes a schedule change, so there is no `postponed` and no
 * `cancelled`; and unlike `FixtureStatus` there IS an `unknown`, because the
 * upstream's in-play vocabulary is only partly observed and an unrecognised
 * state is reported honestly rather than guessed. Do not widen one of the other
 * two unions to stand in for this — they describe different sources.
 */
export type LiveStatus = "scheduled" | "live" | "finished" | "unknown";

/** One side of a live match. ⚠ `slug` is OUR slug — it joins. */
export interface LiveTeamRef {
  slug: string;
  name: string;
  shortName: string | null;
}

export interface LiveMatchView {
  /**
   * ⚠⚠ **`fixtures.id` — OUR id.** The same `id` already on
   * `JornadaFixtureView`, `WindowFixtureView` and `FixtureView`, and the same
   * one `keys.fixtureEvents(id)` is keyed on. Join on THIS, never on names or
   * kickoff times. It is the capability `/cronogol/scores` structurally does
   * not have, and the reason a row already on screen can be UPGRADED with live
   * state rather than replaced by a parallel list.
   */
  fixtureId: string;
  home: LiveTeamRef;
  away: LiveTeamRef;
  kickoffUtc: string;
  status: LiveStatus;
  /**
   * ⚠ Null unless `status` is `'live'` — null before kick-off and null once
   * finished. Render nothing, never `0'`.
   * ⚠ **INCLUDES stoppage time.** `94` means "90+4". There is no split here.
   * Render `94′`, never `90+4′`.
   */
  minute: number | null;
  /** ⚠ Always null for LaLiga — the source folds stoppage into `minute`. */
  injuryTime: number | null;
  /**
   * ⚠ Null before kick-off, exactly as on the scoreboard. Null means "no score
   * yet" and never nil-nil — render `vs` or a dash, never `0 - 0`.
   */
  score: { home: number | null; away: number | null };
  /** ⚠ Always `{null, null}` today. In the shape for a second source. */
  halftime: { home: number | null; away: number | null };
  /**
   * ⚠ **"We looked", not "it changed."** It advances every ~30s during a live
   * match whether or not the score moved, which is precisely what makes it the
   * honest freshness signal and the right thing to drive a stalled-data
   * indicator from.
   *
   * ⚠ NOT the scoreboard's `lastUpdateAt`, which is the SOURCE's stamp.
   * `lastSourceUpdate()` in `./scores` must never be pointed at this.
   */
  lastSeenAt: string;
  /**
   * ⭐ **The in-play timeline** — who scored, who was booked, who came off
   * (backend §98, added 2026-08-28). It rides this route's own ~30s refresh, so
   * the panel needs no request of its own.
   *
   * ⚠⚠ **`[]` does NOT distinguish "nothing happened" from "not fetched yet."**
   * The backend is explicit that both render as nothing, which is the same thing
   * on screen. `score` is the tell if you ever need the difference: a non-zero
   * score beside an empty array means a fetch has not landed, **not** that the
   * goals were unattributed. ⚠ Never phrase either as "no goals".
   *
   * ⚠ `player.slug` is **usually null while live** — it resolves only when the
   * person matches a squad row the backend holds. Render `name`; treat the slug
   * as an optional link, never an identity. (The panel does not link at all
   * today — ADR 0045 defers it.)
   *
   * ⚠ **On an OWN GOAL, `teamSlug` is the SCORER's team, not the side that
   * benefited.** Passed through from the source rather than derived, and
   * unverified as of 2026-08-28. `eventKind` already draws `own-goal` as its own
   * mark precisely so the crest is not read as "who this helped".
   *
   * ⚠ **These VANISH at full time**, with the row itself. The durable
   * `/cronogol/fixtures/{id}/events` is the record from then on.
   *
   * ⚠ Carried only for the competitions this route covers (ADR 0139), like
   * everything else on it.
   *
   * ⚠⚠ **A one-sided timeline is a REAL shape, not a parse failure.** Seen in
   * production 2026-09-09 on Premier-League-synced cup ties, whose foreign
   * opponent resolved to no player names at all and whose events were dropped
   * upstream. Never infer a score from this array's contents.
   */
  events: LiveMatchEventView[];
}

/**
 * `GET /cronogol/live`.
 *
 * ⚠⚠ **An empty `matches` array is the NORMAL answer.** Most of the time
 * nothing is being played. It is an ordinary empty state, never an error.
 *
 * ⚠⚠ **Coverage is PER SYNCING PROVIDER, not per league** (verified against
 * production 2026-09-09; ADR 0139). The backend polls a fixture when its own
 * provider has a live adapter, with no competition filter — today `laliga` and
 * `premier-league`, so a Premier League club's CUP and EUROPEAN ties are served
 * live too. Serie A, Bundesliga and the Portuguese feed still return nothing —
 * a coverage gap, not a bug — and the existing non-live rendering stays the
 * fallback rather than being replaced.
 *
 * ⚠ A match can therefore arrive here as TWO rows with two fixture ids, one per
 * provider that syncs it, when both clubs are tracked through different sources
 * (seen: Liverpool v Atlético as `f3e96945` and `bd1a4cc8`). Their team slugs
 * differ too — see `LiveTeamRef`.
 *
 * ⚠⚠ **Rows DISAPPEAR when the match ends.** This route serves in-play matches
 * only; the final score arrives on `/cronogol/fixtures` (within ~3h) and
 * `/cronogol/scores` (within ~4h). A row vanishing is not an error, and this is
 * not a results feed.
 */
export interface LiveView {
  matches: LiveMatchView[];
  count: number;
  /**
   * Whether the backend currently has a session refreshing these rows.
   *
   * ⚠ `false` with an EMPTY `matches` is normal — nothing is being played.
   * ⚠ `false` with a NON-EMPTY `matches` means matches are live and nothing is
   * refreshing them. **That is the one failure mode this feature has**, and
   * without this field it looks identical to the line above.
   */
  polling: boolean;
}

/* ── Standings ─────────────────────────────────────────────────────────────
   Added 2026-08-14; `form` and `?matchweek=` added 2026-08-15.

   ⚠ **Derived from the fixtures the backend already holds** — there is no
   standings provider. That is why the route exists at all, and it is also the
   caveat: the table is exactly as complete as our fixture coverage. See
   `clubs`.

   ⚠ **The table carries no zones.** There is no `zone` field and no banding:
   which ranks mean Champions League, Europa, Conference or relegation varies
   by season and by federation decision and is not derivable from a table. The
   front end owns it — see `League.zones` in `./leagues`. A deliberate split,
   not a gap to file.                                                        */

/**
 * One criterion in a league's ordering rule.
 *
 * ⚠ Valor de protocolo — no traducir.
 *
 * ⚠ **Read `tiebreakers` off the response; never hardcode a rule, and never
 * re-sort.** LaLiga, Segunda and Serie A consult head-to-head BEFORE goal
 * difference; the Premier League never does; the Bundesliga does it last. A
 * client-side sort on `points, goalDifference` will not reproduce `rank` — the
 * API doc's own sample has Atlético ranked below Athletic on a worse goal
 * difference, and that is correct.
 */
export type StandingsTiebreaker =
  | "points"
  | "head-to-head-points"
  | "head-to-head-goal-difference"
  | "goal-difference"
  | "goals-for"
  /**
   * ⚠ UEFA league-phase criteria. These appear ONLY on
   * `UclStandingsView.tiebreakers` — no domestic table can emit them, and the
   * Champions League emits no head-to-head at all. That is the RULE, not an
   * omission: each club plays eight different opponents, so two tied clubs
   * have usually never met.
   *
   * ⚠ The cup's list STOPS at `away-wins`. UEFA's next criteria are
   * disciplinary points and club coefficient, neither of which the backend
   * holds — so for clubs still level below `away-wins` our order can differ
   * from uefa.com, which publishes a fully resolved table. `rank` stays
   * contiguous regardless; the residual tie falls to a club-slug sort that is
   * stable but arbitrary.
   */
  | "away-goals-for"
  | "wins"
  | "away-wins";

/** ⚠ Valor de protocolo — no traducir. The chip's letter is written at render. */
export type FormResult = "W" | "D" | "L";

export interface StandingsRowView {
  /**
   * 1..N, contiguous, no repeats.
   *
   * ⚠ Which the official rules are not: the Premier League's regulations say
   * clubs level on points, GD and goals scored *share* a position, and RFEF and
   * Lega settle a surviving tie with a playoff. Neither is expressible in a
   * table, so clubs equal on every criterion are finally ordered by club slug —
   * arbitrary, but stable across requests.
   *
   * ⚠ So two adjacent rows are not necessarily separated by anything real.
   * Compare `points` before telling a reader one club is "above" another.
   */
  rank: number;
  team: TeamRef;
  /** Finished LEAGUE matches only — never live, cup or friendly. */
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  /** 3-1-0. */
  points: number;
  /**
   * Last five results, NEWEST FIRST, at most five.
   *
   * ⚠ **Newest-first is the opposite of how a WWDLW chip strip renders** —
   * reverse it before mapping to chips. It is emitted this way deliberately, so
   * that a shortened array loses the OLDEST match rather than the most recent.
   *
   * ⚠ **Fewer than five is normal, `[]` is normal, and it is never null.** Early
   * season, a promoted club, and any club whose matches we do not fully hold
   * all produce a short array. There is no padding entry and no placeholder —
   * render fewer chips rather than filling the row.
   *
   * ⚠ **Counts exactly what `played` counts** — finished league matches only.
   * A guarantee rather than a coincidence: both come from the same rows, which
   * is precisely why this must not be derived from `GET /cronogol/fixtures`. A
   * `finished` fixture with null goals is a real stored shape; the backend
   * excludes it so the table under-reports rather than crediting a phantom 0-0,
   * and a client-side derive scores it a draw — printing chips that disagree
   * with the points column beside them, from the same data.
   */
  form: FormResult[];
}

export interface StandingsTableView {
  /** ⚠ Its `slug` is a `League.apiSlug`, never our URL slug. */
  league: LeagueRef;
  /** Starting year: 2026/27 is 2026. */
  season: number;
  /**
   * The matchday this table is AS OF, or null for the live table.
   *
   * ⚠ Echoed from the request, never computed. Null means "you asked for the
   * live table", NOT "we could not work out the current matchday" — there is no
   * field that reports the latter, and `matchesPlayed / (clubs / 2)` is not one
   * either: it equals the matchday only while nobody holds a game in hand. A
   * header reading "after matchday 24 of 38" comes from
   * `GET /cronogol/jornada/{league}/{season}`.
   */
  matchweek: number | null;
  /** The rule ACTUALLY applied, in order. ⚠ Differs per league. */
  tiebreakers: StandingsTiebreaker[];
  /**
   * Rows returned — the completeness signal, and there is deliberately no
   * `complete` flag because the obvious one would be true by construction.
   *
   * ⚠ **It under-reports exactly when coverage is worst**: a match between two
   * clubs the backend does not track is fetched by nobody, and both lose a
   * match from `played`, `points` and `goalDifference` with nothing in the
   * payload looking wrong. Compare it against what the league actually fields —
   * `League.clubCount` — before asserting anything positional. See `bandsApply`
   * in `./standings`, which is where this check lives.
   */
  clubs: number;
  /** Distinct matches counted, i.e. `sum(played) / 2`. */
  matchesPlayed: number;
  /**
   * `clubs * (clubs - 1)`. Null when `clubs` < 2.
   *
   * ⚠ **Not on the same scale as `matchesPlayed`**, which is distinct matches.
   * "20 of 380 played" is a false sentence built from these two fields.
   */
  matchesTotal: number | null;
  /**
   * ⚠ A KICKOFF, not an ingest time. It answers "as of when", never "how fresh
   * is this" — a table not synced for a week and a table where nothing has been
   * played for a week look identical here. Null before a ball is kicked, which
   * is when every club on zero is the correct table rather than an empty state.
   */
  lastMatchUtc: string | null;
  rows: StandingsRowView[];
}

/** `GET /cronogol/standings`. */
export interface StandingsView {
  /** The season every table is for, after defaulting. Always echoed. */
  season: number;
  /**
   * ⚠ **Empty, with a 200, for an unknown `?league=` slug** — this route
   * narrows a collection rather than resolving one, so there is no 404 to
   * catch. And a league with no stored rows is ABSENT from this array, not
   * present and empty, so a tab strip built from it can lose a league on a bad
   * sync. ⚠ Ours is built from THIS ARRAY, filtered through
   * `findLeagueByApiSlug` — not from `LEAGUES`, which is what this line
   * claimed until 2026-09-11. Corrected rather than deleted because the
   * hazard it names is real: a league missing from a sync loses its tab.
   *
   * ⚠ Ordered by league slug ascending — stable and diffable, but not
   * editorial. Do not read tab priority out of it.
   */
  tables: StandingsTableView[];
}

/* ── Champions League standings ──────────────────────────────────────────────
   `GET /cronogol/ucl/standings`, added 2026-09-11 (backend decision 0061,
   `CRONOGOL-API.md` §"the Champions League league-phase table").

   ⚠ **A SIBLING view, not a widened one.** `league_standings` filters
   `league_id is not null and competition = 'league'` — the predicate that keeps
   a European tie out of a domestic table — and the projected UCL rows carry
   `league_id: null` on purpose. So `GET /cronogol/standings?league=champions-league`
   answers `200 { tables: [] }`, which reads exactly like a coverage gap and is
   not one. This route is the only read of that competition's table.

   ⚠ **Render-path route, PROVISIONAL IN SHAPE.** The API doc reserves these
   three `/cronogol/ucl/*` routes for the poster pipeline and says a Champions
   League page is v2; `cronogol` honours that and calls none of them from a
   page. This app's Table screen is the first product surface built on it
   (ADR 0150) — the blast radius is deliberately `./competitions` and the one
   screen branch, so a reshape lands in one place.                            */

/**
 * One Champions League league-phase row.
 *
 * ⚠ **There is no `form`, and the field is ABSENT rather than always-empty** —
 * there is no cup form guide, so nothing has to guess what an empty array
 * meant. That is why `StandingsTableRowView` below types it optional and never
 * nullable.
 *
 * ⚠ `rank` is contiguous and off the wire. Never re-sort and never compare two
 * rows: the ordering rule is `tiebreakers`, which here carries UEFA criteria no
 * client-side `points, goalDifference` sort can reproduce.
 */
export interface UclStandingsRowView {
  rank: number;
  /**
   * ⚠ **Half these clubs are not in `GET /cronogol/teams`** — 18 of the 36,
   * measured 2026-09-11 (PSG, Oporto, Galatasaray, PSV, Feyenoord, Bodø/Glimt,
   * Slavia Praha…). Their club route answers `200` with `lastSyncedAt: null`,
   * which is trap 1, so nothing may link into a club page off this row without
   * checking the catalogue first (ADR 0154).
   *
   * ⚠ `shortName` is the monogram fallback. Populated on all 36 today, but
   * nullable and NOT unique.
   */
  team: TeamRef;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  /** 3-1-0. */
  points: number;
}

/** `GET /cronogol/ucl/standings`. */
export interface UclStandingsView {
  /** Starting year: 2026/27 is 2026. Echoed from the request after defaulting. */
  season: number;
  /**
   * The last COMPLETE matchday.
   *
   * ⚠⚠ **Derived on the server and rendered VERBATIM. Never recompute it** —
   * a caption and a picture must not be able to name different rounds. There is
   * no UCL matchweek index to walk, so `completedMatchweek` does not apply
   * here, and `matchesPlayed / (clubs / 2)` is not a substitute (the payload
   * does not even carry `matchesPlayed`).
   *
   * ⚠ **`null` is the COMMON case, not an edge.** The league phase runs Tuesday
   * to Thursday, so a round is half-played on two nights in three. It degrades
   * to the club count, which is trap 2's honest state.
   */
  matchday: number | null;
  /**
   * The entrant roster's size — **36 for a full field**.
   *
   * ⚠ A DIFFERENT statement from `StandingsTableView.clubs`. That one counts
   * the clubs we hold a fixture for and under-reports when coverage is worst;
   * this one comes from the stored `ucl_season_clubs` roster, so short means
   * the roster sync is incomplete. Either way: **refuse to band anything
   * shorter than 36** — the order below a missing club is wrong in a way that
   * looks entirely normal. See `cupBandsApply` in `./competitions`.
   */
  clubs: number;
  /** ⚠ A KICKOFF, not an ingest time — "as of when", never "how fresh". */
  lastMatchUtc: string | null;
  /** ⚠ Carries UEFA criteria and NO head-to-head. See `StandingsTiebreaker`. */
  tiebreakers: StandingsTiebreaker[];
  /**
   * ⚠ **36 clubs on zero is a CORRECT answer**, not an empty state — that is
   * the table between the July rollover and the first September kickoff. It is
   * also unbandable, because ties there fall to a club-slug sort (trap 20).
   */
  rows: UclStandingsRowView[];
}

/**
 * The row shape the standings ORGANISM draws — the intersection of a domestic
 * row and a cup row (ADR 0152).
 *
 * ⚠ `form` is **optional, never nullable**. The cup route omits the field
 * entirely and the API doc says it does so deliberately, "so nothing has to
 * guess what an empty array meant" — the type says the same thing. A domestic
 * row satisfies this by construction.
 */
export type StandingsTableRowView = Omit<StandingsRowView, "form"> & {
  form?: readonly FormResult[];
};

/* ── Squads ──────────────────────────────────────────────────────────────────
 *
 * `GET /cronogol/teams/{slug}/squad`, live since 2026-08-19 and served to the
 * shape `docs/features/club-players-tab.md` asked for — including the two
 * things that brief argued belong in the backend: `position` is mapped there to
 * the four-value union, and every player carries a stable `id`.
 *
 * ⚠ **LaLiga Primera only.** Every other league answers 200 with `players: []`
 * for a club we know and 404 for a slug we do not.
 */

/** ⚠ Valor de protocolo — no traducir. ⚠ Mapped in the BACKEND, never here. */
export type SquadPosition = "GK" | "DEF" | "MID" | "FWD";

export interface SquadNationality {
  /**
   * Alpha-3, upper-case — `ESP`, `BRA`.
   *
   * ⚠⚠ **The four home nations are FIFA codes, not ISO** — `ENG`, `SCO`, `WAL`,
   * `NIR`, because ISO 3166-1 has no alpha-3 for any of them. Anything
   * validating this against an ISO list rejects exactly the players an English
   * club's squad is full of. Two of Real Madrid's 25 are `ENG` today. Treat it
   * as an opaque label: display it, never parse it.
   */
  code: string;
  /** English country name, for the cell's `title`. */
  name: string;
}

/**
 * One squad member.
 *
 * ⚠ **Every field but `id`, `name` and `position` is nullable, and an absent
 * one renders as an empty cell** — never `—`, never `0`, never "Unknown". A
 * substituted value cannot be told apart from a real one by anyone reading the
 * page.
 *
 * ⚠ **Season statistics exist since 2026-09-09, but NOT on this type** — they
 * are a separate route, `GET /cronogol/players/{slug}/stats`, joined on `slug`
 * below (`PlayerStatsView`, ADR 0146, superseding this type's former "none are
 * coming"). Still absent everywhere and permanently: appearances, minutes and
 * anything per-90, because no source publishes lineup events.
 *
 * ⚠⚠ **This carries personal data about named living people, and squads
 * register 16- and 17-year-olds** — so `dateOfBirth` and `placeOfBirth` are
 * exact birth dates and home towns of minors, on an unauthenticated cacheable
 * route. `age` exists precisely so no UI has to touch either. **Prefer `age`,
 * and think hard before putting a date or a town on a public page.**
 */
/**
 * ⚠ Mapped in the BACKEND, lower-case, for the same reason `SquadPosition` is:
 * a raw provider value pushed to clients lets every client disagree about it.
 */
export type SquadFoot = "left" | "right" | "both" | null;

export interface SquadPlayerView {
  /**
   * ⚠ The PERSON id — stable across seasons *and* clubs, so it survives a
   * transfer. Safe as a React key. (The registration id is season-scoped and
   * would break every August, which is why it is not this.)
   */
  id: string;
  /**
   * Our `players.slug` — the ONLY key `GET /cronogol/players/{slug}/stats`
   * takes. Added to this view 2026-09-09 for exactly that: the squad used to
   * publish the provider id and no slug, so there was no way from a squad row
   * to a stats URL.
   *
   * ⚠⚠ **NULL FOR EVERY PREMIER LEAGUE PLAYER** — all 49 of Arsenal's, and
   * every leaderboard row too (verified 2026-09-10). So a squad row is a link
   * to season stats only where the slug is actually there, whatever a
   * per-league coverage table says about the stats themselves.
   *
   * ⚠ Not unique and not a key — display shorthand across ~39,000 people, two
   * of whom can share one. Identify a person by `id`; use this to build a URL.
   */
  slug: string | null;
  /** ⚠ Nullable, and a null shirt sorts LAST rather than as zero. */
  shirt: number | null;
  /** The full registered name — often the legal one, and long. */
  name: string;
  /** ⚠ Prefer this in a narrow cell; `name` overflows. Nullable — fall back. */
  shortName: string | null;
  position: SquadPosition;
  /** ⚠ The player's own, never derived from the club's `country`. */
  nationality: SquadNationality | null;
  /** Whole years, derived server-side against one clock per response. */
  age: number | null;
  heightCm: number | null;
  /**
   * Preferred foot.
   *
   * ⚠ **This was typed `null` until 2026-08-20**, deliberately, so that
   * rendering a value was a compile error rather than a column blank on every
   * row forever. The backend's §82 made it real: the Premier League serves it
   * for ~88% of its players.
   *
   * ⚠⚠ **LaLiga still publishes none, so every Spanish player is `null`
   * permanently.** A cell must render empty as normal, not as missing data —
   * which means the column is worth showing only where English clubs are.
   *
   * ⚠ `"both"` is a REAL value (23 of the Premier League's 960), not a
   * placeholder for unknown. Narrowing to `"left" | "right"` rejects exactly
   * the ambidextrous players it describes.
   */
  foot: SquadFoot;
  weightKg: number | null;
  /** ISO `YYYY-MM-DD`. ⚠ Personal data, including minors' — prefer `age`. */
  dateOfBirth: string | null;
  /** ⚠ Personal data. */
  placeOfBirth: string | null;
  /**
   * A 256×278 portrait, immutable and safe to cache hard.
   *
   * ⚠ **Null for roughly one in five**, worst on recent signings: the source
   * serves a grey silhouette for a player it has no photo of, and the backend
   * detects and drops it rather than storing a fake. Any consumer builds the
   * fallback before it builds the image.
   */
  photoUrl: string | null;
  international: boolean | null;
  /** Opta/Stats Perform player id, e.g. `p60772`. */
  optaId: string | null;
  loan: boolean | null;
  /** Loaned OUT to another club. */
  loanedOut: boolean | null;
}

/** `GET /cronogol/teams/{slug}/squad`. */
export interface TeamSquadView {
  /**
   * ⚠ Not a `TeamRef` — narrower, and it spells the crest `crestUrl` where
   * every other payload on this API says `logoUrl`. Do not swap one for the
   * other by muscle memory.
   */
  team: {
    slug: string;
    name: string;
    shortName: string | null;
    crestUrl: string | null;
  };
  /**
   * Starting year: 2026 is 2026/27.
   *
   * ⚠ Nullable — the honest answer for a tracked club with no stored squad,
   * which is a 200 rather than a 404. Never a guessed year.
   */
  season: number | null;
  /**
   * ⚠ **Freshness, not transfer news.** It advances on every weekly sweep
   * whether or not a single thing about the squad changed.
   */
  lastSyncedAt: string | null;
  /**
   * ⚠ Unordered and ungrouped, as asked — the four bands and the shirt order
   * within them are presentation, decided once in `groupSquad`.
   *
   * ⚠⚠ **This is the LEAGUE'S REGISTRATION LIST, not the club's squad page,
   * and the two legitimately differ.** Verified against Real Madrid's own
   * 2026-08-19 numbering: 25 of 25 matched and none disagreed, but the club
   * additionally listed a player not yet registered with the league. A signing
   * is missing here for a few days after it is announced — which is why the UI
   * says "registered squad" rather than "squad".
   *
   * ⚠ A player whose provider position cannot be mapped to one of the four
   * bands is dropped upstream and logged as an error, never defaulted into
   * `MID`. **If a squad looks short, that is the first thing to check.**
   */
  players: SquadPlayerView[];
}

/* ── One match's timeline ───────────────────────────────────────────────────
 *
 * ⚠ `ScoreboardEventView` above is NOT related. There, an "event" is a whole
 * MATCH on `/cronogol/scores`; here it is one incident inside a match. The two
 * share a word and nothing else — no ids, no source, no route.
 */

/**
 * `type` on a match event.
 *
 * ⚠ `'unknown'` is a REAL value you must render, not an error. It means the
 * source described something the backend has no name for yet, which will
 * happen — the underlying vocabulary is long-tailed. Show it as a neutral
 * timeline entry; never drop the row.
 */
export type MatchEventTypeView =
  | 'goal'
  | 'card'
  | 'substitution'
  | 'var'
  | 'missed-penalty'
  | 'unknown';

export interface MatchEventPersonView {
  /**
   * The display name as the source renders it — `Vini Jr.`, `Bellingham`,
   * `Malen`. Not a legal name, and not normalised: LaLiga's own casing is
   * occasionally poor (`C.soler`).
   */
  name: string;
  /**
   * Our `players.slug`, for linking to a squad page.
   *
   * ⚠⚠ **NULL FOR EVERY SERIE A AND BUNDESLIGA PERSON, ALWAYS.** Squads exist
   * for LaLiga and the Premier League only. Fall back to plain text — do not
   * hide the event.
   *
   * ⚠ Unread today (ADR 0045 defers player links): this is a PLAYER slug, and
   * the sheet ADR 0033 ships keys on `{club slug, person id}`. Linking needs a
   * squad fetch per panel and a slug→id map, which the timeline does not do.
   */
  slug: string | null;
}

/** One event on `GET /cronogol/fixtures/{id}/events` */
export interface MatchEventView {
  id: string;
  type: MatchEventTypeView;
  /**
   * The narrowing within a type: `normal` · `penalty` · `own` · `yellow` ·
   * `second-yellow` · `red` · `tactical` · `injury`, plus slugged free text for
   * VAR decisions.
   *
   * ⚠ An OPEN string, deliberately not a union — a closed type would reject
   * real data. Switch on `type`; treat this as a label. Null on Premier League
   * substitutions, which do not distinguish tactical from injury.
   */
  subtype: string | null;
  /** Regulation minute. Null means the source did not say — do not render 0. */
  minute: number | null;
  /**
   * Stoppage-time offset.
   *
   * ⚠ **Serie A only** — 65 of 1,005 rows. LaLiga and the Premier League fold
   * stoppage into `minute`, so a 90+4 arrives from them as
   * `minute: 94, minuteExtra: null`. Render `45+2`, ⚠ **never the sum**: `47`
   * is a minute that did not happen. `minuteLabel` in `./events` is the one
   * copy of that rule.
   */
  minuteExtra: number | null;
  /** The source's period label — `SecondHalf`, `2ª parte`. Free text. */
  period: string | null;
  /** The club, as `TeamView.slug`. Null on a VAR decision belonging to neither. */
  teamSlug: string | null;
  /** Scorer · booked player · the player coming ON. */
  player: MatchEventPersonView;
  /**
   * The assister when `type === 'goal'`; the player going OFF when
   * `type === 'substitution'`. Null on everything else.
   *
   * ⚠ Null on a goal means UNASSISTED, not missing — about a third of goals
   * have no assister recorded.
   */
  related: MatchEventPersonView | null;
}

/**
 * Everything the timeline RENDERS from: every field of `MatchEventView` except
 * its stored-row `id`.
 *
 * ⚠⚠ **This exists because the panel now has TWO sources** (ADR 0051). The
 * durable route serves stored rows with an `id`; `GET /cronogol/live` serves the
 * in-play timeline WITHOUT one, deliberately — a live event has no stable id at
 * every source, and a client keying on one would break at full time when the
 * durable row replaces it. Every pure function in `./events` takes this, so one
 * set of rules serves both.
 */
export type TimelineEventView = Omit<MatchEventView, "id">;

/**
 * One event in the in-play timeline on `GET /cronogol/live` (backend §98).
 *
 * ⚠ **An alias, not a copy, and deliberately so.** The backend states the two
 * shapes are identical but for `id` — *"same field names … so you render it
 * with the same component"* — and two hand-maintained copies of one wire shape
 * is how they drift. If they ever genuinely diverge, this is the line to split.
 */
export type LiveMatchEventView = TimelineEventView;

/** GET /cronogol/fixtures/{id}/events */
export interface FixtureEventsView {
  fixtureId: string;
  /**
   * Chronological, as ordered by the server.
   *
   * ⚠⚠ **Do NOT re-sort on `minute`.** Events share a minute often and this
   * order encodes each source's own chronology; sorting client-side will flip
   * substitution pairs between renders.
   *
   * ⚠⚠ **An empty array does NOT mean a goalless match** — it means nothing is
   * stored for that fixture yet. The sweep is 3-hourly and finished-only, so a
   * 4-1 that ended twenty minutes ago arrives here as `count: 0`.
   */
  events: MatchEventView[];
  count: number;
}

/* ── Season stats ────────────────────────────────────────────────────────────
 *
 * `GET /cronogol/teams/{slug}/stats`, `GET /cronogol/players/{slug}/stats` and
 * `GET /cronogol/stats/leaders`, live since 2026-09-09 (backend §120, decision
 * `0058`). Copied verbatim from `CRONOGOL-API.md`'s TypeScript block — the
 * `⚠` comments are the contract, not decoration.
 *
 * ⚠⚠ **A null is never a zero.** Every nullable field below means "we do not
 * know", and the two reasons are independent: the competition holds no
 * trustworthy events, or the season is too thinly swept. Rendering one as `0`
 * is the single most damaging thing this app can do with these routes.
 *
 * ⚠ All three are `Cache-Control: public, max-age=300` over rows a sweep
 * rebuilds every three hours. Nothing here is live and nothing here triggers a
 * fetch — see `STALE.stats`.
 */

/**
 * How much of a season actually reconciled.
 *
 * ⚠⚠ **When `sufficient` is false, EVERY event-derived field in the same block
 * is null, together.** They are nulled as a group on purpose: a real card count
 * beside a null comeback count invites the reader to assume the null is a zero.
 *
 * ⚠ `fixturesCounted` and `fixturesTotal` are CLUB FIXTURES, not appearances —
 * there are no lineup events at any source. A label saying "apps" is wrong.
 */
export interface StatsCoverageView {
  /** Club fixtures whose stored timeline reconciled to the stored scoreline. */
  fixturesCounted: number;
  /** Club fixtures played, whether we hold their events or not. */
  fixturesTotal: number;
  ratio: number;
  /** ⚠ When false, EVERY event-derived field in the same block is null. */
  sufficient: boolean;
}

/**
 * Goals bucketed by minute band — `1-15`, `16-30`, `31-45`, `46-60`, `61-75`,
 * `76-90`, `90+`.
 *
 * ⚠⚠ **This sums to ≤ the goal total, never to it.** A goal with no recorded
 * minute counts in `goals`/`goalsFor` and is dropped from the bands, so any
 * share computed over it must use the BANDED total as its denominator. See
 * `bandTotal` in `./stats`.
 *
 * ⚠ Keys are wire strings and the set is not guaranteed complete — a band with
 * no goals may be absent or present as `0`. Read by key with a fallback, never
 * by position.
 */
export type GoalBandsView = Record<string, number>;

/** A single named fixture — a hat-trick, a booking. */
export interface StatsMomentView {
  fixtureId: string;
  /** ⚠ null when the opposing club has no slug. Rare, but real. */
  opponent: { slug: string; name: string } | null;
  /** ⚠ null for cups and Champions League knockouts. */
  matchweek: number | null;
  kickoffUtc: string;
  /** Present on a hat-trick. */
  goals?: number;
  /** Present on a booking. */
  minute?: number;
  /** `yellow` | `second-yellow` | `red`. Present on a booking. */
  card?: string;
}

/**
 * A named fixture on a MERGED block.
 *
 * ⚠⚠ `competition` is the only thing that says which table `fixtureId` lives
 * in — `fixtures` or `ucl_fixtures`. On a `seasons[]` row the row's own
 * `competition` disambiguates it; a merged block has no such row, so the value
 * travels on the moment itself. It disambiguates `matchweek` too.
 */
export interface StatsMergedMomentView extends StatsMomentView {
  /** ⚠ An API competition slug (`champions-league`). */
  competition: string;
}

/** One competition-season of a player's record. */
export interface PlayerSeasonStatsView {
  /** ⚠ The STARTING year: 2026 means 2026/27. */
  season: number;
  /** ⚠ An API competition slug (`laliga`), not our `League.slug`. */
  competition: string;
  teams: { slug: string; name: string }[];
  /** ⚠ Own goals are NOT counted here. */
  goals: number;
  assists: number;
  /** ⚠ Served, not computed — do not re-add goals and assists. */
  goalInvolvements: number;
  penaltyGoals: number;
  /** ⚠ null on premier-league and serie-a: a miss is not observable there. */
  penaltiesMissed: number | null;
  /** 0–1, not a percentage. ⚠ null wherever `penaltiesMissed` is. */
  penaltyConversion: number | null;
  ownGoals: number;
  yellows: number;
  secondYellows: number;
  reds: number;
  braces: number;
  hatTricks: number;
  /**
   * One entry per hat-trick, always the same length as `hatTricks`.
   *
   * ⚠ A four-goal game is ONE entry. ⚠ Event-derived: `null` below the
   * coverage floor, `[]` when there genuinely were none.
   */
  hatTrickFixtures: StatsMomentView[] | null;
  /**
   * The earliest minute the player was carded all season.
   *
   * ⚠ Cards with no recorded minute are excluded, so this is the earliest
   * PLACEABLE booking. ⚠⚠ `null` below the coverage floor AND `null` for a
   * player never booked — the two are NOT distinguishable here, so read
   * `coverage.sufficient` before telling anyone he was never booked.
   */
  quickestBooking: StatsMomentView | null;
  superSubGoals: number;
  /**
   * ⚠⚠ Consecutive CLUB MATCHES with a goal — **not appearances**. A benched
   * match breaks ours and not a broadcaster's, so render it with the club
   * named ("scored in 6 straight Barcelona matches") rather than as a bare
   * number that will sometimes read lower than every other source.
   */
  longestScoringStreak: number;
  /** ⚠ null once the season goes stale — a 2024 season has no current streak. */
  currentScoringStreak: number | null;
  goalsByBand: GoalBandsView | null;
  /**
   * ⚠ Sparse, and only over fixtures that carry a matchweek, so it does NOT
   * sum to `goals`. ⚠ `null`, never `{}`.
   */
  goalsByMatchweek: Record<string, number> | null;
  coverage: StatsCoverageView;
}

/**
 * ONE SEASON of a player's record, merged across every competition
 * (`senpai-backend` §120.15, shipped 2026-09-10; ADR 0149).
 *
 * ⚠⚠ **This is the block the HEADLINE FIGURES read.** `seasons[]` is the
 * per-competition drill-down and the charts' source; this is the answer to
 * "what did he do this season". Valverde's 2026 merge is `goals: 1` where his
 * `laliga` block is `goals: 0` — that gap is the whole reason it exists
 * (ADR 0148).
 *
 * ⚠⚠ **An event-derived field is null unless EVERY contributing competition
 * published a number.** The raw counters (`goals`, `assists`, the cards) are
 * served either way and can only ever be too LOW, never invented.
 *
 * ⚠⚠ **`coverage.sufficient` is an AND across the contributing competitions,
 * not a ratio.** Valverde's merged 2026 block reads `ratio: 1` with
 * `sufficient: false` — five of five fixtures counted, a perfect ratio, still
 * refused, because the Champions League half is one fixture and under the
 * absolute floor of 3. Do NOT recompute it from `fixturesCounted /
 * fixturesTotal`: that is the laundering the backend exists to refuse, and it
 * would publish event numbers for a competition that declined to publish them.
 * Expect `false` for every club in Europe until roughly late October.
 */
export interface PlayerSeasonTotalsView {
  /** ⚠ The STARTING year: 2026 means 2026/27. */
  season: number;
  /**
   * Every competition folded in, slug-ascending.
   *
   * ⚠ There is no `competition` field — this is not a season ROW. ⚠ A block of
   * length 1 IS that competition's block, so a screen must not label it "all
   * competitions": there is nothing else in it.
   */
  competitions: string[];
  /** ⚠ Deduped by slug in competition order — NOT a chronology. */
  teams: { slug: string; name: string }[];
  /** ⚠ Own goals are NOT counted here. */
  goals: number;
  assists: number;
  /** ⚠ Served, not computed — do not re-add goals and assists. */
  goalInvolvements: number;
  penaltyGoals: number;
  penaltiesMissed: number | null;
  /**
   * 0–1, not a percentage.
   *
   * ⚠ Recomputed from the merged counts, never averaged from the per-competition
   * ratios. ⚠ null unless EVERY competition can observe a miss — only the
   * LaLiga family maps `missed-penalty`, so a merge including the Premier
   * League or Serie A is null here by construction.
   */
  penaltyConversion: number | null;
  ownGoals: number;
  /**
   * ⚠⚠ NON-nullable, unlike `TeamSeasonTotalsView`'s cards and unlike every other
   * merged event field — narrowed on the backend 2026-09-10 after this app
   * reported it (`senpai-backend` decision `0058`, "Amended"). A player ROW's
   * cards are non-nullable on the wire, so the all-or-null merge can only ever
   * find numbers. Do not widen it back to match the club block.
   *
   * ⚠⚠ **A number here is NOT a trustworthy number.** Below the coverage floor
   * these still answer `0`, which is "we did not look" wearing the costume of
   * "it did not happen" — the hazard ADR 0148 gates against. Gate on
   * `coverage.sufficient`, never on nullability. This screen sidesteps it
   * entirely by reading discipline from the LEAGUE block (ADR 0149).
   */
  yellows: number;
  secondYellows: number;
  reds: number;
  braces: number;
  hatTricks: number;
  hatTrickFixtures: StatsMergedMomentView[] | null;
  quickestBooking: StatsMergedMomentView | null;
  superSubGoals: number;
  /**
   * ⚠⚠ **A MAX across competitions, and therefore a LOWER BOUND — not a merged
   * run.** A league goal followed by a European one is a true run of 2 that
   * reads as 1, because matches from two competitions are never sequenced
   * against each other for a player. It must NOT be printed as an
   * all-competitions streak; render the per-competition one from `seasons[]`
   * and name the competition (ADR 0148 item 3).
   *
   * ⚠ Contrast `TeamSeasonTotalsView.longestScoringRun`, which IS a real merged
   * run — the club side has a merged timeline to recompute over and the player
   * side does not.
   */
  longestScoringStreak: number;
  goalsByBand: GoalBandsView | null;
  coverage: StatsCoverageView;
  /* ⚠⚠ There is deliberately NO `goalsByMatchweek` — matchweek numbers are
   * per-competition NAMESPACES, so merging `{"5": 2}` with `{"5": 1}` would
   * invent a matchweek in which he scored three goals. No merged form exists
   * and none is coming; ADR 0145's chart reads `seasons[]` permanently.
   * ⚠ And no `currentScoringStreak` — a MAX would overstate it. */
}

/** A player's career total across the seasons that cleared the floor. */
export interface PlayerOverallStatsView {
  goals: number;
  assists: number;
  goalInvolvements: number;
  penaltyGoals: number;
  ownGoals: number;
  yellows: number;
  secondYellows: number;
  reds: number;
  braces: number;
  hatTricks: number;
  superSubGoals: number;
  /** ⚠ MAX across seasons, never a sum. */
  longestScoringStreak: number;
  seasonsCounted: number;
  seasonsTotal: number;
}

/**
 * `GET /cronogol/players/{slug}/stats`.
 *
 * ⚠ A known player with no stats is a `200` with `seasons: []` and
 * `overall: null` — a quiet season is not a missing person. `404` is an
 * unknown slug.
 *
 * ⚠⚠ `409` means the slug is AMBIGUOUS: `players.slug` is display shorthand
 * with no uniqueness guarantee across ~39,000 people, and the body carries
 * `candidates`. Rare, real, and the backend will not guess.
 */
export interface PlayerStatsView {
  /** ⚠⚠ THE stable key. `slug` is neither unique nor permanent. */
  playerId: string;
  /** ⚠ Nullable AND not unique — a link target, never a key. */
  slug: string | null;
  name: string;
  seasons: PlayerSeasonStatsView[];
  /**
   * The same seasons merged across competitions, newest first (ADR 0149).
   *
   * ⚠ Always present; `[]` only when there are no stats at all. ⚠ One entry per
   * SEASON here, against one per competition-season in `seasons`.
   */
  seasonTotals: PlayerSeasonTotalsView[];
  /** ⚠ null when no season has enough coverage. */
  overall: PlayerOverallStatsView | null;
}

/** A club's home or away half-season. Scoreline-derived, so never null. */
export interface TeamVenueSplitView {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
}

/** A club's biggest win or defeat. */
export interface TeamResultRefView {
  /**
   * ⚠ A `fixtures` id — or a `ucl_fixtures` id when the season's `competition`
   * is `champions-league`. The value does not say which; the competition does.
   */
  fixtureId: string;
  /** ⚠ null when the opposing club has no slug. Rare, but real. */
  opponent: { slug: string; name: string } | null;
  /** ⚠ null for cups and Champions League knockouts. */
  matchweek: number | null;
  goalsFor: number;
  goalsAgainst: number;
  kickoffUtc: string;
}

/** A club's biggest win or defeat on a MERGED block. */
export interface TeamMergedResultRefView extends TeamResultRefView {
  /**
   * ⚠⚠ The only thing that says which table `fixtureId` lives in, and the only
   * thing that makes `matchweek` readable — "MD1" means two different nights
   * once two competitions share a block.
   */
  competition: string;
}

/**
 * One finished fixture in a club's season, in KICKOFF order.
 *
 * ⚠⚠ **Kickoff order is the axis; `mw` is a LABEL.** Matchweeks sort by
 * number, which is not chronological — a postponement really does put
 * matchweek 2 before matchweek 1, and Barcelona's live 2026 timeline reads
 * `2, 1, 3, 4` today. Plot on the array index, never on `mw`.
 *
 * ⚠ `mw` is null for every Champions League knockout round, which is why `ko`
 * is on every entry: it is the only label a cup chart can fall back on.
 *
 * ⚠ Built over EVERY finished fixture, not only the ones whose events
 * reconciled — a badly swept match is still a real scoreline. So
 * `sum(timeline[].gf) === goalsFor`, exactly, always. Prefer it over
 * `goalsForByBand` wherever either would do.
 */
export interface StatsTimelineEntryView {
  id: string;
  /** ⚠ null for cups and Champions League knockouts. */
  mw: number | null;
  /** Kickoff, ISO — the label to fall back on where `mw` is null. */
  ko: string;
  home: boolean;
  gf: number;
  ga: number;
}

/**
 * One finished fixture on a club's MERGED season, in kickoff order.
 *
 * ⚠⚠ **Competitions are INTERLEAVED, not concatenated** — this is a real
 * chronology across every competition the club played, which is why the club
 * side can merge its cumulative line and run strip and the player side cannot.
 * `home.played + away.played === timeline.length`, always.
 *
 * ⚠⚠ **`mw` stops being a usable LABEL here, not just a usable axis.**
 * Barcelona's merged 2026 timeline reads `mw [2, 1, 3, 4, 1]` today: the first
 * `1` is LaLiga matchday 1 and the last is Champions League matchday 1, two
 * different nights printing the same "MD1". Group or label by `mw` on a merged
 * timeline and the chart states something false — see `goalsByMatchweek` and
 * `axisLabels`, both of which refuse to.
 */
export interface StatsMergedTimelineEntryView extends StatsTimelineEntryView {
  /** ⚠ An API competition slug. Disambiguates `id` AND `mw`. */
  competition: string;
}

/** The club's longest run of matches scored in. */
export interface ScoringRunView {
  /** Always equals the club's `longestScoringRun`. */
  length: number;
  /**
   * ⚠ Indices INTO `timeline`, so highlighting the run inside the squares
   * strip needs no matching logic — slice on these.
   */
  startIndex: number;
  endIndex: number;
  /** ⚠ null on a cup run — render the kickoffs instead of "MD9 → MD29". */
  fromMatchweek: number | null;
  toMatchweek: number | null;
  fromKickoffUtc: string;
  toKickoffUtc: string;
}

/** One competition-season of a club's record. */
export interface TeamSeasonStatsView {
  /** ⚠ The STARTING year: 2026 means 2026/27. */
  season: number;
  /** ⚠ An API competition slug (`laliga`), not our `League.slug`. */
  competition: string;

  /* Scoreline-derived — ALWAYS numbers, for EVERY competition including the
   * Bundesliga, because they need no event data at all. */
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  failedToScore: number;
  longestScoringRun: number;
  longestUnbeatenRun: number;
  longestWinningRun: number;
  biggestWin: TeamResultRefView | null;
  biggestDefeat: TeamResultRefView | null;
  home: TeamVenueSplitView;
  away: TeamVenueSplitView;
  /**
   * ⚠⚠ Scoreline-derived, so ALWAYS present — every competition, including the
   * Bundesliga, where it is the only chart that works. Never null; an empty
   * array means no finished fixtures, not missing data.
   */
  timeline: StatsTimelineEntryView[];
  /** ⚠ null only when the club never scored. Also scoreline-derived. */
  scoringRun: ScoringRunView | null;

  /* Event-derived — ⚠⚠ null where coverage is absent. NEVER 0. */
  comebackWins: number | null;
  comebackPoints: number | null;
  yellows: number | null;
  secondYellows: number | null;
  reds: number | null;
  goalsForByBand: GoalBandsView | null;
  goalsAgainstByBand: GoalBandsView | null;
  coverage: StatsCoverageView;
}

/**
 * ONE SEASON of a club's record, merged across every competition it played
 * (`senpai-backend` §120.15; ADR 0149).
 *
 * ⚠⚠ **The club side merges far further than the player side, and the asymmetry
 * is the point:** `timeline` below is a real merged, kickoff-ordered chronology,
 * so the runs and the venue splits are RECOMPUTED over it — not summed, not
 * maxed. A player has no merged timeline, so a player's streak is only ever a
 * lower bound. Real Madrid's merged 2026 `goalsFor` is 12 against its `laliga`
 * block's 10.
 *
 * ⚠⚠ Same two rules as the player block: an event-derived field is null unless
 * EVERY competition published a number, and `coverage.sufficient` is an AND
 * across the contributors rather than a ratio. Never recompute it.
 */
export interface TeamSeasonTotalsView {
  /** ⚠ The STARTING year: 2026 means 2026/27. */
  season: number;
  /**
   * Every competition folded in, slug-ascending.
   *
   * ⚠ There is no `competition` field — this is not a season ROW. ⚠ A block of
   * length 1 IS that competition's block: Bayern's merged 2026 block is its
   * Bundesliga block, byte for byte, so nothing may label it "all competitions".
   */
  competitions: string[];

  /* Scoreline-derived — always numbers, for every competition. */
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  failedToScore: number;
  /**
   * ⚠⚠ RECOMPUTED over the merged timeline — a genuine all-competitions run,
   * unlike the player's `longestScoringStreak`. So its label must NOT name a
   * competition when the block holds more than one.
   */
  longestScoringRun: number;
  longestUnbeatenRun: number;
  longestWinningRun: number;
  biggestWin: TeamMergedResultRefView | null;
  biggestDefeat: TeamMergedResultRefView | null;
  home: TeamVenueSplitView;
  away: TeamVenueSplitView;
  /** ⚠ Kickoff-ordered and INTERLEAVED. Never null; `[]` means none finished. */
  timeline: StatsMergedTimelineEntryView[];
  /**
   * ⚠⚠ `startIndex`/`endIndex` address the MERGED `timeline` above. Feeding
   * them a per-competition array highlights the wrong matches.
   */
  scoringRun: ScoringRunView | null;

  /* Event-derived — ⚠⚠ null unless EVERY merged competition published a number.
   * Never 0. Expect null for a club in Europe until the UCL clears the floor. */
  comebackWins: number | null;
  comebackPoints: number | null;
  yellows: number | null;
  secondYellows: number | null;
  reds: number | null;
  goalsForByBand: GoalBandsView | null;
  goalsAgainstByBand: GoalBandsView | null;
  coverage: StatsCoverageView;
}

/**
 * `GET /cronogol/teams/{slug}/stats`. `404` on an unknown club slug, like
 * `teams/{slug}/squad`.
 *
 * ⚠⚠ **`seasons` carries one block per competition-season, not one per
 * season.** Barcelona answers with 2026 champions-league, 2026 laliga AND 2025
 * champions-league today. Pick a block with `pickSeason` in `./stats`; reading
 * `seasons[0]` renders a cup record under a league heading.
 *
 * ⚠ **No `played`, `won`, `drawn`, `lost` or `points`** — they live in
 * `GET /cronogol/standings` and a copy here could only drift out of step with
 * the league table. `coverage.fixturesTotal` *is* played. The venue splits do
 * carry W/D/L, because a home/away split is a fact the standings do not serve.
 */
export interface TeamStatsView {
  team: { slug: string; name: string };
  seasons: TeamSeasonStatsView[];
  /**
   * The same seasons merged across competitions, newest first (ADR 0149).
   *
   * ⚠ Always present; `[]` only when there are no stats at all. ⚠ One entry per
   * SEASON here, against one per competition-season in `seasons`.
   */
  seasonTotals: TeamSeasonTotalsView[];
}

/**
 * ⚠ Valor de protocolo — no traducir. Anything else is a `400`.
 */
export type StatsMetric =
  | "goals"
  | "assists"
  | "goal-involvements"
  | "pen-goals"
  | "yellows"
  | "reds"
  | "hat-tricks"
  | "scoring-streak";

export interface StatsLeaderView {
  rank: number;
  playerId: string;
  /**
   * ⚠⚠ **NULL FOR EVERY PREMIER LEAGUE PLAYER** (verified 2026-09-10, top of
   * the goal chart down). Without it there is no `/cronogol/players/{slug}`
   * URL to build, so a leaderboard row is not always a link.
   */
  slug: string | null;
  name: string;
  teams: { slug: string; name: string }[];
  value: number;
  coverage: StatsCoverageView;
}

/**
 * `GET /cronogol/stats/leaders?league=&season=&metric=&limit=`.
 *
 * ⚠⚠ `league` is REQUIRED — omitting it is a `400`, not a merged table, and
 * there is no cross-competition mode: assist rates differ per provider and
 * Serie A has no player identity, so a merged ranking would rank the provider
 * rather than the footballer.
 *
 * ⚠ An UNKNOWN league slug is `200` with `leaders: []`, not a 404 — it narrows
 * a collection. Contrast the two routes above, where the slug *names* the
 * resource and a miss is a 404.
 *
 * ⚠ Rows below the coverage floor are excluded from the ranking entirely
 * rather than listed with a null value.
 */
export interface StatsLeadersView {
  competition: string;
  /** Echoed, so a client that omitted it knows what it got. */
  season: number;
  metric: string;
  /** ⚠ Ranked within ONE competition. There is no cross-league mode. */
  leaders: StatsLeaderView[];
}
