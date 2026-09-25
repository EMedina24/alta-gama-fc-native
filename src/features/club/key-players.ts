/**
 * The club page's KEY PLAYERS (ADR 0202) — up to three of the club's own
 * season leaders, as plain rows.
 *
 * Ed's picks, standing in for the kit's GOALS / ASSISTS / RATING (ratings do
 * not exist at any provider the backend holds — CRONOGOL-API.md):
 *  1. the club's top scorer (goals);
 *  2. its top assister (assists) not already shown — the next one down when
 *     the top scorer also leads the assists;
 *  3. its goal-involvements LEADER (G+A) if that is a third person, otherwise
 *     its next scorer who is not already shown.
 *
 * ⚠ The leaderboards are LEAGUE-wide (`/cronogol/stats/leaders`); a row
 * belongs to this club when its `teams` names the slug — the `season-stats`
 * screen's own filter. A club with no rows (Serie A and the Bundesliga have
 * no player identity) yields `[]`, and the section hides.
 *
 * ⚠⚠ The squad supplies the shirt, position and SHORT name ("Raphinha" for
 * "Raphael Dias Belloli"). It is joined by exact NAME, not by id: measured
 * live on Barcelona (2026-09-25), a leaderboard's `playerId` is our UUID while
 * `SquadPlayerView.id` is the provider's numeric person id — they never
 * match, so an id join would silently find nothing. Both routes carry the
 * provider's full name verbatim, so the name join hits; a miss degrades to a
 * row without a number, never to a wrong one.
 *
 * ⚠ Pure: no hooks, no fetching.
 */
import type { SquadPlayerView, StatsLeaderView } from '@/lib/cronogol/types';

export type KeyStat = 'goals' | 'assists' | 'involvements';

export interface KeyPlayer {
  playerId: string;
  name: string;
  value: number;
  stat: KeyStat;
  /** The squad row it joined to, or null. */
  squad: SquadPlayerView | null;
}

export function keyPlayers(
  slug: string,
  boards: {
    goals: readonly StatsLeaderView[] | undefined;
    assists: readonly StatsLeaderView[] | undefined;
    involvements: readonly StatsLeaderView[] | undefined;
  },
  squad: readonly SquadPlayerView[] | undefined,
): KeyPlayer[] {
  const mine = (rows: readonly StatsLeaderView[] | undefined) =>
    (rows ?? []).filter((row) => row.value > 0 && row.teams.some((team) => team.slug === slug));
  const goals = mine(boards.goals);
  const assists = mine(boards.assists);
  const involvements = mine(boards.involvements);

  const picked: KeyPlayer[] = [];
  const taken = (row: StatsLeaderView) => picked.some((p) => p.playerId === row.playerId);
  const take = (row: StatsLeaderView | undefined, stat: KeyStat) => {
    if (!row || taken(row)) return false;
    picked.push({ playerId: row.playerId, name: row.name, value: row.value, stat, squad: join(row, squad) });
    return true;
  };

  take(goals[0], 'goals');
  take(assists.find((row) => !taken(row)), 'assists');
  // ⚠ The LEADER only — not the first unshown G+A row, which would be a lower
  // rank dressed as the club's best.
  if (!take(involvements[0], 'involvements')) {
    take(goals.find((row) => !taken(row)), 'goals');
  }
  return picked;
}

function join(row: StatsLeaderView, squad: readonly SquadPlayerView[] | undefined): SquadPlayerView | null {
  if (!squad) return null;
  return squad.find((player) => player.name === row.name) ?? null;
}
