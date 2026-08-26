/**
 * Keeps the device registration and the local reminders in step, from one place.
 *
 * ⚠ Mounted once in the root layout. Screens never call push code — they change
 * preferences, and this decides whether there is anywhere to send them. That is
 * what keeps `PUSH_AVAILABLE` out of every component (ADR 0023).
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { formatKickoffTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useUpcoming } from '@/queries/use-today';
import { useLocale, usePreferences, useZone } from '@/store/preferences';
import { useRouter } from 'expo-router';

import { registerNotificationCategories } from './categories';
import { applyReminders, selectReminders } from './reminders';
import { initialRoute, onNotificationTap } from './routing';
import { schedulePushSync, syncPushRegistration } from './sync';
import { PUSH_AVAILABLE } from './capability';

export function usePushSync(): void {
  const router = useRouter();
  const prefs = usePreferences();
  const locale = useLocale();
  const zone = useZone();
  const { copy } = useI18n();
  const upcoming = useUpcoming(zone);

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

  // Re-arm reminders whenever the follow set or the fixture data moves, and on
  // foreground — a notification that fired while backgrounded frees a slot.
  useEffect(() => {
    if (!PUSH_AVAILABLE || !prefs.alertReminder || !upcoming.data) return;

    const rearm = () => {
      const planned = selectReminders(
        upcoming.data.fixtures,
        prefs.followed,
        new Date(),
        (iso) => formatKickoffTime(iso, zone, prefs.clock),
      );
      void applyReminders(planned, {
        title: copy.reminders.title,
        body: copy.reminders.body,
      });
    };

    rearm();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') rearm();
    });
    return () => subscription.remove();
  }, [upcoming.data, prefs.followed, prefs.alertReminder, prefs.clock, zone, copy]);
}
