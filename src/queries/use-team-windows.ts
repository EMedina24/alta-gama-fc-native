/**
 * The followed clubs' own schedules — one `GET /cronogol/teams/{slug}/fixtures`
 * per followed club, converted and merged into the board's neutral shape (ADR
 * 0132). This is the feed that puts a Champions League tie (and a segunda
 * club's whole season) on the Today board, the reminders and the widget; the
 * league-scoped window routes cannot carry either.
 *
 * ⚠⚠ **These queries MAY be refetched at kickoff and on pull-to-refresh** —
 * the opposite of `useUpcoming`'s rule, and on purpose. That window starts at
 * `now`, so a kickoff-time refetch DROPS the match that just started (the ADR
 * 0052/0078 vanishing-fixture trap, and the reason `upcoming` is never
 * refetched at kickoff). This window starts 14 days back: a refetch can never
 * drop a just-kicked-off fixture, only flip its `status` — which is exactly
 * what the board wants from it.
 *
 * ⚠ Request budget: one request per followed club per stale window. Follows
 * are hard-capped at 20 by the push contract and realistically ≤5; the route
 * answers with `max-age=60` besides. Recorded in ADR 0132.
 */
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { WIDGET_WINDOW_DAYS } from '@/features/widgets/snapshot';
import { findTeamFixtures } from '@/lib/cronogol/client';
import { teamWindowBounds } from '@/lib/cronogol/fixture-window';
import { mergeTeamRows, teamWindowRows } from '@/lib/cronogol/team-window';
import type { WindowFixtureView } from '@/lib/cronogol/types';
import { keys } from './keys';
import { STALE } from './stale';
import { RECENT_DAYS } from './use-today';

/**
 * ⚠ The SAME constants the window hooks use, not copies. The back edge
 * equalling `RECENT_DAYS` is what lets `lastResult` read the merged rows
 * UNSLICED — both feeds start at the same local midnight by construction —
 * and the ahead edge equalling `WIDGET_WINDOW_DAYS` is what keeps the widget
 * from going blank over an international break (the reason 21 exists).
 */
const TEAM_WINDOW_BACK_DAYS = RECENT_DAYS;
const TEAM_WINDOW_AHEAD_DAYS = WIDGET_WINDOW_DAYS;

export interface TeamWindows {
  /**
   * Every followed club's rows, complementary-merged and deduped by fixture id
   * (`mergeTeamRows` — the cup-derby rule), kickoff ascending. `[]` until the
   * first response lands; a club whose query failed simply contributes nothing
   * this render and its rows return with the next success.
   */
  rows: WindowFixtureView[];
  isRefetching: boolean;
}

/**
 * ⚠ The combined result is built inside `combine`, which TanStack v5
 * structurally shares — `rows` keeps its identity across renders (and across
 * `isRefetching` flips) unless the underlying data actually changed. That
 * stability is LOAD-BEARING, not a nicety: the merged rows sit in
 * `use-push-sync`'s re-arm effect deps, and a fresh identity per render would
 * re-arm the reminders and re-write the widget snapshot on every render —
 * trap 34's reload budget, burned in minutes of ordinary use.
 */
export function useTeamWindows(
  zone: string,
  followed: readonly string[],
): TeamWindows & { refetch: () => void } {
  // ⚠ Keyed to the DAY, not the instant — a re-render mints no new cache
  // entry; the window the request actually asks for is built inside `queryFn`
  // at request time (ADR 0052's lesson, same as every hook in `use-today`).
  const { from } = teamWindowBounds(
    new Date(),
    zone,
    TEAM_WINDOW_BACK_DAYS,
    TEAM_WINDOW_AHEAD_DAYS,
  );
  const fromDay = from.slice(0, 10);

  const combined = useQueries({
    queries: followed.map((slug) => ({
      queryKey: keys.teamWindow(slug, fromDay),
      queryFn: () =>
        findTeamFixtures(
          slug,
          teamWindowBounds(new Date(), zone, TEAM_WINDOW_BACK_DAYS, TEAM_WINDOW_AHEAD_DAYS),
        ),
      staleTime: STALE.feed,
    })),
    combine: (results): TeamWindows => ({
      // ⚠ `findTeamFixtures` narrows a 404 to null (an unknown slug is the
      // caller's empty state); `teamWindowRows` narrows an unsynced club to
      // `[]` (trap 1). Both simply contribute no rows.
      rows: mergeTeamRows(results.map((r) => (r.data ? teamWindowRows(r.data) : []))),
      isRefetching: results.some((r) => r.isRefetching),
    }),
  });

  const client = useQueryClient();
  // Prefix match: every followed club's window, whatever day it is keyed to.
  const refetch = useCallback(() => {
    void client.refetchQueries({ queryKey: ['team-window'] });
  }, [client]);

  return { ...combined, refetch };
}
