/**
 * Local kickoff reminders.
 *
 * ⚠ **The server never sends these, by design.** The app schedules them from
 * fixture data it already holds. That is why the reminder switch is local state
 * and never reaches `PUT /cronogol/push/device`.
 *
 * ⚠ **iOS allows 64 pending local notifications per app, total.** Twenty followed
 * clubs × 38 fixtures is 760. `scheduleNotificationAsync` past the cap does not
 * error — iOS silently keeps the 64 soonest and drops the rest, which is *almost*
 * the behaviour we want but not something to rely on. `selectReminders` below is
 * the explicit rolling window that makes it deterministic.
 *
 * ⚠ **A TBD kickoff is NEVER scheduled.** `kickoffTbd` means the timestamp is
 * `00:00:00Z` — a date wearing a midnight time — so "30 minutes before" would
 * fire at 01:30 Madrid for a match actually kicking off at 21:00.
 *
 * The selection is pure and is exercised by `_debug` today. Only `applyReminders`
 * needs the notifications API, and it no-ops until the licence lands (ADR 0023).
 */
import type { WindowFixtureView } from '@/lib/cronogol/types';
import { PUSH_AVAILABLE } from './capability';

/** How far ahead to schedule. Beyond this, a later launch re-arms. */
export const REMINDER_HORIZON_DAYS = 21;

/** Below iOS's hard 64 so other notification types keep room. */
export const REMINDER_BUDGET = 60;

export const REMINDER_LEAD_MS = 30 * 60 * 1000;

export interface PlannedReminder {
  fixtureId: string;
  clubSlug: string;
  /** When the notification fires — kickoff minus the lead. */
  fireAt: Date;
  kickoffUtc: string;
  homeName: string;
  awayName: string;
  venue: string | null;
}

/**
 * Which fixtures deserve a reminder right now.
 *
 * Sorted by kickoff and truncated to the budget, so the soonest always win.
 */
export function selectReminders(
  fixtures: readonly WindowFixtureView[],
  followed: readonly string[],
  now: Date,
  budget: number = REMINDER_BUDGET,
): PlannedReminder[] {
  const horizon = now.getTime() + REMINDER_HORIZON_DAYS * 24 * 3600_000;

  return fixtures
    .filter((fixture) => {
      // ⚠ Provisional kickoffs are a date, not an instant. Never schedule one.
      if (fixture.kickoffTbd) return false;
      if (fixture.status === 'cancelled' || fixture.status === 'postponed') return false;

      const kickoff = Date.parse(fixture.kickoffUtc);
      if (Number.isNaN(kickoff)) return false;
      // The reminder itself must still be in the future, not just the kickoff.
      if (kickoff - REMINDER_LEAD_MS <= now.getTime()) return false;
      if (kickoff > horizon) return false;

      return (
        (fixture.homeTeam !== null && followed.includes(fixture.homeTeam.slug)) ||
        (fixture.awayTeam !== null && followed.includes(fixture.awayTeam.slug))
      );
    })
    .sort((a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc))
    .slice(0, budget)
    .map((fixture) => ({
      fixtureId: fixture.id,
      clubSlug:
        fixture.homeTeam && followed.includes(fixture.homeTeam.slug)
          ? fixture.homeTeam.slug
          : (fixture.awayTeam?.slug ?? ''),
      fireAt: new Date(Date.parse(fixture.kickoffUtc) - REMINDER_LEAD_MS),
      kickoffUtc: fixture.kickoffUtc,
      homeName: fixture.homeTeam?.name ?? '',
      awayName: fixture.awayTeam?.name ?? '',
      venue: fixture.venue,
    }));
}

/**
 * Cancel everything and schedule the current selection.
 *
 * ⚠ Wholesale replace, not incremental. A moved kickoff changes the fire time of
 * a notification we cannot address individually without tracking ids across
 * launches — and re-arming from scratch is cheap and cannot drift.
 *
 * No-op until the licence lands.
 */
export async function applyReminders(planned: readonly PlannedReminder[]): Promise<number> {
  if (!PUSH_AVAILABLE) return 0;
  // GO-LIVE step 3:
  //   await Notifications.cancelAllScheduledNotificationsAsync();
  //   for (const r of planned) {
  //     await Notifications.scheduleNotificationAsync({
  //       content: { title: `${r.homeName} v ${r.awayName} · 30 minutes`, body: …,
  //                  data: { type: 'kickoff_reminder', fixtureId: r.fixtureId,
  //                          deepLink: `altagamafc://club/${r.clubSlug}` },
  //                  threadIdentifier: `fixture-${r.fixtureId}` },
  //       trigger: { type: 'date', date: r.fireAt },
  //     });
  //   }
  throw new Error('PUSH_AVAILABLE is true but applyReminders is not implemented');
}
