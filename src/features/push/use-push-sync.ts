/**
 * Keeps the device registration and the local reminders in step, from one place.
 *
 * ⚠ Mounted once in the root layout. Screens never call push code — they change
 * preferences, and this decides whether there is anywhere to send them. That is
 * what keeps `PUSH_AVAILABLE` out of every component (ADR 0023).
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { formatKickoffTime, formatWidgetKickoff, formatWidgetKickoffParts } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useNews } from '@/queries/use-news';
import { useUpcoming, useWidgetWindow } from '@/queries/use-today';
import { useLocale, usePreferences, useZone } from '@/store/preferences';
import { useSession } from '@/store/session';
import { useRouter } from 'expo-router';

import { scheduleNewsSync } from '@/features/news/sync';
import { pinWidgetCrests } from '@/features/widgets/pins';
import { buildSnapshot } from '@/features/widgets/snapshot';
import { scheduleWidgetSync } from '@/features/widgets/sync';
import { registerNotificationCategories } from './categories';
import { applyReminders, selectReminders } from './reminders';
import { initialRoute, onNotificationTap } from './routing';
import { schedulePushSync, syncPushRegistration } from './sync';
import { PUSH_AVAILABLE, WIDGETS_AVAILABLE, onPushToStartToken } from './capability';

export function usePushSync(): void {
  const router = useRouter();
  const prefs = usePreferences();
  const locale = useLocale();
  const zone = useZone();
  const { copy, phrases } = useI18n();
  const upcoming = useUpcoming(zone);
  // ⚠ A SECOND, WIDER window (21 days). The widget must not go blank over an
  // international break — see `useWidgetWindow`.
  const widgetWindow = useWidgetWindow(zone);
  // The NEWS widget's feed (ADR 0061). Global, one request, `STALE.feed`.
  const news = useNews();
  const session = useSession();

  // Cold launch: tokens rotate on restore and reinstall, so always re-assert.
  useEffect(() => {
    void syncPushRegistration(prefs, locale);
    // Intentionally launch-only; the effect below covers subsequent changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follows or alert switches changed. Debounced — the route is 20/min.
  useEffect(() => {
    schedulePushSync(prefs, locale);
  }, [prefs.followed, prefs.alertMoved, prefs.alertPostponed, locale, prefs]);

  // Signed in, or switched accounts: re-register so the row links to the account.
  // ⚠ Debounced through the same path, so this cannot stack with the effect above
  // when a sign-in and a follow land together.
  // ⚠ Keyed on the user id, not the session object — that identity changes on
  // every hourly token refresh, and re-registering on a timer would eat the
  // 20/min budget for nothing.
  useEffect(() => {
    if (!session) return;
    schedulePushSync(prefs, locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.userId]);

  // The ActivityKit push-to-start token arrived or rotated (ADR 0055).
  //
  // ⚠⚠ **This is not optional plumbing.** The token rotates on reinstall and on
  // restore-from-backup, and a start push to a stale one is ACCEPTED by APNs and
  // simply never produces a card — so without this effect a restored phone stops
  // getting Live Activities forever, with nothing anywhere saying why.
  //
  // ⚠ Debounced through the same path as everything else: the token can land in
  // the same tick as the cold-launch registration above, and the route is 20/min.
  // `registrationChanged` makes the redundant one free.
  useEffect(() => {
    return onPushToStartToken(() => schedulePushSync(prefs, locale));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // Categories — the long-look card and the action button both key off these.
  // ⚠ Re-runs on a language change: iOS caches a category by identifier, so a
  // registration made in Spanish keeps a Spanish button until it is replaced.
  // ⚠ Ordering against the re-arm below does NOT matter: iOS resolves a
  // `categoryIdentifier` when the notification is DISPLAYED, not when it is
  // scheduled. A reminder scheduled a moment before this lands still gets its
  // card, because the soonest one is minutes away at best.
  useEffect(() => {
    void registerNotificationCategories(copy.reminders.openClub);
  }, [copy]);

  // Notification taps, cold and warm. ⚠ Both, or cold-start taps are lost.
  useEffect(() => {
    if (!PUSH_AVAILABLE) return;
    void initialRoute().then((route) => {
      if (route) router.push(route);
    });
    return onNotificationTap((route) => router.push(route));
  }, [router]);

  // Re-arm reminders and rewrite the widget snapshot whenever the follow set or
  // the fixture data moves, and on foreground — a notification that fired while
  // backgrounded frees a slot, and a widget that has been on screen all night
  // wants the next match.
  //
  // ⚠⚠ **ONE effect, and the order inside it is load-bearing.** Two things make
  // it so:
  //
  //  1. **The widget half is NOT gated on `prefs.alertReminder`.** A reader who
  //     turned kickoff reminders off still gets widgets — they are not the same
  //     feature and never were.
  //  2. **The pin must be set before `applyReminders` runs**, because that
  //     function ends by pruning the App Group crest directory against the
  //     REMINDER queue. The widget's fixtures come from a 21-day window and the
  //     reminders' from 7, so the widget's crests are routinely outside it and
  //     would be deleted on this very foreground. See the ⚠⚠ block on the App
  //     Group sweep in `crest-cache.ts`.
  //
  // ⚠ And one `AppState` listener, not two. A second subscription here would
  // double every re-arm.
  useEffect(() => {
    const sync = () => {
      const now = new Date();

      const snapshot =
        WIDGETS_AVAILABLE && widgetWindow.data
          ? buildSnapshot(
              widgetWindow.data.fixtures,
              prefs.followed,
              now,
              copy,
              // ⚠ NOT `formatKickoffTime` — the widget needs the weekday too
              // (`Sat 21:00`), because a tile with no date on it cannot say
              // whether `21:00` is tonight or a week on Tuesday.
              (iso) => formatWidgetKickoff(iso, zone, prefs.clock, phrases),
              (iso) => formatWidgetKickoffParts(iso, zone, prefs.clock, phrases),
            )
          : null;

      // ⚠ SYNCHRONOUSLY, before anything below can await. Losing this race only
      // costs a re-download on the next warm — but it shows as a flash of
      // lettered tiles for clubs that have real crests.
      if (snapshot) pinWidgetCrests(snapshot.entries.map((entry) => entry.fixtureId));

      if (PUSH_AVAILABLE && prefs.alertReminder && upcoming.data) {
        const planned = selectReminders(
          upcoming.data.fixtures,
          prefs.followed,
          prefs.reminderLeads,
          now,
          (iso) => formatKickoffTime(iso, zone, prefs.clock),
        );
        void applyReminders(planned, {
          title: copy.reminders.title,
          body: copy.reminders.body,
        });
      }

      // ⚠ Debounced and change-guarded inside — WidgetKit rations reloads and
      // this runs on every single foreground.
      if (snapshot) scheduleWidgetSync(snapshot);

      // ⚠ Same re-arm, own file, own debounce and own change guard — the two
      // snapshots refresh on different clocks and must not hold each other up.
      if (WIDGETS_AVAILABLE && news.data) scheduleNewsSync(news.data.articles, now, copy);
    };

    sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
    // ⚠ `reminderLeads` is in the deps: changing a lead changes the whole pending
    // queue, and without it a toggled lead would not take effect until the next
    // foreground.
    // ⚠ `copy` is in there for the WIDGET as much as for the reminders — the
    // snapshot carries its own furniture strings, so a language switch has to
    // rewrite it (ADR 0047).
  }, [
    upcoming.data,
    widgetWindow.data,
    news.data,
    prefs.followed,
    prefs.alertReminder,
    prefs.reminderLeads,
    prefs.clock,
    zone,
    copy,
    phrases,
  ]);
}
