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
import { DEFAULT_BOARD_BG, parseBoardBackground } from '@/lib/board-background';
import {
  DEFAULT_HIDDEN,
  DEFAULT_ORDER,
  normalizeLayout,
  type BoardCardId,
} from '@/lib/board-layout';
import { COMPETITIONS } from '@/lib/cronogol/competitions';
import { DEFAULT_LEAGUE, findLeague } from '@/lib/cronogol/leagues';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/phrases';

const STORAGE_KEY = 'altagama:preferences';

/**
 * Bump when the stored SHAPE changes.
 *
 * ⚠ 2 added `reminderLeads` (ADR 0040); 5 added `savedStories` (ADR 0129);
 * 6 added `leagueSlug` (ADR 0164); 7 added `bdOrder`/`bdHidden` (ADR 0174);
 * 8 added `bdBg` (ADR 0175); 9 added `favourite` (ADR 0209).
 * Bumping is safe precisely because `FOLLOWED_RULE_VERSION` did NOT move —
 * that separation is what stops a shape bump from emptying every reader's
 * follow list.
 */
const SCHEMA_VERSION = 9;

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
  /**
   * The competition the league-scoped tabs are showing — Matchdays, Table and
   * Clubs (ADR 0164).
   *
   * ⚠⚠ **Our route `slug`, not the API's `apiSlug`** — `la-liga`, not `laliga`.
   * It is what `LeagueMenu` speaks on both `active` and `onSelect`, so keeping
   * the store in the menu's own vocabulary leaves exactly ONE place that
   * converts (the `tintLeague` prop, via `findLeague(slug)?.apiSlug`). Storing
   * the API form instead would put that conversion at every read.
   *
   * ⚠ **It became shared BECAUSE the crown is tinted.** While every crown was
   * the same lime, three tabs holding three independent leagues was invisible;
   * tinted, the app changes colour on a tab switch with no cause the reader can
   * see. The shared value is the fix, not a tidy-up.
   *
   * ⚠ **It may hold a slug a given tab cannot show** — the Champions League
   * league phase is pickable on Matchdays and is not a `League` at all (ADR
   * 0150), and Matchdays itself lists only `ROUND_LEAGUES`. Each screen clamps
   * for its own use; this field records the reader's last pick, and clamping is
   * not the store's job.
   */
  leagueSlug: string;
  /**
   * The Board's card order — EVERY catalogue card, hidden ones included (ADR
   * 0174).
   *
   * ⚠⚠ **Hidden cards keep their slot here, and that is the point.** Removing a
   * card and putting it back is meant to return it where it was, not append it
   * to the bottom; an order holding only the visible cards cannot do that.
   *
   * ⚠ Read through `normalizeLayout` on the way in, never used raw: a payload
   * written by an older build is missing whatever cards have shipped since, and
   * one written by a newer build may name a card this one has dropped.
   */
  bdOrder: readonly BoardCardId[];
  /** The cards put away, a subset of `bdOrder` (ADR 0174). */
  bdHidden: readonly BoardCardId[];
  /**
   * The Board's background (ADR 0175): `'default'`, `'league:{slug}'` (our
   * ROUTE slug, `leagueSlug`'s convention) or `'club:{slug}'`.
   *
   * ⚠ A SCALAR string, deliberately — `same()` covers scalars by walking keys,
   * where an object here would compare by reference and re-ship the ADR 0166
   * bug. `lib/board-background.ts` owns the grammar.
   *
   * ⚠ A club pick is validated syntactically only (the catalogue is remote).
   * A slug the catalogue no longer answers renders as the brand default at
   * the screen, which never rewrites this field — a transient network failure
   * must not destroy the pick.
   */
  bdBg: string;
  /**
   * The ONE club the reader calls theirs (ADR 0209) — a slug from `followed`,
   * or `null`. Settings shows it as FAVOURITE CLUB and badges the avatar with
   * its crest.
   *
   * ⚠ **Always a member of `followed`, or null.** `parse` drops a stored
   * favourite that is no longer followed, and the two writers that remove
   * follows (`unfollowClub`, `clearFollows`) clear it in the same write. A
   * favourite nobody follows would be a club the reader gets no alerts for,
   * sitting under a heading that says it is theirs.
   *
   * ⚠ A SCALAR (a slug, not an object) for `same()`'s sake — `bdBg`'s reason.
   *
   * ⚠ Device-only, like every field here: it is NOT sent to the backend, and
   * nothing server-side (alerts, feeds) treats it differently from any other
   * followed club.
   */
  favourite: string | null;
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
  leagueSlug: DEFAULT_LEAGUE.slug,
  bdOrder: DEFAULT_ORDER,
  bdHidden: DEFAULT_HIDDEN,
  bdBg: DEFAULT_BOARD_BG,
  favourite: null,
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
    const layout = normalizeLayout(data.bdOrder, data.bdHidden);
    const followed =
      version >= FOLLOWED_RULE_VERSION && Array.isArray(data.followed)
        ? data.followed.filter((s): s is string => typeof s === 'string')
        : [];
    return {
      v: SCHEMA_VERSION,
      followed,
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
      // Absent on every v1–v5 payload; absent means "the default league".
      leagueSlug: parseLeagueSlug(data.leagueSlug),
      // ⚠ Absent on every v1–v6 payload, and `normalizeLayout` treats absent
      // exactly as it treats a partial order: every missing card is inserted at
      // its default neighbourhood with its default visibility, so a reader who
      // has never edited their board gets the default layout and one who has
      // gets their own, grown to fit this build's catalogue. The two fields are
      // parsed TOGETHER because the hidden set is only meaningful against the
      // order it points into.
      bdOrder: layout.order,
      bdHidden: layout.hidden,
      // Absent on every v1–v7 payload; absent means "the brand default". A
      // league pick is checked against the catalogue (`parseLeagueSlug`'s
      // rule); a club pick only for shape — see the field's docblock.
      bdBg: parseBoardBackground(data.bdBg),
      // Absent on every v1–v8 payload; absent means "none chosen". Checked
      // against the list parsed ABOVE, so a reset `followed` takes it too.
      favourite: parseFavourite(data.favourite, followed),
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * A stored favourite, or `null` (ADR 0209).
 *
 * ⚠ Must be one of `followed` — see the field's docblock. Exported for
 * `scripts/preferences-harness.mjs`, which asserts that rule on its own.
 */
export function parseFavourite(raw: unknown, followed: readonly string[]): string | null {
  return typeof raw === 'string' && followed.includes(raw) ? raw : null;
}

/**
 * A stored league pick, or the default.
 *
 * ⚠ Validated against the CATALOGUE, not merely type-checked: a slug from a
 * build that shipped a league we have since dropped would otherwise persist
 * forever and leave its tab querying a competition that no longer exists.
 *
 * ⚠ `COMPETITIONS` is in the accepted set as well as `LEAGUES`. The Champions
 * League league phase is a legitimate pick on Matchdays and is deliberately not
 * a `League` (ADR 0150), so validating on `findLeague` alone would silently
 * reset a UCL reader to LaLiga on every relaunch.
 */
function parseLeagueSlug(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_LEAGUE.slug;
  if (findLeague(raw)) return raw;
  if (COMPETITIONS.some((competition) => competition.slug === raw)) return raw;
  return DEFAULT_LEAGUE.slug;
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

/**
 * The fields that are NOT plain scalars, and how each is compared. Everything
 * else is compared with `===` by walking the object's own keys.
 *
 * ⚠⚠ **This used to be a hand-written list of every field, and that shipped a
 * bug** (ADR 0166): `leagueSlug` was added to `Preferences` and not to the list,
 * so `same` answered TRUE for a payload where only the league had moved.
 * `commit` then skipped both the snapshot swap and the `emit` — while still
 * persisting the new value — so the league switcher did nothing on screen and
 * the pick only appeared after a relaunch. Silent, and invisible to `tsc`.
 *
 * Walking the keys instead means a new SCALAR field is covered the moment it
 * exists. A new field that needs its own comparison has to be added here, and
 * the `satisfies` below is what makes forgetting a compile error rather than a
 * silent equality.
 */
const DEEP_EQUAL = {
  reminderLeads: sameLeads,
  followed: (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((slug, i) => slug === b[i]),
  // `url` alone: the writers only ever add or remove whole rows, so a list with
  // the same urls in the same order is the same list.
  savedStories: (a: readonly SavedStory[], b: readonly SavedStory[]) =>
    a.length === b.length && a.every((story, i) => story.url === b[i].url),
  // ⚠ Element-wise, like `followed`: ORDER is the whole value of a board layout,
  // so two lists with the same ids rearranged are emphatically not equal.
  bdOrder: (a: readonly BoardCardId[], b: readonly BoardCardId[]) =>
    a.length === b.length && a.every((id, i) => id === b[i]),
  bdHidden: (a: readonly BoardCardId[], b: readonly BoardCardId[]) =>
    a.length === b.length && a.every((id, i) => id === b[i]),
} satisfies { [K in ArrayKeys]: (a: Preferences[K], b: Preferences[K]) => boolean };

/** Every key of `Preferences` whose value is an array — those need `DEEP_EQUAL`. */
type ArrayKeys = {
  [K in keyof Preferences]-?: Preferences[K] extends readonly unknown[] ? K : never;
}[keyof Preferences];

/**
 * Exposed for `scripts/preferences-harness.mjs`, which asserts that a payload
 * differing in ANY single field compares unequal — the shape of the bug ADR 0166
 * fixes. `tameHsl` and `TINT_FALLBACK_ENTRIES` are exported for their harnesses
 * for the same reason: the rule most worth pinning is not always the one with a
 * public caller.
 */
export function samePreferences(a: Preferences, b: Preferences): boolean {
  return same(a, b);
}

function same(a: Preferences, b: Preferences): boolean {
  // ⚠ Both objects' keys, not just `a`'s: a snapshot built before a schema bump
  // can be missing a field the new one has, and walking one side alone would
  // call that equal.
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Preferences>) {
    const compare = (DEEP_EQUAL as Record<string, ((x: unknown, y: unknown) => boolean) | undefined>)[
      key
    ];
    const equal = compare ? compare(a[key], b[key]) : a[key] === b[key];
    if (!equal) return false;
  }
  return true;
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
  update({
    followed: snapshot.followed.filter((entry) => entry !== slug),
    // ⚠ In the SAME write (ADR 0209): a favourite nobody follows is a club the
    // reader gets nothing for, still labelled theirs.
    favourite: snapshot.favourite === slug ? null : snapshot.favourite,
  });
}

/**
 * The reader's own club (ADR 0209), or `null` to clear it.
 *
 * ⚠ A slug that is not followed is refused, not followed on the reader's
 * behalf — choosing a favourite is not consent to alerts. The picker only ever
 * offers followed clubs, so this is the store keeping itself honest.
 */
export function setFavouriteClub(slug: string | null) {
  if (slug !== null && !snapshot.followed.includes(slug)) return;
  update({ favourite: slug });
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

/**
 * The reader picked a competition on Matchdays, Table or Clubs (ADR 0164).
 *
 * ⚠ Takes our route `slug`, exactly as `LeagueMenu.onSelect` hands it over —
 * see the field's docblock for why the store holds that form.
 */
export function setLeagueSlug(slug: string) {
  update({ leagueSlug: slug });
}

/**
 * The Board's layout (ADR 0174).
 *
 * ⚠⚠ **Written on RELEASE, never per swap.** `commit` serialises the WHOLE
 * preferences record — with a full `savedStories` list that is tens of
 * kilobytes — so a drag that crosses four neighbours writing four times is four
 * of those. The reorder is live in the screen's own state while the finger is
 * down; this is called once, when it lifts.
 *
 * ⚠ Normalised on the way in as well as on the way out: the caller is a gesture,
 * and a layout that lost a card to a bug in the drag arithmetic must not be able
 * to persist that loss.
 */
export function setBoardOrder(order: readonly BoardCardId[]) {
  const layout = normalizeLayout(order, snapshot.bdHidden);
  update({ bdOrder: layout.order, bdHidden: layout.hidden });
}

/** The reader removed a card from the board, or added one back from the tray. */
export function setBoardCardHidden(id: BoardCardId, hidden: boolean) {
  const layout = normalizeLayout(
    snapshot.bdOrder,
    hidden
      ? [...snapshot.bdHidden, id]
      : snapshot.bdHidden.filter((entry) => entry !== id),
  );
  update({ bdOrder: layout.order, bdHidden: layout.hidden });
}

/**
 * Back to the order and the hidden set the app ships with. Immediate, no confirm.
 *
 * ⚠ Deliberately does NOT touch `bdBg` (ADR 0175): this button restores the
 * LAYOUT, and the picker's own Default row is the way back for the background.
 */
export function resetBoardLayout() {
  update({ bdOrder: DEFAULT_ORDER, bdHidden: DEFAULT_HIDDEN });
}

/**
 * The edit panel's Reset (ADR 0199): the order, the hidden set AND the
 * background, in one write — the Medina kit's scope. Immediate, no confirm:
 * every piece is one tap to change back.
 *
 * ⚠ `resetBoardLayout` above stays for `_debug/reset-board`, which resets the
 * layout alone.
 */
export function resetBoard() {
  update({ bdOrder: DEFAULT_ORDER, bdHidden: DEFAULT_HIDDEN, bdBg: DEFAULT_BOARD_BG });
}

/**
 * The Board's background pick (ADR 0175). Takes the encoded string —
 * `encodeBoardBackground`'s output — and re-parses it on the way in, so a
 * malformed caller cannot persist a value `parse` would throw away on read.
 */
export function setBoardBackground(bdBg: string) {
  update({ bdBg: parseBoardBackground(bdBg) });
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
  // The favourite goes with the follows — see `favourite`'s docblock.
  update({ followed: [], favourite: null });
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
