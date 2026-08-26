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
import * as Notifications from 'expo-notifications';

import { abbreviate } from '@/lib/cronogol/derive';
import type { WindowFixtureView } from '@/lib/cronogol/types';
import { PUSH_AVAILABLE } from './capability';
import { CATEGORY_REMINDER } from './categories';
import {
  attachmentCopy,
  crestPairFile,
  pruneCrestCache,
  warmLongLookCrests,
} from './crest-cache';

/** How far ahead to schedule. Beyond this, a later launch re-arms. */
export const REMINDER_HORIZON_DAYS = 21;

/** Below iOS's hard 64 so other notification types keep room. */
export const REMINDER_BUDGET = 60;

export const REMINDER_LEAD_MS = 30 * 60 * 1000;

/**
 * How many reminders get crest artwork.
 *
 * ⚠ **The re-arm runs on every foreground**, not just on a data change
 * (`use-push-sync.ts`). Fetching a plate for all 60 would put sixty round-trips
 * on every resume from the app switcher. The soonest few are the ones a reader
 * will actually see today; the rest inherit artwork on a later re-arm as they
 * climb the queue. Cached hits are free, so a settled queue costs nothing.
 */
export const REMINDER_ARTWORK_BUDGET = 12;

/** Copy for a reminder. Passed in so this module never sees a language. */
export interface ReminderCopy {
  title: (home: string, away: string) => string;
  body: (kickoff: string, venue: string | null) => string;
}

export interface PlannedReminder {
  fixtureId: string;
  clubSlug: string;
  /** When the notification fires — kickoff minus the lead. */
  fireAt: Date;
  kickoffUtc: string;
  homeName: string;
  awayName: string;
  venue: string | null;
  /** Pre-formatted in the reader's zone — this module holds no clock preference. */
  kickoffLabel: string;
  /**
   * ⚠ The four fields below exist for the LONG LOOK, not for the banner.
   *
   * The content extension runs in its own process and can read nothing but the
   * payload — not this app's store, not its API client, not `copy.ts`. Anything
   * the card draws has to be sitting in `data` before the notification is
   * scheduled (ADR 0036).
   */
  round: string | null;
  homeAbbr: string;
  awayAbbr: string;
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
  formatKickoff: (iso: string) => string = () => '',
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
      kickoffLabel: formatKickoff(fixture.kickoffUtc),
      round: fixture.round,
      // ⚠ `shortName` is nullable and NOT unique — `abbreviate` is the same
      // guard the club pages use, never a raw `shortName` read.
      homeAbbr: fixture.homeTeam
        ? abbreviate(fixture.homeTeam.name, fixture.homeTeam.slug, fixture.homeTeam.shortName)
        : '',
      awayAbbr: fixture.awayTeam
        ? abbreviate(fixture.awayTeam.name, fixture.awayTeam.slug, fixture.awayTeam.shortName)
        : '',
    }));
}

/**
 * Fetch the composed crest plate for the soonest few, in parallel.
 *
 * ⚠ Returns a map, not a mutated list, so `selectReminders` stays pure and the
 * whole selection is still exercisable in a plain-JS harness.
 *
 * A miss is expected and cheap: the entry is simply absent and that reminder is
 * scheduled without artwork.
 */
async function artworkFor(
  planned: readonly PlannedReminder[],
): Promise<Map<string, string>> {
  const attachments = new Map<string, string>();

  const head = planned.slice(0, REMINDER_ARTWORK_BUDGET);
  await Promise.all(
    head.map(async (reminder) => {
      const cached = await crestPairFile(reminder.fixtureId);
      if (!cached) return;

      // ⚠ A COPY. iOS MOVES an attachment into its own store — handing over the
      // cached file would empty the cache on every fire. See `crest-cache.ts`.
      const copyUri = await attachmentCopy(cached, reminder.fixtureId);
      if (copyUri) attachments.set(reminder.fixtureId, copyUri);

      // The long look needs the two crests separately, in the App Group.
      await warmLongLookCrests(reminder.fixtureId);
    }),
  );

  return attachments;
}

/**
 * Cancel everything and schedule the current selection.
 *
 * ⚠ Wholesale replace, not incremental. A moved kickoff changes the fire time of
 * a notification we cannot address individually without tracking ids across
 * launches — and re-arming from scratch is cheap and cannot drift.
 */
export async function applyReminders(
  planned: readonly PlannedReminder[],
  copy: ReminderCopy,
): Promise<number> {
  if (!PUSH_AVAILABLE) return 0;

  try {
    // ⚠ Artwork BEFORE the cancel. The downloads are the slow part, and a queue
    // emptied first would leave the reader with no reminders at all for however
    // long the network takes.
    const attachments = await artworkFor(planned);

    // ⚠ Cancel first, unconditionally. Without this every re-arm ADDS to the
    // queue and the 64-slot budget is gone within a few launches.
    await Notifications.cancelAllScheduledNotificationsAsync();

    let scheduled = 0;
    for (const reminder of planned) {
      const attachment = attachments.get(reminder.fixtureId);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: copy.title(reminder.homeName, reminder.awayName),
          body: copy.body(reminder.kickoffLabel, reminder.venue),
          sound: 'default',
          /**
           * ⚠ This is what makes the long look appear, and it has to match the
           * extension's `UNNotificationExtensionCategory` exactly — see the
           * three-way contract documented in `categories.ts`.
           */
          categoryIdentifier: CATEGORY_REMINDER,
          /**
           * ⚠ `active`, NOT `timeSensitive`. Time Sensitive needs the
           * `com.apple.developer.usernotifications.time-sensitive` entitlement,
           * which this app does not declare — asking for the level without the
           * entitlement gets it silently downgraded, so declaring `active` is
           * the honest version of the same delivery.
           */
          interruptionLevel: 'active',
          ...(attachment
            ? {
                attachments: [
                  {
                    identifier: 'crest',
                    url: attachment,
                    // ⚠ `type` is read-only on the way OUT — SDK 57 requires the
                    // key on the input record but never sends it to iOS
                    // (`NotificationRecords.swift`). `typeHint` is the one that
                    // travels, and without it iOS cannot type the file and drops
                    // the attachment silently.
                    type: null,
                    typeHint: 'public.png',
                  },
                ],
              }
            : {}),
          data: {
            type: 'kickoff_reminder',
            fixtureId: reminder.fixtureId,
            clubSlug: reminder.clubSlug,
            // ⚠ Same shape the SERVER sends, so one routing handler serves both.
            deepLink: `altagamafc://club/${reminder.clubSlug}`,
            // ⚠ Everything below is for the CONTENT EXTENSION, which can read
            // nothing else. Dropping a key here blanks a row on the card.
            homeName: reminder.homeName,
            awayName: reminder.awayName,
            homeAbbr: reminder.homeAbbr,
            awayAbbr: reminder.awayAbbr,
            venue: reminder.venue,
            round: reminder.round,
            kickoffUtc: reminder.kickoffUtc,
            kickoffLabel: reminder.kickoffLabel,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.fireAt,
        },
        /**
         * ⚠ **No `threadIdentifier`.** The server sets `thread-id` =
         * `fixture-{uuid}` on its pushes so a re-scheduled kickoff collapses
         * instead of stacking — but `NotificationContentInput` in SDK 57 exposes
         * `threadIdentifier` as OUTPUT only, so a locally scheduled notification
         * cannot join that thread. Consequence: a local reminder and a later
         * server "kickoff moved" for the same fixture appear as two notifications,
         * not one collapsed thread. Acceptable — they say different things — but
         * it is a real divergence from the design's grouping rule.
         */
      });
      scheduled += 1;
    }

    // ⚠ LAST, never first. Pruning ahead of the schedule would delete the very
    // files the loop above just attached.
    pruneCrestCache(planned.map((reminder) => reminder.fixtureId));

    return scheduled;
  } catch {
    // Permission revoked mid-session, or the queue is full. Next launch re-arms.
    return 0;
  }
}
