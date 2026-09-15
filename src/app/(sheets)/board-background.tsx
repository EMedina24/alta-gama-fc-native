/**
 * The Board background picker's route (ADR 0175).
 *
 * ⚠ Declared in the ROOT stack in `_layout.tsx` like every sheet (ADR 0030;
 * trap 19 — a `(sheets)/_layout.tsx` would silently demote it to a full-screen
 * card). Detent 0.72, `calendar-ucl`'s: the board's crown stays visible above
 * the sheet, and the recolour landing on it live is the picker's preview.
 *
 * ⚠ Picking writes the store and DISMISSES (ADR 0183, reversing 0175's
 * stay-open clause): the commit lands before `back()`, so nothing is pending
 * when the sheet goes, and `usePreferences` re-renders the board on the same
 * emit — the recolour is what the dismissal reveals. Close remains the
 * no-change exit.
 */
import { useRouter } from 'expo-router';

import {
  BoardBackgroundSheet,
  type BackgroundOption,
  type BackgroundSection,
} from '@/components/organisms/board-background-sheet';
import { clubTint } from '@/lib/cronogol/club-wash';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { clubCrownTheme, leagueCrownTheme } from '@/lib/cronogol/league-theme';
import { LEAGUES, type League } from '@/lib/cronogol/leagues';
import { encodeBoardBackground } from '@/lib/board-background';
import { hapticToggle } from '@/lib/haptics';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useTeams } from '@/queries/use-teams';
import { setBoardBackground, usePreferences } from '@/store/preferences';
import type { TeamView } from '@/lib/cronogol/types';
import type { UseQueryResult } from '@tanstack/react-query';

export default function BoardBackgroundSheetRoute() {
  const router = useRouter();
  const { copy } = useI18n();
  const { bdBg } = usePreferences();

  /**
   * One roster per catalogue league — grouping needs league-scoped queries
   * because `TeamView` carries no league field (the Clubs screen's own
   * finding). ⚠ UNROLLED, not `LEAGUES.map(useTeams)`: the hook order is fixed
   * either way (`LEAGUES` is a module constant), but rules-of-hooks cannot see
   * that through a callback. Six entries because the catalogue holds six
   * leagues; a seventh league grows this list by one line.
   */
  const rosters: readonly UseQueryResult<TeamView[]>[] = [
    useTeams(LEAGUES[0].apiSlug),
    useTeams(LEAGUES[1].apiSlug),
    useTeams(LEAGUES[2].apiSlug),
    useTeams(LEAGUES[3].apiSlug),
    useTeams(LEAGUES[4].apiSlug),
    useTeams(LEAGUES[5].apiSlug),
  ];

  const leagueOption = (league: League): BackgroundOption => {
    const id = encodeBoardBackground({ kind: 'league', slug: league.slug });
    return {
      id,
      label: league.name,
      stops: leagueCrownTheme(league.apiSlug).stops,
      selected: bdBg === id,
    };
  };

  const clubOption = (team: TeamView): BackgroundOption => {
    const id = encodeBoardBackground({ kind: 'club', slug: team.slug });
    return {
      id,
      label: displayName(team.name),
      stops: clubCrownTheme(clubTint(team)).stops,
      crest: crestSrc(team.logoUrls, team.logoUrl, 'xsmall'),
      crestFallback: abbreviate(team.name, team.slug, team.shortName),
      selected: bdBg === id,
    };
  };

  const sections: BackgroundSection[] = LEAGUES.map((league, i) => ({
    title: league.name,
    league: leagueOption(league),
    // ⚠ A failed roster shows the league row alone — a league pick never
    // depends on the club catalogue, so the section stays useful offline.
    clubs: (rosters[i].data ?? []).map(clubOption),
    pending: rosters[i].isPending,
  }));

  return (
    <BoardBackgroundSheet
      title={copy.board.background}
      defaultOption={{
        id: encodeBoardBackground({ kind: 'default' }),
        label: copy.board.backgroundDefault,
        stops: leagueCrownTheme(null).stops,
        selected: bdBg === 'default',
      }}
      sections={sections}
      closeLabel={copy.sheets.close}
      onPick={(id) => {
        void hapticToggle();
        setBoardBackground(id);
        router.back();
      }}
      onClose={() => router.back()}
    />
  );
}
