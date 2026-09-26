/**
 * The three numbers the builder shows for a player (ADR 0214): goals, assists,
 * yellows — this season's, or across the seasons the backend counts.
 *
 * ⚠⚠ **`season` reads the season BY VALUE (`pickPlayerTotals`), never
 * `seasonTotals[0]`.** The array is newest-first, but a player with no row for
 * 2026 yet would otherwise show last season's goals under a "this season"
 * caption. The prototype did exactly that.
 *
 * ⚠⚠ **`recent` is NOT a career.** `overall` sums at most three seasons
 * (`seasonsCounted` of `seasonsTotal`), so it is captioned with its own count —
 * "Across 3 seasons" — and never with the handoff's "Career".
 *
 * ⚠ **Yellows are gated on coverage even though they arrive as numbers.** A
 * block the backend marks insufficient still answers `yellows: 0` (verified on
 * Raphinha's 2026 Champions League block; see `season-stats/player-view.tsx`),
 * and that zero means "we did not look". Goals and assists are the headline
 * figures and are shown as served, exactly as the Season stats screen does.
 * `overall` carries no coverage block, so its yellows stand.
 *
 * ⚠ `null` everywhere means "nothing to say" and renders as an EMPTY cell —
 * never `—`, never `0` (the app's rule; the handoff's em dash is not ported).
 */
import { pickPlayerTotals, hasEvents } from '@/lib/cronogol/stats';
import type { PlayerStatsView } from '@/lib/cronogol/types';

import type { StatsMode } from './migrate';

export interface XiStats {
  goals: number | null;
  assists: number | null;
  yellows: number | null;
  /** How many seasons `recent` covers; `null` in season mode. */
  seasons: number | null;
}

export function xiStats(
  view: PlayerStatsView | null | undefined,
  mode: StatsMode,
  season: number,
): XiStats | null {
  if (!view) return null;
  if (mode === 'season') {
    const totals = pickPlayerTotals(view, season);
    if (!totals) return null;
    return {
      goals: totals.goals,
      assists: totals.assists,
      yellows: hasEvents(totals.coverage) ? totals.yellows : null,
      seasons: null,
    };
  }
  const overall = view.overall;
  if (!overall || overall.seasonsCounted === 0) return null;
  return {
    goals: overall.goals,
    assists: overall.assists,
    yellows: overall.yellows,
    seasons: overall.seasonsCounted,
  };
}
