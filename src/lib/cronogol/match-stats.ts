/**
 * One finished match, reduced to what the match-stats sheet draws (ADR 0190):
 * the goal flow (who scored when, as a running total per side) and the
 * head-to-head counts.
 *
 * ⚠⚠ **These are EVENT counts, not match statistics.** No possession, shots or
 * xG exist anywhere on the API (`CRONOGOL-API.md` → "Shots, xG, possession …
 * do not exist"). Nothing here may be dressed up as one.
 *
 * ⚠ **Pure — no native import, no React, no `Date`** — the same contract as
 * `./events`, so it runs in the plain-node harness.
 *
 * ⚠ **No sort.** The feed order is the server's chronology (`./events`' header)
 * and the chart only needs each goal's POSITION, which it reads off the minute
 * without reordering anything. A running total is built in feed order.
 */
import { eventKind, eventSide, minuteLabel } from './events';
import type { TeamRef, TimelineEventView } from './types';

export type Side = 'home' | 'away';

export interface FlowGoal {
  /**
   * Where the goal sits on the x axis, in minutes.
   *
   * ⚠ `minute` ALONE, never `minute + minuteExtra`: a Serie A `45+2` is drawn at
   * 45, so it stays left of the second half's 46′ rather than landing on a 47th
   * minute that did not happen (`minuteLabel`'s own rule). LaLiga and the
   * Premier League fold stoppage into `minute` (`94`), which plots as given.
   */
  x: number;
  /** The side's running total AFTER this goal. */
  total: number;
  /** `63` · `45+2` — for the accessible summary. */
  label: string;
}

export interface GoalFlow {
  home: FlowGoal[];
  away: FlowGoal[];
  /** The x axis's right end: 90, or the latest goal's minute when later. */
  end: number;
  /**
   * Goals the chart could not place — a null minute, or no side. Counted so
   * the caller can tell the flow is incomplete rather than silently drawing a
   * 3-1 as a 2-1.
   */
  unplaced: number;
}

/**
 * Which side a GOAL counts for.
 *
 * ⚠⚠ **An own goal counts for the OTHER side.** `teamSlug` on an own goal is the
 * SCORER's club, not the side that benefited (`CRONOGOL-API.md` → events). The
 * timeline row still draws it under the scorer's crest — that is who did it —
 * but a running score must credit the beneficiary.
 */
export function goalSide(
  event: TimelineEventView,
  home: TeamRef | null,
  away: TeamRef | null,
): Side | null {
  const kind = eventKind(event);
  if (kind !== 'goal' && kind !== 'own-goal') return null;
  const side = eventSide(event, home, away);
  if (side === null) return null;
  if (kind === 'own-goal') return side === 'home' ? 'away' : 'home';
  return side;
}

/** Regulation length — the axis never ends before it, even in a 1-0 won at 12′. */
const FULL_TIME = 90;

export function goalFlow(
  events: readonly TimelineEventView[],
  home: TeamRef | null,
  away: TeamRef | null,
): GoalFlow {
  const flow: GoalFlow = { home: [], away: [], end: FULL_TIME, unplaced: 0 };
  for (const event of events) {
    const kind = eventKind(event);
    if (kind !== 'goal' && kind !== 'own-goal') continue;
    const side = goalSide(event, home, away);
    if (side === null || event.minute === null) {
      flow.unplaced += 1;
      continue;
    }
    const goals = flow[side];
    goals.push({
      x: event.minute,
      total: goals.length + 1,
      label: minuteLabel(event) ?? '',
    });
    flow.end = Math.max(flow.end, event.minute);
  }
  return flow;
}

export interface VersusCounts {
  goals: Record<Side, number>;
  yellow: Record<Side, number>;
  red: Record<Side, number>;
  subs: Record<Side, number>;
}

/**
 * Per-side counts for the head-to-head bars.
 *
 * ⚠ A row with no side (`eventSide` → null: a VAR call belonging to neither, a
 * club with no crosswalk) is skipped, never guessed onto one.
 *
 * ⚠ `goals` here is what the TIMELINE holds. The sheet prints the score from
 * the fixture, which is authoritative; this number only feeds the bar and may
 * lag it while a sweep is partial.
 */
export function versusCounts(
  events: readonly TimelineEventView[],
  home: TeamRef | null,
  away: TeamRef | null,
): VersusCounts {
  const zero = (): Record<Side, number> => ({ home: 0, away: 0 });
  const counts: VersusCounts = { goals: zero(), yellow: zero(), red: zero(), subs: zero() };
  for (const event of events) {
    const kind = eventKind(event);
    if (kind === 'goal' || kind === 'own-goal') {
      const side = goalSide(event, home, away);
      if (side) counts.goals[side] += 1;
      continue;
    }
    const side = eventSide(event, home, away);
    if (side === null) continue;
    if (kind === 'yellow') counts.yellow[side] += 1;
    else if (kind === 'red') counts.red[side] += 1;
    else if (kind === 'sub') counts.subs[side] += 1;
  }
  return counts;
}
