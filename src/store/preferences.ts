/**
 * Device preferences: followed clubs, language, clock, timezone, onboarding.
 *
 * ⚠ The SEMANTICS are ported from `cronogol/components/preferences-provider.tsx`
 * (ADR 0018); the mechanism is not. `useSyncExternalStore` survives — it is a
 * React built-in, not a web one — but `localStorage` becomes AsyncStorage, which
 * is **async**, so the store hydrates after first paint. There is no cross-tab
 * `storage` event to listen for.
 *
 * ⚠ **`followed` means something different here than on the web.** There, it was
 * a cache of which clubs the account owned a calendar feed for, reconciled from
 * `listMyFeeds`. In an anonymous v1 (ADR 0019) there is no account and no server
 * list: this device's array IS the follow state, and it is what gets sent as
 * `clubSlugs` on every `PUT /cronogol/push/device`. Losing it loses the user's
 * subscriptions — which is exactly why the two version constants below are
 * separate.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';

import { effectiveZone } from '@/lib/timezones';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/phrases';

const STORAGE_KEY = 'altagama:preferences';

/** Bump when the stored SHAPE changes. */
const SCHEMA_VERSION = 1;

/**
 * ⚠ **The version `followed` changed meaning at — NOT `SCHEMA_VERSION`.**
 *
 * `parse` resets `followed` only for payloads older than this. Gating that reset
 * on whatever `SCHEMA_VERSION` happens to be would empty every user's follow
 * list on *any* later bump, for a field that did not move — and here that is
 * worse than it was on the web, where the list refilled from the account's feeds
 * on the next visit. There is no account to refill from: the loss is permanent
 * and silent, and the user finds out when their alerts stop.
 */
const FOLLOWED_RULE_VERSION = 1;

export type ClockFormat = '24' | '12';

export interface Preferences {
  v: number;
  /** Club slugs this device follows. The source of truth — see the header. */
  followed: readonly string[];
  /**
   * The explicit timezone pick — an id from the six, not an IANA zone.
   *
   * ⚠ **`null` means "follow the device", and it is the default.** It is not
   * "unset, fall back to Madrid". The six are a shortlist of quick picks, not
   * the set of zones this app can display: a reader in Chicago must see Chicago
   * kickoffs, not Madrid ones with nothing on screen saying so.
   */
  tz: string | null;
  clock: ClockFormat;
  /** `null` = follow the device locale. */
  lang: Locale | null;
  onboarded: boolean;
  /**
   * Alert types.
   *
   * ⚠ **Global, not per club** — the design and the backend agree on this. Per
   * club there is only on/off, which is `followed`.
   *
   * ⚠ `reminder` is APP-OWNED: the server never sends a kickoff reminder, by
   * design. The app schedules it locally from fixture data. The other two become
   * `alertMoved` / `alertPostponed` on `PUT /cronogol/push/device` unchanged, so
   * this shape is the wire shape and stays that way.
   *
   * There is deliberately no `goals`: that type does not exist and is not coming
   * without a live feed. Its switch is drawn disabled with its reason.
   */
  alertReminder: boolean;
  alertMoved: boolean;
  alertPostponed: boolean;
}

const DEFAULTS: Preferences = {
  v: SCHEMA_VERSION,
  followed: [],
  tz: null,
  clock: '24',
  lang: null,
  onboarded: false,
  alertReminder: true,
  alertMoved: true,
  alertPostponed: true,
};

let snapshot: Preferences = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function parse(raw: string | null): Preferences {
  if (!raw) return DEFAULTS;
  try {
    const data = JSON.parse(raw) as Partial<Preferences> & { v?: number };
    const version = typeof data.v === 'number' ? data.v : 0;
    return {
      v: SCHEMA_VERSION,
      followed:
        version >= FOLLOWED_RULE_VERSION && Array.isArray(data.followed)
          ? data.followed.filter((s): s is string => typeof s === 'string')
          : [],
      tz: typeof data.tz === 'string' ? data.tz : null,
      clock: data.clock === '12' ? '12' : '24',
      lang: isLocale(data.lang) ? data.lang : null,
      onboarded: data.onboarded === true,
      // Default ON: a follower who has not opened settings wants to be told.
      alertReminder: data.alertReminder !== false,
      alertMoved: data.alertMoved !== false,
      alertPostponed: data.alertPostponed !== false,
    };
  } catch {
    return DEFAULTS;
  }
}

function same(a: Preferences, b: Preferences): boolean {
  return (
    a.tz === b.tz &&
    a.clock === b.clock &&
    a.lang === b.lang &&
    a.onboarded === b.onboarded &&
    a.alertReminder === b.alertReminder &&
    a.alertMoved === b.alertMoved &&
    a.alertPostponed === b.alertPostponed &&
    a.followed.length === b.followed.length &&
    a.followed.every((slug, i) => slug === b.followed[i])
  );
}

function commit(next: Preferences) {
  const changed = !same(snapshot, next);
  // The identity is only replaced when something actually moved:
  // `useSyncExternalStore` compares snapshots with `Object.is`, so handing it an
  // equal-but-new object schedules a render whether anything was emitted or not.
  if (changed) snapshot = next;

  // ⚠ The write happens either way. Persisting an unchanged value is what makes
  // an explicit timezone pick that matches the detected one stick: without it
  // nothing is stored, and the next launch re-detects over the user's choice.
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
    // Storage full or unavailable. The value still holds for this session.
  });

  if (changed) emit();
}

/**
 * Read the persisted preferences. Call once, as early as possible.
 *
 * AsyncStorage is async, so there is a window before this resolves where the
 * store answers `DEFAULTS`. `useHydrated()` is how a screen tells "this user
 * follows nothing" from "we have not looked yet" — the two look identical and
 * render very differently (the follow card vs the board).
 */
export async function hydratePreferences(): Promise<void> {
  if (hydrated) return;
  try {
    snapshot = parse(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    snapshot = DEFAULTS;
  }
  hydrated = true;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => snapshot;
const getHydrated = () => hydrated;

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getHydrated, getHydrated);
}

/* ── writers ──────────────────────────────────────────────────────────────
   Module-level rather than context methods, so anything can call them without
   a hook — including the push-registration effect and the widget snapshot
   writer, neither of which is a component.
   ─────────────────────────────────────────────────────────────────────── */

function update(patch: Partial<Preferences>) {
  commit({ ...snapshot, ...patch });
}

/**
 * ⚠ Union, never removal: appending keeps existing positions, so re-running a
 * reconcile over the same set produces an element-wise identical array and
 * terminates. Use `unfollowClub` to remove.
 */
export function followClubs(slugs: readonly string[]) {
  const missing = slugs.filter((slug) => !snapshot.followed.includes(slug));
  if (missing.length === 0) return;
  update({ followed: [...snapshot.followed, ...missing] });
}

export function followClub(slug: string) {
  followClubs([slug]);
}

export function unfollowClub(slug: string) {
  if (!snapshot.followed.includes(slug)) return;
  update({ followed: snapshot.followed.filter((entry) => entry !== slug) });
}

export function setTimezoneId(id: string | null) {
  update({ tz: id });
}

export function setClock(clock: ClockFormat) {
  update({ clock });
}

export function setLanguage(lang: Locale | null) {
  update({ lang });
}

export function setOnboarded(onboarded: boolean) {
  update({ onboarded });
}

export function setAlert(
  key: 'alertReminder' | 'alertMoved' | 'alertPostponed',
  value: boolean,
) {
  update({ [key]: value });
}

/**
 * Unfollow everything on this device.
 *
 * ⚠ This is the anonymous v1 stand-in for "delete account" (ADR 0019). It clears
 * local follow state and, once push exists, calls `DELETE /cronogol/push/device`.
 * It CANNOT remove a calendar the user already subscribed to — no server can. The
 * confirmation copy has to say so.
 */
export function clearFollows() {
  update({ followed: [] });
}

/* ── resolved reads ───────────────────────────────────────────────────── */

/** The IANA zone everything on screen renders in. */
export function useZone(): string {
  return effectiveZone(usePreferences().tz);
}

/**
 * The device's language, if it is one we speak.
 *
 * ⚠ Matched on the language subtag only: `es-419` (Latin American Spanish) and
 * `es-ES` are both Spanish for our purposes, and a reader whose phone is set to
 * `en-AU` gets English rather than falling through to the Spanish default.
 * Computed once — the OS language cannot change without restarting the app.
 */
const DEVICE_LOCALE: Locale = (() => {
  try {
    for (const { languageCode } of getLocales()) {
      if (isLocale(languageCode)) return languageCode;
    }
  } catch {
    // Fall through.
  }
  return DEFAULT_LOCALE;
})();

/**
 * The active locale. `null` follows the device; Spanish is the last resort
 * because Spain is the primary market.
 */
export function useLocale(): Locale {
  return usePreferences().lang ?? DEVICE_LOCALE;
}
