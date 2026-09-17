/**
 * The STANDINGS widget's contract — what `StandingsWidget.swift` is allowed to
 * know (ADR 0185).
 *
 * ⚠⚠ **A THIRD FILE in the App Group, `widget/standings.json`**, beside
 * `snapshot.json` and `news.json`, for the reason `news/snapshot.ts` gives:
 * tables move when a match is played, fixtures when a round is published, and
 * one file would make the writer hold both to update either.
 * `targets/widget/StandingsSnapshot.swift` is this file's mirror; a field added
 * to one is a blank on the tile until it is added to both.
 *
 * ⚠⚠ **Every table the reader could pick is written, not just one.** The
 * league is chosen in the widget's own Edit sheet, which runs in the extension
 * and never tells the app — so the app cannot know which table a placed tile
 * wants. Seven small tables is a few kilobytes.
 *
 * ⚠⚠ **All policy is decided HERE, none in Swift.** Whether a table may be
 * banded (`bandsApply` / `cupBandsApply`), which band a rank falls in, where the
 * zone hairlines go, and which 20 of the Champions League's 36 rows are shown —
 * each is a function the Table tab already runs, and a second implementation in
 * Swift is a tile that can disagree with the screen it opens.
 *
 * ⚠ PURE — no `expo-file-system` import, so `scripts/standings-widget-harness.mjs`
 * can run it in plain node. The write lives in `./sync`.
 */
import { UCL_LEAGUE_PHASE, cupBandFor, cupBandsApply, type CupBandKind } from '@/lib/cronogol/competitions';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import type { ZoneKind } from '@/lib/cronogol/leagues';
import {
  bandsApply,
  completedMatchweek,
  editorialTables,
  signedGoalDifference,
  zoneFor,
} from '@/lib/cronogol/standings';
import type {
  ClubCrestView,
  SeasonJornadasView,
  StandingsTableView,
  TeamRef,
  UclStandingsView,
} from '@/lib/cronogol/types';
import type { Copy } from '@/lib/i18n/copy';

/** Bump when `StandingsSnapshot` changes shape. */
export const STANDINGS_SNAPSHOT_VERSION = 1;

/**
 * Row SLOTS on the tile — the handoff's 20 rows at 15pt. A seam, when drawn,
 * takes one of them.
 */
export const STANDINGS_SLOTS = 20;

export type StandingsBand = ZoneKind | CupBandKind;

export interface StandingsWidgetRow {
  /** Off the wire, 1-based and contiguous. Never re-derived from the index. */
  rank: number;
  teamSlug: string;
  /**
   * `displayName` — the Table tab row's own name, legal prefixes dropped.
   *
   * ⚠⚠ **NOT `widgetName`**, which the other tiles use. Past eleven characters
   * it falls back to the LAST word, and on a table that printed `Madrid` for
   * Atlético and a second `Barcelona` for Espanyol — two rows apart. The name
   * column here is the flexible one (~110pt on the smallest large tile), and
   * the longest real name, `Borussia Mönchengladbach`, fits it.
   */
  name: string;
  /** The tile's fallback letters. */
  abbr: string;
  played: number;
  /** `+7`, `-3`, `0` — `signedGoalDifference`. */
  goalDiff: string;
  points: number;
  followed: boolean;
  /**
   * `standings-crests/{crestFile}` in the App Group, or null → lettered tile.
   * ⚠ A statement about a file that EXISTS — the crests are warmed before this
   * is built — never a promise about a download.
   */
  crestFile: string | null;
  /** Null when mid-table OR when the table may not be banded at all. */
  band: StandingsBand | null;
  /** A 0.5pt hairline above this row — where the band GROUP changes. */
  ruleAbove: boolean;
  /** A `···` seam above this row — rows were skipped to reach it. */
  seamAbove: boolean;
}

export interface StandingsWidgetTable {
  /** The ROUTE slug — `la-liga`, `champions-league`. The intent's entity id. */
  slug: string;
  /** The Edit sheet's label — `LaLiga`, `Champions League`. */
  name: string;
  /** `LALIGA · AFTER MD 4`, or just `LALIGA` before a round completes. */
  meta: string;
  /** Opens the Table tab on this league. */
  url: string;
  /** At most `STANDINGS_SLOTS` minus one per seam. */
  rows: StandingsWidgetRow[];
}

export interface StandingsSnapshot {
  v: number;
  writtenAt: string;
  /**
   * The league an UNCONFIGURED widget shows — the reader's current pick in the
   * app (ADR 0164). ⚠ Always one of `tables[].slug` when `tables` is non-empty.
   */
  defaultSlug: string | null;
  copy: {
    title: string;
    pl: string;
    gd: string;
    pts: string;
    empty: string;
  };
  tables: StandingsWidgetTable[];
}

export interface StandingsInputs {
  /** `GET /cronogol/standings` → `tables`. */
  tables: readonly StandingsTableView[];
  /** `GET /cronogol/ucl/standings`, or null while loading / on failure. */
  ucl: UclStandingsView | null;
  /** The matchweek indexes, by apiSlug — `useAllSeasonJornadas().byLeague`. */
  jornadas: Readonly<Record<string, SeasonJornadasView | null>>;
  followed: readonly string[];
  /** `prefs.leagueSlug`. */
  leagueSlug: string;
  /** team slug → crest filename, for crests on disk. */
  crests: ReadonlyMap<string, string>;
}

/** The last path segment's stem — the storage object's sha256 — shortened. */
function contentKey(url: string): string {
  const segment = url.split('?')[0].split('/').pop() ?? '';
  const stem = segment.replace(/\.[a-z0-9]+$/i, '');
  return stem.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'x';
}

/**
 * How the device turns a crest URL into pixels, by the URL's own extension
 * (the backend pre-filter's rule), or null when it cannot.
 *
 * - `raster` — PNG, JPEG, WebP: `expo-image-manipulator` decodes the file.
 * - `svg` — every Bundesliga club and a few Champions League ones: `expo-image`
 *   loads it through its bundled SVG coder, and the manipulator rasterises the
 *   resulting image ref.
 */
export type CrestDecode = 'raster' | 'svg';

function decodeKind(url: string): CrestDecode | null {
  const path = url.split('?')[0];
  if (/\.(png|jpe?g|webp)$/i.test(path)) return 'raster';
  if (/\.svg$/i.test(path)) return 'svg';
  return null;
}

/**
 * The file a crest WOULD be written to, or null when it can never be drawn.
 *
 * ⚠ Here rather than in `./crests` so the harness can prove the format gate
 * without a native module. The filename is `{slug}.{content hash}.png` — always
 * `.png`, whatever the source, because it is what the device WRITES.
 *
 * ⚠ The `widget` ladder is raster-first: a club with both (every Premier League
 * club) takes the cheap decode, and only an SVG-only club (the Bundesliga) takes
 * the SVG path through `crestSrc`'s terminal `logoUrl`.
 */
export function crestFileName(
  crest: ClubCrestView,
): { name: string; url: string; decode: CrestDecode } | null {
  if (crest.format === null) return null;
  const url = crestSrc(crest.logoUrls, crest.logoUrl, 'widget');
  const decode = url ? decodeKind(url) : null;
  if (!url || !decode) return null;
  return { name: `${crest.slug}.${contentKey(url)}.png`, url, decode };
}

/**
 * The display name for the Champions League on the tile.
 *
 * ⚠ NOT `UCL_LEAGUE_PHASE.name` (`UEFA Champions League`), which is a wire key
 * `competitionMarkKind` matches byte-for-byte — and too long for the meta line.
 */
const UCL_DISPLAY_NAME = 'Champions League';

export function tableUrl(slug: string): string {
  return `altagamafc://table?league=${encodeURIComponent(slug)}`;
}

/**
 * Which rows get a slot, and where the seam goes.
 *
 * The handoff's `fallbackRows`, generalised: keep the head of the table, then
 * every followed club below the cut, and give the seam a slot of its own. The
 * head shrinks until head + seam + followed-below fits, which is a fixed point
 * because a smaller head can only push MORE followed clubs below the cut.
 *
 * ⚠ With nothing followed below the cut there is no seam — the tile shows the
 * top `slots` and stops, which is what a large-tile table IS.
 *
 * ⚠ The head never drops below one row. A reader following more clubs than the
 * tile has slots sees the leader and as many of their clubs as fit, in rank
 * order.
 *
 * Returns array INDEXES into `rows`, ascending, plus the index the seam sits
 * above (or null).
 */
export function windowRows(
  followedFlags: readonly boolean[],
  slots: number = STANDINGS_SLOTS,
): { indexes: number[]; seamBefore: number | null } {
  const count = followedFlags.length;
  if (count <= slots) {
    return { indexes: [...Array(count).keys()], seamBefore: null };
  }

  const followedAt = followedFlags.flatMap((followed, i) => (followed ? [i] : []));
  let head = slots;
  for (;;) {
    const below = followedAt.filter((i) => i >= head).length;
    const next = Math.max(1, below === 0 ? slots : slots - 1 - below);
    if (next === head) break;
    head = next;
  }

  const below = followedAt.filter((i) => i >= head).slice(0, slots - 1 - head);
  if (below.length === 0) {
    return { indexes: [...Array(slots).keys()], seamBefore: null };
  }
  return { indexes: [...Array(head).keys(), ...below], seamBefore: below[0] };
}

/**
 * The hairline groups. ⚠ The three European places are ONE group — the mock
 * rules above 7th and 18th, never between the Champions League and Europa
 * rows — while the league phase's three bands are three groups, because each of
 * its boundaries is a real cut.
 */
function ruleGroup(band: StandingsBand | null): string {
  switch (band) {
    case 'ucl':
    case 'uel':
    case 'conf':
      return 'europe';
    case null:
      return 'none';
    default:
      return band;
  }
}

interface RawRow {
  rank: number;
  team: TeamRef;
  played: number;
  goalDifference: number;
  points: number;
}

function buildRows(
  rows: readonly RawRow[],
  bandFor: (rank: number) => StandingsBand | null,
  inputs: StandingsInputs,
): StandingsWidgetRow[] {
  const followed = new Set(inputs.followed);
  // ⚠ Sorted on the wire rank, never re-ranked (see `UclStandingsRowView`).
  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  const { indexes, seamBefore } = windowRows(sorted.map((row) => followed.has(row.team.slug)));

  let previous: StandingsBand | null | undefined;
  return indexes.map((index) => {
    const row = sorted[index];
    const band = bandFor(row.rank);
    const seamAbove = index === seamBefore;
    // ⚠ No rule directly under a seam — the seam already separates, and a
    // hairline under `···` reads as a second, unexplained cut.
    const ruleAbove =
      !seamAbove && previous !== undefined && ruleGroup(previous) !== ruleGroup(band);
    previous = band;
    return {
      rank: row.rank,
      teamSlug: row.team.slug,
      name: displayName(row.team.name),
      abbr: abbreviate(row.team.name, row.team.slug, row.team.shortName),
      played: row.played,
      goalDiff: signedGoalDifference(row.goalDifference),
      points: row.points,
      followed: followed.has(row.team.slug),
      crestFile: inputs.crests.get(row.team.slug) ?? null,
      band,
      ruleAbove,
      seamAbove,
    };
  });
}

function metaLine(name: string, matchday: number | null, copy: Copy): string {
  const league = name.toUpperCase();
  return matchday === null ? league : `${league} · ${copy.widgets.standingsAfter(matchday)}`;
}

/**
 * Every table the widget's Edit sheet can offer, rendered for THIS reader.
 *
 * ⚠ The Champions League table slots in by its `order` (1.5 — second), the
 * same place the Table tab's menu puts it. It is omitted, not emptied, while
 * its request is pending or failed: an empty table in the picker reads broken.
 */
export function buildStandingsSnapshot(
  inputs: StandingsInputs,
  now: Date,
  copy: Copy,
): StandingsSnapshot {
  const entries: { order: number; table: StandingsWidgetTable }[] = editorialTables(
    inputs.tables,
  ).map(({ table, league }) => {
    const banded = bandsApply(table, league);
    const index = inputs.jornadas[league.apiSlug];
    // ⚠ The Table tab's own caption rule, including its honest null — see
    // `completedMatchweek`. The tile prints no denominator.
    const done = index ? completedMatchweek(index.matchweeks, table.lastMatchUtc) : null;
    return {
      order: league.order,
      table: {
        slug: league.slug,
        name: league.name,
        meta: metaLine(league.name, done, copy),
        url: tableUrl(league.slug),
        rows: buildRows(table.rows, (rank) => (banded ? zoneFor(rank, league) : null), inputs),
      },
    };
  });

  if (inputs.ucl && inputs.ucl.rows.length > 0) {
    const ucl = inputs.ucl;
    const banded = cupBandsApply(ucl, UCL_LEAGUE_PHASE);
    entries.push({
      order: UCL_LEAGUE_PHASE.order,
      table: {
        slug: UCL_LEAGUE_PHASE.slug,
        name: UCL_DISPLAY_NAME,
        // ⚠ `matchday` is printed VERBATIM — the server derives it and the doc
        // forbids recomputing it. Null is the common case mid-round.
        meta: metaLine(UCL_DISPLAY_NAME, ucl.matchday, copy),
        url: tableUrl(UCL_LEAGUE_PHASE.slug),
        rows: buildRows(
          ucl.rows,
          (rank) => (banded ? cupBandFor(rank, UCL_LEAGUE_PHASE) : null),
          inputs,
        ),
      },
    });
  }

  const tables = entries.sort((a, b) => a.order - b.order).map((entry) => entry.table);
  const defaultSlug = tables.some((table) => table.slug === inputs.leagueSlug)
    ? inputs.leagueSlug
    : (tables[0]?.slug ?? null);

  return {
    v: STANDINGS_SNAPSHOT_VERSION,
    writtenAt: now.toISOString(),
    defaultSlug,
    copy: {
      title: copy.widgets.standings,
      pl: copy.widgets.standingsPlayed,
      gd: copy.widgets.standingsGoalDiff,
      pts: copy.widgets.standingsPoints,
      empty: copy.widgets.noTable,
    },
    tables,
  };
}

/**
 * The comparison key for "has anything actually changed".
 *
 * ⚠⚠ **`writtenAt` is excluded**, for the reason `snapshotKey` documents at
 * length: the re-arm runs on every foreground, WidgetKit rations reloads, and
 * spending them fails silently (trap 34). Everything the tile DRAWS is in here.
 */
export function standingsSnapshotKey(snapshot: StandingsSnapshot): string {
  const { writtenAt: _writtenAt, ...drawn } = snapshot;
  return JSON.stringify(drawn);
}
