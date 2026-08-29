/**
 * The widget snapshot — what the WidgetKit extension is allowed to know.
 *
 * ⚠⚠ **A widget extension is a separate process with NO access to this app.** It
 * cannot call the API, read AsyncStorage, reach the TanStack Query cache (which
 * is never persisted to disk), or import `@/constants/theme` or `@/lib/i18n`.
 * Everything it draws has to be sitting in the App Group before it runs. This
 * file is the whole contract; `targets/widget/Snapshot.swift` is its mirror, and
 * a field added to one is a blank row on the card until it is added to both.
 *
 * ⚠⚠ **Every string the widget PRINTS is pre-formatted here, including the
 * furniture.** That inverts what the notification content extension does with
 * its two `.lproj` files, and the inversion is the point (ADR 0047): a widget
 * renders in the SYSTEM language, so `.lproj` strings would hand an English
 * widget to a reader who chose Spanish inside the app — and the same argument
 * covers `tz` and the 12/24h clock, neither of which the extension can see.
 * Only `kickoffUtc` travels raw, because the countdown is arithmetic.
 *
 * ⚠ The selection is PURE and the writing is not, deliberately — the same split
 * `selectReminders`/`applyReminders` already uses, so the whole contract is
 * exercisable from `_debug/widgets` with no native module in sight.
 */
import { Directory, File } from 'expo-file-system';

import { groupContainer } from '@/features/app-group';
import { involvesFollowed, upcomingRow } from '@/lib/cronogol/board';
import { abbreviate, matchday, widgetName } from '@/lib/cronogol/derive';
import type { WindowFixtureView } from '@/lib/cronogol/types';
import type { Copy } from '@/lib/i18n/copy';

/** Bump when `WidgetEntry`/`WidgetSnapshot` changes shape. Swift tolerates both. */
export const SNAPSHOT_VERSION = 2;

/**
 * How many fixtures travel.
 *
 * ⚠ Six, not three, and the extra three are not slack. The small widget needs 1
 * and the medium 3, but the app may not run for days while the widget keeps
 * rendering from a timeline — and the extension drops entries whose kickoff has
 * passed, so a snapshot of exactly 3 degrades to 2 rows, then 1, then empty.
 * Six keeps the medium honest across roughly a fortnight of app silence, and
 * costs at most twelve crest files, most of them already on disk from the
 * reminder path.
 */
export const WIDGET_ENTRY_BUDGET = 6;

/** ⚠ Under the route's 31-day span cap, which is a 400 and not a clamp. */
export const WIDGET_WINDOW_DAYS = 21;

export interface WidgetClub {
  slug: string;
  name: string;
  abbr: string;
}

export interface WidgetEntry {
  fixtureId: string;
  /** The FOLLOWED club, whichever side it is on. Drives the deep link. */
  clubSlug: string;
  isHome: boolean;
  /** ⚠ Home-first, the way the match is named — never "your club" first. */
  homeAbbr: string;
  awayAbbr: string;
  /**
   * Both sides named via `widgetName` (`R. Madrid`, `Athletic`) for the medium
   * widget's row (ADR 0059) — contracted, because two names and a pill share
   * one row and the full forms truncated on the simulator. ⚠ Optional in `Snapshot.swift` — a v1
   * file has neither, and the extension falls back to the abbrs.
   */
  homeName: string;
  awayName: string;
  opponentName: string;
  opponentAbbr: string;
  /** Which crest file in the App Group is the opponent's. */
  opponentSlot: 'home' | 'away';
  /** ⚠ The only raw instant. Everything else is a finished string. */
  kickoffUtc: string;
  kickoffLabel: string;
  /** `SAT` over `21:00` — the medium widget's stacked column (ADR 0059). */
  kickoffDay: string;
  kickoffTime: string;
  roundLabel: string | null;
  venue: string | null;
}

export interface WidgetSnapshot {
  v: number;
  writtenAt: string;
  clubs: WidgetClub[];
  copy: {
    next: string;
    yourWeek: string;
    clubCount: string;
    followPrompt: string;
    noFixtures: string;
    versus: string;
    away: string;
    homeTag: string;
    awayTag: string;
  };
  entries: WidgetEntry[];
}

/**
 * The next match for each followed club, soonest first.
 *
 * ⚠ The eligibility rules are the ones `selectReminders` documents at length and
 * they apply here for the same reasons: a `kickoffTbd` fixture is a date wearing
 * a midnight time, so a countdown to it is a lie, and a `postponed` or
 * `cancelled` match is not a match.
 *
 * ⚠⚠ **Deduped by fixture id AFTER the per-club pass.** A derby between two
 * followed clubs is ONE match, and grouping by club alone puts it on the medium
 * widget twice — two rows, same crest pair, same kickoff. This is the single
 * most likely wrong-looking output of this function.
 */
export function selectWidgetFixtures(
  fixtures: readonly WindowFixtureView[],
  followed: readonly string[],
  now: Date,
  budget: number = WIDGET_ENTRY_BUDGET,
): WindowFixtureView[] {
  const eligible = fixtures
    .filter((fixture) => {
      if (fixture.kickoffTbd) return false;
      if (fixture.status === 'cancelled' || fixture.status === 'postponed') return false;

      const kickoff = Date.parse(fixture.kickoffUtc);
      if (Number.isNaN(kickoff) || kickoff <= now.getTime()) return false;

      return involvesFollowed(fixture, followed);
    })
    .sort((a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc));

  const seenClubs = new Set<string>();
  const seenFixtures = new Set<string>();
  const picked: WindowFixtureView[] = [];

  for (const fixture of eligible) {
    // ⚠ Both sides are checked, not just the one `upcomingRow` resolves. A match
    // is "the next one" for the home club AND the away club when both are
    // followed; taking only the resolved side would let the loser of that tie
    // skip its own next match and show a later one instead.
    const sides = [fixture.homeTeam?.slug, fixture.awayTeam?.slug]
      .filter((slug): slug is string => typeof slug === 'string' && followed.includes(slug));

    const fresh = sides.filter((slug) => !seenClubs.has(slug));
    if (fresh.length === 0) continue;

    for (const slug of fresh) seenClubs.add(slug);
    if (seenFixtures.has(fixture.id)) continue;
    seenFixtures.add(fixture.id);
    picked.push(fixture);
  }

  return picked.slice(0, budget);
}

/**
 * Everything the widget needs, rendered for THIS reader.
 *
 * ⚠ Pure. `format` and `now` are arguments rather than store reads for the same
 * reason `selectReminders` takes them — it is what keeps the whole thing
 * exercisable without a device.
 */
export function buildSnapshot(
  fixtures: readonly WindowFixtureView[],
  followed: readonly string[],
  now: Date,
  copy: Copy,
  formatKickoff: (iso: string) => string,
  formatKickoffParts: (iso: string) => { day: string; time: string },
): WidgetSnapshot {
  const picked = selectWidgetFixtures(fixtures, followed, now);

  const entries: WidgetEntry[] = [];
  const clubs = new Map<string, WidgetClub>();

  for (const fixture of picked) {
    // ⚠ `upcomingRow` owns "home wins the tie when both sides are followed"
    // (ADR 0029). Re-deriving it here is how the widget and the Today board
    // start disagreeing about whose match a derby is.
    const row = upcomingRow(fixture, followed);
    if (!row || !row.opponent) continue;

    const club = {
      slug: row.club.slug,
      name: row.club.name,
      // ⚠ `shortName` is nullable and NOT unique — Valencia and Valladolid have
      // collided. `abbreviate` is the same guard the club pages use.
      abbr: abbreviate(row.club.name, row.club.slug, row.club.shortName),
    };
    if (!clubs.has(club.slug)) clubs.set(club.slug, club);

    const md = matchday(fixture.round) ?? fixture.matchweek;
    const parts = formatKickoffParts(fixture.kickoffUtc);

    entries.push({
      fixtureId: fixture.id,
      clubSlug: row.club.slug,
      isHome: row.isHome,
      homeAbbr: fixture.homeTeam
        ? abbreviate(fixture.homeTeam.name, fixture.homeTeam.slug, fixture.homeTeam.shortName)
        : '',
      awayAbbr: fixture.awayTeam
        ? abbreviate(fixture.awayTeam.name, fixture.awayTeam.slug, fixture.awayTeam.shortName)
        : '',
      homeName: fixture.homeTeam ? widgetName(fixture.homeTeam.name) : '',
      awayName: fixture.awayTeam ? widgetName(fixture.awayTeam.name) : '',
      opponentName: row.opponent.name,
      opponentAbbr: abbreviate(
        row.opponent.name,
        row.opponent.slug,
        row.opponent.shortName,
      ),
      opponentSlot: row.isHome ? 'away' : 'home',
      kickoffUtc: fixture.kickoffUtc,
      kickoffLabel: formatKickoff(fixture.kickoffUtc),
      kickoffDay: parts.day,
      kickoffTime: parts.time,
      // ⚠ `copy.today.md` — the SAME matchday label the last-result card uses
      // (`J 4` / `MD 4`). The mock draws `J4` closed up; one source of truth for
      // the label is worth more than one space.
      roundLabel: md !== null ? copy.today.md(md) : null,
      venue: fixture.venue,
    });
  }

  // ⚠ The club list is what the Edit Widget picker offers, so it must be every
  // club the reader FOLLOWS — not only the ones with a fixture in the window. A
  // club on an international break would otherwise vanish from the picker.
  for (const slug of followed) {
    if (clubs.has(slug)) continue;
    const found = fixtures
      .flatMap((fixture) => [fixture.homeTeam, fixture.awayTeam])
      .find((team) => team?.slug === slug);
    if (!found) continue;
    clubs.set(slug, {
      slug,
      name: found.name,
      abbr: abbreviate(found.name, found.slug, found.shortName),
    });
  }

  return {
    v: SNAPSHOT_VERSION,
    writtenAt: now.toISOString(),
    clubs: [...clubs.values()],
    copy: {
      next: copy.widgets.next,
      yourWeek: copy.widgets.yourWeek,
      clubCount: copy.widgets.clubCount(followed.length),
      followPrompt: copy.widgets.followPrompt,
      noFixtures: copy.widgets.noFixtures,
      versus: copy.widgets.versus,
      away: copy.widgets.away,
      homeTag: copy.widgets.homeTag,
      awayTag: copy.widgets.awayTag,
    },
    entries,
  };
}

/** ⚠ Also `news.json`'s directory — see `features/news/snapshot.ts`. */
export const SNAPSHOT_DIR = 'widget';
const SNAPSHOT_NAME = 'snapshot.json';

/** Where `_debug/widgets` and `Snapshot.swift` both look. */
export function snapshotFile(): File | null {
  const container = groupContainer();
  if (!container) return null;
  return new File(container, SNAPSHOT_DIR, SNAPSHOT_NAME);
}

/**
 * Write a JSON contract file where an extension can read it.
 *
 * ⚠ **Temp file then rename.** `File.write` is not documented atomic, and a
 * widget that reads a half-written file gets a decode failure and falls all the
 * way back to its empty state. A rename inside one volume is atomic, so the
 * extension sees either the old file or the new one.
 *
 * ⚠ Shared with `features/news/snapshot.ts` (ADR 0061) — the NEWS widget has a
 * second file in the same directory with the same hazard. One rename routine,
 * not two.
 *
 * Returns false when there is no container (Android, or a simulator without the
 * group provisioned). That is a normal answer — see `groupContainer`.
 */
export function writeGroupJson(directoryName: string, fileName: string, data: unknown): boolean {
  const container = groupContainer();
  if (!container) return false;

  try {
    const directory = new Directory(container, directoryName);
    if (!directory.exists) directory.create({ intermediates: true, idempotent: true });

    const temp = new File(directory, `${fileName}.tmp`);
    if (temp.exists) temp.delete();
    temp.create();
    temp.write(JSON.stringify(data));

    // ⚠ `moveSync`, not `move`. The async form returns a promise this function
    // does not await, which would put the rename in a race with the widget
    // reload fired immediately after it.
    temp.moveSync(new File(directory, fileName), { overwrite: true });
    return true;
  } catch {
    // A file that will not write leaves the previous one in place, which is
    // the better of the two failures.
    return false;
  }
}

/** Write the fixture snapshot where `Snapshot.swift` reads it. */
export function writeSnapshot(snapshot: WidgetSnapshot): boolean {
  return writeGroupJson(SNAPSHOT_DIR, SNAPSHOT_NAME, snapshot);
}

/**
 * The comparison key for "has anything actually changed".
 *
 * ⚠⚠ **`writtenAt` is excluded, and that is the entire point.** WidgetKit
 * budgets timeline reloads — roughly 40–70 a day for an actively used widget —
 * and spending them buys nothing but leaves the widget FROZEN for the rest of
 * the day with no error in any log. The re-arm runs on every foreground, so
 * comparing the timestamp would call every one of them a change.
 */
export function snapshotKey(snapshot: WidgetSnapshot): string {
  return JSON.stringify({ ...snapshot, writtenAt: '' });
}
