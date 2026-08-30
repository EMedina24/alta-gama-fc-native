/**
 * The widget's live sidecar — `widget/live.json` in the App Group (ADR 0080).
 *
 * ⚠⚠ **Three writers, one shape.** This file is also written by the widget
 * extension itself (its 5-minute poll of `/cronogol/live`, `targets/widget/
 * Live.swift`) and by the notification service extension (a goal / red card /
 * full-time push, `NotificationService.swift`). `targets/_shared/LiveState.swift`
 * is the Swift mirror; a field added to one side is invisible until it is in
 * both. Keep the shape SMALL — it exists so a separate process can draw a
 * score, not to mirror `LiveMatchView`.
 *
 * ⚠ This writer runs only while the app is FOREGROUND with the Today board's
 * poll running — it keeps the widget in step with what the reader is looking
 * at. With the app closed the widget's own poll and the pushes carry it.
 *
 * ⚠ **Never writes an empty `matches` list.** The file expires by arithmetic —
 * the extension only joins rows whose kickoff is inside the 150-minute hold
 * (or, `finished`, the same local day) — so clearing it buys nothing, and an
 * empty overwrite would erase a `finished` entry another writer is holding for
 * the full-time card.
 */
import { reloadWidgets } from '@/features/push/capability';
import { liveMinute } from '@/lib/cronogol/live';
import type { LiveMatchView } from '@/lib/cronogol/types';

import { SNAPSHOT_DIR, writeGroupJson } from './snapshot';

export const LIVE_NAME = 'live.json';

/** Bump when the shape changes. `LiveState.swift` tolerates all versions. */
export const LIVE_VERSION = 1;

export interface WidgetLiveMatch {
  fixtureId: string;
  /**
   * `halfTime` is DERIVED, not served — `/cronogol/live` has no break state.
   * This writer emits it when the minute is null though the match kicked off
   * long ago; the widget's own poll adds a "minute stopped moving at 45"
   * heuristic. `finished` comes from the other two writers only — a row
   * vanishing from the route (widget poll) or a full-time push.
   */
  status: 'live' | 'halfTime' | 'finished';
  /** The minute AS REPORTED, stoppage folded in (`94` = 90+4). Never 0. */
  minute: number | null;
  /**
   * When `minute` was true, so the extension can tick it on-device between
   * writes — the same synthetic-anchor idea as the Live Activity's
   * `clockFromEpoch` (`MatchAttributes.swift`), kept as an instant + minute
   * pair because this file, unlike ActivityKit's payload, is ours to decode.
   */
  minuteAt: string;
  /** ⚠ Null means "no score yet", never nil–nil — render a dash. */
  homeGoals: number | null;
  awayGoals: number | null;
  /** `Iglesias 20′` — the last goal, already rendered. Null until events land. */
  lastEvent: string | null;
}

export interface WidgetLiveState {
  v: number;
  writtenAt: string;
  /** Who wrote last — `app` | `widget` | `push`. Diagnostic only. */
  source: string;
  matches: WidgetLiveMatch[];
}

/**
 * Minutes since kickoff past which a null minute reads as the BREAK rather
 * than as "kicked off, no data yet". Generous: first-half stoppage has run to
 * ~12 minutes in LaLiga.
 */
const HALF_TIME_AFTER_MS = 50 * 60 * 1000;

/** Pure — the same testability split as `buildSnapshot`. */
export function buildWidgetLive(
  matches: readonly LiveMatchView[],
  now: Date,
): WidgetLiveState {
  const rows: WidgetLiveMatch[] = [];

  for (const match of matches) {
    if (match.status !== 'live') continue;

    const minute = liveMinute(match);
    const kickoff = Date.parse(match.kickoffUtc);
    const atBreak =
      minute === null &&
      !Number.isNaN(kickoff) &&
      now.getTime() - kickoff > HALF_TIME_AFTER_MS;

    // The last goal, as a rendered line. ⚠ `events` is often `[]` while the
    // score is not — a fetch that has not landed, not unattributed goals
    // (LIVE-SCORES.md §2) — so the line is a bonus, never load-bearing.
    const lastGoal = [...match.events].reverse().find((event) => event.type === 'goal');

    rows.push({
      fixtureId: match.fixtureId,
      status: atBreak ? 'halfTime' : 'live',
      minute,
      minuteAt: now.toISOString(),
      homeGoals: match.score.home,
      awayGoals: match.score.away,
      lastEvent: lastGoal ? `${lastGoal.player.name} ${lastGoal.minute}′` : null,
    });
  }

  return {
    v: LIVE_VERSION,
    writtenAt: now.toISOString(),
    source: 'app',
    matches: rows,
  };
}

/**
 * The "did anything move" key. ⚠ Excludes `writtenAt` AND `minuteAt` AND the
 * minute itself — the same budget rule as `snapshotKey`, tightened: the minute
 * advances every poll, and a reload per minute is exactly the spend that
 * freezes the widget for the day. The extension ticks the minute on-device
 * from `minuteAt`; the app only needs to reload on a SCORE or STATE change.
 */
export function widgetLiveKey(state: WidgetLiveState): string {
  return JSON.stringify(
    state.matches.map((match) => [
      match.fixtureId,
      match.status,
      match.homeGoals,
      match.awayGoals,
      match.lastEvent,
    ]),
  );
}

let lastKey: string | null = null;

/**
 * Write and reload, if a score or state actually changed.
 *
 * ⚠ No debounce — the caller is `useLive`'s 15-second poll, which is already
 * the slow path; the key guard is what protects the reload budget. Skips
 * entirely when nothing is live (see the file header for why an empty list is
 * never written).
 */
export function applyWidgetLive(matches: readonly LiveMatchView[], now: Date): void {
  const state = buildWidgetLive(matches, now);
  if (state.matches.length === 0) return;

  const key = widgetLiveKey(state);
  if (key === lastKey) return;

  if (!writeGroupJson(SNAPSHOT_DIR, LIVE_NAME, state)) return;
  lastKey = key;
  void reloadWidgets();
}
