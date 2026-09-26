/**
 * Which clubs the builder offers, and which one the tab opens on (ADR 0212).
 *
 * ⚠ **A club is offered when it sits in the published table of a league that
 * publishes squads** (`League.squads`). `TeamView` carries no league, so the
 * TABLE is the membership record — the same one `leagueOfClub` reads — and it
 * is also what keeps LaLiga's five tracked segunda clubs out: they sit in the
 * `segunda` table, which has no `League` config. Names and crests come from
 * the full catalogue (`useTeams()`). Both are app-wide cache reads; nothing
 * here costs a request of its own.
 *
 * ⚠ **The tab's club is RESOLVED, never written.** `resolveXiClub` is a pure
 * read over the store and the preferences; nothing here commits a default
 * back. `lastClub` is written by the reader's own actions (a pick in the club
 * sheet, a push from a club page, any edit), so a fallback can never become
 * the reader's choice behind their back (trap 66).
 *
 * Pure: no React, no storage.
 */
import { abbreviate, displayName } from '@/lib/cronogol/derive';
import { LEAGUES, byEditorialOrder, type League } from '@/lib/cronogol/leagues';
import type { StandingsTableView, TeamView } from '@/lib/cronogol/types';
import { foldAccents } from '@/lib/format';

export interface XiClubGroup {
  league: League;
  clubs: readonly TeamView[];
}

/**
 * The offered clubs, grouped by league in editorial order, each group in the
 * catalogue's own (sorted) order. A league whose table has not loaded is
 * absent until it does — membership is never guessed.
 */
export function xiClubDirectory(
  tables: readonly StandingsTableView[] | undefined,
  catalogue: readonly TeamView[] | undefined,
): XiClubGroup[] {
  if (!tables || !catalogue) return [];
  const out: XiClubGroup[] = [];
  for (const league of [...LEAGUES].sort(byEditorialOrder)) {
    if (!league.squads) continue;
    const table = tables.find((t) => t.league.slug === league.apiSlug);
    if (!table?.rows.length) continue;
    const members = new Set(table.rows.map((row) => row.team.slug));
    const clubs = catalogue.filter((team) => members.has(team.slug));
    if (clubs.length) out.push({ league, clubs });
  }
  return out;
}

/** Every offered slug, or undefined while the directory cannot be built. */
export function offeredSlugs(groups: readonly XiClubGroup[], ready: boolean): ReadonlySet<string> | undefined {
  if (!ready) return undefined;
  return new Set(groups.flatMap((group) => group.clubs.map((club) => club.slug)));
}

/** The league a club is offered under, or undefined when it is not offered. */
export function xiLeagueOf(groups: readonly XiClubGroup[], slug: string): League | undefined {
  return groups.find((group) => group.clubs.some((club) => club.slug === slug))?.league;
}

/**
 * The club search. Accent-folded on the full and the display name, and a
 * short query also matches the three-letter code — `atm` finds Atlético.
 */
export function matchClub(team: Pick<TeamView, 'name' | 'slug' | 'shortName'>, query: string): boolean {
  const needle = foldAccents(query.trim());
  if (!needle) return true;
  if (foldAccents(team.name).includes(needle)) return true;
  if (foldAccents(displayName(team.name)).includes(needle)) return true;
  return needle.length <= 3 && foldAccents(abbreviate(team.name, team.slug, team.shortName)) === needle;
}

export type XiClubPick =
  | { kind: 'club'; slug: string }
  /** The directory has not loaded, and nothing stored names a club yet. */
  | { kind: 'pending' }
  /** Nothing to open on — the empty state offers the club sheet. */
  | { kind: 'none' };

export interface XiClubInputs {
  /** `?club=` on a deep link. Trusted as a request; the screen handles an empty squad. */
  param: string | null;
  /** The store's `lastClub` — the reader's own last choice. */
  lastClub: string | null;
  /** Preferences' favourite (ADR 0209). */
  favourite: string | null;
  followed: readonly string[];
  /** The offered clubs, or undefined while their rosters load. */
  offered: ReadonlySet<string> | undefined;
}

/**
 * `?club=` → `lastClub` → the favourite → the first followed club that is
 * offered → nothing. The favourite and the follows are only taken when
 * offered: a followed Serie A club would open a builder with no squad.
 */
export function resolveXiClub(inputs: XiClubInputs): XiClubPick {
  if (inputs.param) return { kind: 'club', slug: inputs.param };
  if (inputs.lastClub) return { kind: 'club', slug: inputs.lastClub };
  const candidates = [inputs.favourite, ...inputs.followed].filter((slug): slug is string => !!slug);
  if (candidates.length === 0) return { kind: 'none' };
  if (!inputs.offered) return { kind: 'pending' };
  const slug = candidates.find((candidate) => inputs.offered?.has(candidate));
  return slug ? { kind: 'club', slug } : { kind: 'none' };
}
