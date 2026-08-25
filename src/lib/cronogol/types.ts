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
   */
  email: string | null;
  /** null until the user sets one; an email/password signup starts with none. */
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
  | "goals-for";

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
   * sync. Ours is built from `LEAGUES`.
   *
   * ⚠ Ordered by league slug ascending — stable and diffable, but not
   * editorial. Do not read tab priority out of it.
   */
  tables: StandingsTableView[];
}

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
 * ⚠⚠ **There are no player statistics and none are coming.** No appearances,
 * goals, assists, minutes or cards, from any provider, at any price point the
 * backend holds — getting them is a new paid contract, not a new field. Do not
 * build a column against this type expecting one.
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
