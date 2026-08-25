/**
 * Keeps the device registration and the local reminders in step, from one place.
 *
 * ⚠ Mounted once in the root layout. Screens never call push code — they change
 * preferences, and this decides whether there is anywhere to send them. That is
 * what keeps `PUSH_AVAILABLE` out of every component (ADR 0023).
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useLocale, usePreferences } from '@/store/preferences';
import { useUpcoming } from '@/queries/use-today';
import { useZone } from '@/store/preferences';
import { applyReminders, selectReminders } from './reminders';
import { schedulePushSync, syncPushRegistration } from './sync';
import { PUSH_AVAILABLE } from './capability';

export function usePushSync(): void {
  const prefs = usePreferences();
  const locale = useLocale();
  const zone = useZone();
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

  // Re-arm reminders whenever the follow set or the fixture data moves, and on
  // foreground — a notification that fired while backgrounded frees a slot.
  useEffect(() => {
    if (!PUSH_AVAILABLE || !prefs.alertReminder || !upcoming.data) return;

    const rearm = () => {
      const planned = selectReminders(upcoming.data.fixtures, prefs.followed, new Date());
      void applyReminders(planned);
    };

    rearm();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') rearm();
    });
    return () => subscription.remove();
  }, [upcoming.data, prefs.followed, prefs.alertReminder]);
}
