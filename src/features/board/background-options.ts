/**
 * The Board background CHOICES, as plain data (ADR 0175, shared since 0199).
 *
 * Two surfaces offer the same picks: the edit panel's row of tiles (the
 * common ones) and the full-catalogue sheet behind its "More" tile. Both build
 * an option from here, so an id, a label or a ramp can never mean one thing on
 * the tile and another in the sheet.
 *
 * ⚠ Pure: no hooks, no queries. The caller hands over the league or the
 * `TeamView` it already has, and the current `bdBg` to mark the selection.
 */
import { clubTint } from '@/lib/cronogol/club-wash';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import {
  clubCrownTheme,
  leagueCrownTheme,
  type CrownArt,
  type CrownStop,
} from '@/lib/cronogol/league-theme';
import { LEAGUES, type League } from '@/lib/cronogol/leagues';
import type { TeamView } from '@/lib/cronogol/types';
import { encodeBoardBackground } from '@/lib/board-background';

export interface BackgroundOption {
  /** The encoded pick — `'default'`, `'league:{slug}'`, `'club:{slug}'`. */
  id: string;
  label: string;
  /** The choice's crown ramp — the sheet's swatch, the tile's wash. */
  stops: readonly CrownStop[];
  /** Club picks: the crest, and the `Crest` fallback code when there is none. */
  crest?: string | null;
  crestFallback?: string;
  /** League picks: the drawn mark the league's own crown bleeds. */
  art?: CrownArt | null;
  selected: boolean;
}

export function defaultOption(label: string, bdBg: string): BackgroundOption {
  const id = encodeBoardBackground({ kind: 'default' });
  return { id, label, stops: leagueCrownTheme(null).stops, selected: bdBg === id };
}

export function leagueOption(league: League, bdBg: string): BackgroundOption {
  const id = encodeBoardBackground({ kind: 'league', slug: league.slug });
  const theme = leagueCrownTheme(league.apiSlug);
  return { id, label: league.name, stops: theme.stops, art: theme.art, selected: bdBg === id };
}

export function clubOption(team: TeamView, bdBg: string): BackgroundOption {
  const id = encodeBoardBackground({ kind: 'club', slug: team.slug });
  return {
    id,
    label: displayName(team.name),
    stops: clubCrownTheme(clubTint(team)).stops,
    crest: crestSrc(team.logoUrls, team.logoUrl, 'xsmall'),
    crestFallback: abbreviate(team.name, team.slug, team.shortName),
    selected: bdBg === id,
  };
}

/**
 * The common picks, in the strip's order (ADR 0199; shared by the Board's edit
 * panel and Settings' Appearance group since ADR 0208): the brand default, the
 * reader's own clubs, then every league.
 *
 * ⚠ The CURRENT pick is slotted in after the default when it is none of those
 * (a club chosen from the full sheet), so the selection is always on the strip
 * — a selected tile nobody can find is a setting nobody can undo.
 */
export function stripOptions(
  defaultLabel: string,
  bdBg: string,
  followedTeams: readonly TeamView[],
  current: TeamView | null,
): BackgroundOption[] {
  const options: BackgroundOption[] = [
    defaultOption(defaultLabel, bdBg),
    ...followedTeams.map((team) => clubOption(team, bdBg)),
    ...LEAGUES.map((league) => leagueOption(league, bdBg)),
  ];
  if (current && !options.some((option) => option.selected)) {
    options.splice(1, 0, clubOption(current, bdBg));
  }
  return options;
}
