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

/**
 * Bump when the stored SHAPE changes.
 *
 * ⚠ 2 added `reminderLeads` (ADR 0040); 5 added `savedStories` (ADR 0129).
 * Bumping is safe precisely because `FOLLOWED_RULE_VERSION` did NOT move —
 * that separation is what stops a shape bump from emptying every reader's
 * follow list.
 */
const SCHEMA_VERSION = 5;

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

/**
 * How long before kickoff a reminder can fire, in minutes.
 *
 * ⚠ **A CLOSED set, ordered earliest-first.** It is not a range and not a
 * free-text minute count: every value here costs a slot out of iOS's hard 64
 * (see `features/push/reminders.ts`), and each one needs its own line of
 * notification copy in both languages plus its own eyebrow string in the content
 * extension's two `.lproj` files. Adding a fourth is a four-file change, not a
 * number.
 *
 * ⚠ The order is load-bearing: `setReminderLead` filters this constant rather
 * than sorting the stored array, so the persisted list is always earliest-first
 * with no sort anywhere.
 */
export const REMINDER_LEAD_OPTIONS = [60, 30, 15] as const;

export type ReminderLead = (typeof REMINDER_LEAD_OPTIONS)[number];

export function isReminderLead(value: unknown): value is ReminderLead {
  return REMINDER_LEAD_OPTIONS.includes(value as ReminderLead);
}

/**
 * One saved story (ADR 0129) — a SNAPSHOT, not a reference.
 *
 * ⚠ Keyed on `url`, never the API `id`: articles are purged from the backend
 * 30 days after publication and their ids die with them (`types.ts`), so a
 * saved story must render entirely from what is stored here. The fields are
 * frozen at save time — `title` already through `plainText`.
 */
export interface SavedStory {
  url: string;
  title: string;
  publisher: string;
  /** Drives open-in-app vs the link-out sheet, exactly as on the feed. */
  isFirstParty: boolean;
  imageUrl: string | null;
  publishedAt: string;
  topic: string | null;
  /** The story sheet's description and byline — nullable on the wire, and
   *  absent on rows saved before the sheet rendered them (parse → null). */
  excerpt: string | null;
  author: string | null;
  savedAt: string;
}

/**
 * ⚠ Newest-saved-first, capped: preferences travel through AsyncStorage as one
 * JSON string, and an unbounded list of snapshots is how that write starts
 * failing quietly. A hundred is weeks of deliberate saving — ~40 KB worst case
 * with every row carrying a full 400-char excerpt, well inside the store.
 */
export const SAVED_STORY_CAP = 100;

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
   * `alertGoals` joined them at ADR 0053, when the backend grew a dispatch path
   * for the live event feed. It is the wire shape too.
   */
  alertReminder: boolean;
  alertMoved: boolean;
  alertPostponed: boolean;
  /**
   * Goals, red cards and full time for a followed club (ADR 0053).
   *
   * ⚠ **ONE switch for all three**, matching the design: a reader who wants to
   * know about a goal wants to know about the sending-off that shaped it.
   *
   * ⚠ **Defaults OFF, unlike the other three.** They describe a fixture already
   * in the reader's calendar; this is a new class of interruption — several per
   * match, breaking through a Focus — and turning it on for everyone who
   * upgrades would be us making that choice for them.
   *
   * ⚠ LaLiga only, because the live feed is. The account sheet says so; do not
   * let that note drift from `useLive`'s real coverage.
   */
  alertGoals: boolean;
  /**
   * Which lead times a kickoff reminder fires at (ADR 0040).
   *
   * ⚠ **`alertReminder` is still the master and this list is subordinate to it.**
   * Leads off means no reminders whatever this holds; the list survives so that
   * turning the master back on restores the reader's picks rather than resetting
   * them to 30.
   *
   * ⚠ **This can never be empty while `alertReminder` is true.** A green switch
   * that delivers nothing is the same dishonesty the score-age lines exist to
   * prevent, so `setReminderLead` and `setAlert` keep the two coupled — do not
   * write either field through `update` directly.
   *
   * ⚠ Device-local, exactly like `alertReminder`: the server never sends a
   * kickoff reminder and this never reaches `PUT /cronogol/push/device`.
   */
  reminderLeads: readonly ReminderLead[];
  /**
   * The instant the News screen was last opened (ADR 0064). Drives the Today
   * card's `n NEW` count; `null` (never opened) counts nothing, so a first run
   * does not open on `20 NEW`. Marked on OPENING the screen, not on scrolling
   * past a row — the handoff's open question, resolved the simple way.
   */
  newsSeenAt: string | null;
  /** Saved stories, newest-saved-first (ADR 0129). See `SavedStory`. */
  savedStories: readonly SavedStory[];
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
  // ⚠ The one alert that defaults OFF. See the field's docblock.
  alertGoals: false,
  reminderLeads: [30],
  newsSeenAt: null,
  savedStories: [],
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
      // ⚠ `=== true`, NOT `!== false` — the opposite test to the three above,
      // and deliberately. Absent on every v1 and v2 payload, and absent must
      // mean OFF: an upgrade is not consent to be interrupted.
      alertGoals: data.alertGoals === true,
      // ⚠ Absent on every v1 payload, which had one hardcoded 30-minute lead.
      // Migrating to `[30]` UNCONDITIONALLY — including when the master is off —
      // is what makes turning it back on behave as it did before the upgrade.
      reminderLeads: parseLeads(data.reminderLeads),
      // Absent on every v1–v3 payload; absent means "never opened".
      newsSeenAt: typeof data.newsSeenAt === 'string' ? data.newsSeenAt : null,
      // Absent on every v1–v4 payload; absent means "nothing saved".
      savedStories: parseSavedStories(data.savedStories),
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * ⚠ Rebuilt by FILTERING `REMINDER_LEAD_OPTIONS`, never by sorting the stored
 * array: that dedupes, drops anything unknown (a value from a build that offered
 * a fourth lead), and pins the order in one place.
 */
function parseLeads(raw: unknown): readonly ReminderLead[] {
  if (!Array.isArray(raw)) return [30];
  return REMINDER_LEAD_OPTIONS.filter((lead) => raw.includes(lead));
}

function sameLeads(a: readonly ReminderLead[], b: readonly ReminderLead[]): boolean {
  return a.length === b.length && a.every((lead, i) => lead === b[i]);
}

/**
 * ⚠ A row missing any REQUIRED string is dropped whole, never patched: a saved
 * story with no publisher would print an unattributed headline (the one thing
 * the aggregation rules forbid), and one with no date has no honest age.
 * Deduped by `url` — the key — and capped, first (newest) wins.
 */
function parseSavedStories(raw: unknown): readonly SavedStory[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const stories: SavedStory[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const story = entry as Partial<SavedStory>;
    if (typeof story.url !== 'string' || story.url === '') continue;
    if (typeof story.title !== 'string' || story.title === '') continue;
    if (typeof story.publisher !== 'string' || story.publisher === '') continue;
    if (typeof story.publishedAt !== 'string' || story.publishedAt === '') continue;
    if (seen.has(story.url)) continue;
    seen.add(story.url);
    stories.push({
      url: story.url,
      title: story.title,
      publisher: story.publisher,
      isFirstParty: story.isFirstParty === true,
      imageUrl: typeof story.imageUrl === 'string' ? story.imageUrl : null,
      publishedAt: story.publishedAt,
      topic: typeof story.topic === 'string' ? story.topic : null,
      excerpt: typeof story.excerpt === 'string' ? story.excerpt : null,
      author: typeof story.author === 'string' ? story.author : null,
      savedAt: typeof story.savedAt === 'string' ? story.savedAt : story.publishedAt,
    });
    if (stories.length >= SAVED_STORY_CAP) break;
  }
  return stories;
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
    a.alertGoals === b.alertGoals &&
    sameLeads(a.reminderLeads, b.reminderLeads) &&
    a.newsSeenAt === b.newsSeenAt &&
    a.followed.length === b.followed.length &&
    a.followed.every((slug, i) => slug === b.followed[i]) &&
    // `url` alone: the writers only ever add or remove whole rows, so a list
    // with the same urls in the same order is the same list.
    a.savedStories.length === b.savedStories.length &&
    a.savedStories.every((story, i) => story.url === b.savedStories[i].url)
  );
}

function commit(next: Preferences) {
  const changed = !same(snapshot, next);
  // The identity is only replaced when something actually moved:
  // `useSyncExternalStore` compares snapshots with `Object.is`, so handing it an
  // equal-but-new object schedules a render whether anything was emitted or not.
  if (changed) snapshot = next;

  // ⚠⚠ NEVER persist before hydration (trap 61). In production nothing can get
  // here un-hydrated — the root layout holds the tree until `hydratePreferences`
  // resolves — but a dev FAST REFRESH of THIS FILE resets `snapshot` to
  // `DEFAULTS` and `hydrated` to false while the layout's `ready` stays true and
  // never re-hydrates. The next writer (the News screen's mount stamp, on
  // 2026-09-06) then serialised DEFAULTS over the stored payload: follows,
  // onboarding and saved stories, gone. In memory the write still holds — only
  // the flush waits for a real hydrate.
  if (hydrated) {
    // ⚠ The write happens even when nothing changed. Persisting an unchanged
    // value is what makes an explicit timezone pick that matches the detected
    // one stick: without it nothing is stored, and the next launch re-detects
    // over the user's choice.
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // Storage full or unavailable. The value still holds for this session.
    });
  }

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

/** The reader opened the News screen — everything filed before `iso` is seen. */
export function setNewsSeenAt(iso: string) {
  update({ newsSeenAt: iso });
}

/**
 * Save a story, or un-save it if its `url` is already held (ADR 0129).
 * Prepends — the Saved screen reads newest-saved-first — and enforces the cap
 * by dropping the OLDEST save, never refusing the new one.
 */
export function toggleSavedStory(story: SavedStory) {
  const held = snapshot.savedStories.some((entry) => entry.url === story.url);
  const next = held
    ? snapshot.savedStories.filter((entry) => entry.url !== story.url)
    : [story, ...snapshot.savedStories].slice(0, SAVED_STORY_CAP);
  update({ savedStories: next });
}

export function removeSavedStory(url: string) {
  if (!snapshot.savedStories.some((entry) => entry.url === url)) return;
  update({ savedStories: snapshot.savedStories.filter((entry) => entry.url !== url) });
}

/**
 * The master switch for a whole alert type.
 *
 * ⚠ `alertReminder` is COUPLED to `reminderLeads` (ADR 0040): switching it on
 * while the lead list is empty restores the 30-minute default, because an alert
 * type that is on and delivers nothing is worse than one that is off. Every
 * other key is a plain write.
 */
export function setAlert(
  key: 'alertReminder' | 'alertMoved' | 'alertPostponed' | 'alertGoals',
  value: boolean,
) {
  if (key === 'alertReminder' && value && snapshot.reminderLeads.length === 0) {
    update({ alertReminder: true, reminderLeads: [30] });
    return;
  }
  update({ [key]: value });
}

/**
 * Turn one lead time on or off.
 *
 * ⚠ Turning off the LAST lead turns the master off too, rather than leaving a
 * green switch above three empty ones. Turning one on turns the master on, which
 * the account sheet cannot reach today (the rows are disabled while the master is
 * off) but which keeps the store honest on its own.
 */
export function setReminderLead(lead: ReminderLead, on: boolean) {
  const next = on
    ? REMINDER_LEAD_OPTIONS.filter(
        (option) => option === lead || snapshot.reminderLeads.includes(option),
      )
    : snapshot.reminderLeads.filter((option) => option !== lead);

  if (sameLeads(next, snapshot.reminderLeads)) return;
  update({ reminderLeads: next, alertReminder: next.length > 0 });
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
