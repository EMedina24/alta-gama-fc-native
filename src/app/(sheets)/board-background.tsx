/**
 * The Board background picker's route (ADR 0175) — since ADR 0199 the FULL
 * catalogue behind the edit panel's "More" tile; the panel's own tiles carry
 * the common picks. Options come from `features/board/background-options`,
 * the one builder both surfaces share.
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
  type BackgroundSection,
} from '@/components/organisms/board-background-sheet';
import { clubOption, defaultOption, leagueOption } from '@/features/board/background-options';
import { LEAGUES } from '@/lib/cronogol/leagues';
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

  const sections: BackgroundSection[] = LEAGUES.map((league, i) => ({
    title: league.name,
    league: leagueOption(league, bdBg),
    // ⚠ A failed roster shows the league row alone — a league pick never
    // depends on the club catalogue, so the section stays useful offline.
    clubs: (rosters[i].data ?? []).map((team) => clubOption(team, bdBg)),
    pending: rosters[i].isPending,
  }));

  return (
    <BoardBackgroundSheet
      title={copy.board.background}
      defaultOption={defaultOption(copy.board.backgroundDefault, bdBg)}
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
