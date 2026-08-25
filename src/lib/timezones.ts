/**
 * Timezones — the six quick picks, and the abbreviation logic behind them.
 *
 * ⚠ PORTED FROM `cronogol/lib/timezones.ts` (ADR 0018). Three changes:
 * `Timezone.city` is a per-locale record (the web app is Spanish-only);
 * `timezoneLabel`/`zoneLabel` therefore take a `Locale`; and `browserTimeZone`
 * became `deviceTimeZone`, reading `expo-localization` first so it answers the
 * user's chosen region rather than whatever `Intl` was built against.
 *
 * Everything else — the hand-carried `abbr` pairs, the `en-US`-as-arithmetic
 * rule, the southern-hemisphere-safe `isDaylight`, and `null` meaning "follow
 * the device" — is unchanged and load-bearing.
 */

import { getCalendars } from 'expo-localization';

import type { Locale } from './i18n/phrases';

/**
 * The design ships a fixed six-option picker with hard-coded UTC offsets. Those
 * become real IANA zones here, so DST is handled rather than baked in — the
 * prototype's `(zone.off - 2)` arithmetic is silently wrong twice a year.
 */

export interface Timezone {
  /**
   * ⚠ Valor de protocolo — no traducir. Persisted verbatim as `tz` inside
   * `cronogol:preferences`, and resolved by `findTimezone`, which falls back to
   * Madrid on a miss — so renaming one of these does not fail, it silently
   * moves every existing user to Madrid. Narrowed to the six literals so a
   * translation is a build error instead.
   */
  id: "madrid" | "london" | "newyork" | "saopaulo" | "mumbai" | "tokyo";
  /**
   * The place, as the design words it. The one translatable field here — hence
   * a per-locale record rather than a bare string, which is the only structural
   * change from the web app's version of this file.
   */
  city: Record<Locale, string>;
  zone: string;
  /**
   * ⚠ Valor de protocolo — no traducir. International codes, identical in
   * Spanish.
   *
   * `[standard, daylight]`. Carried rather than read from Intl because CLDR
   * emits no usable abbreviation for half of these — `en-GB` renders New York
   * as "GMT-4" and `en-US` renders Madrid as "GMT+2", and neither knows BRT,
   * IST or JST at all. Which of the pair applies is still resolved from the
   * actual instant, so this stays right across a DST switch.
   */
  abbr: readonly [string, string];
}

export const TIMEZONES: readonly Timezone[] = [
  { id: "madrid", city: { es: "Madrid · Berlín", en: "Madrid · Berlin" }, zone: "Europe/Madrid", abbr: ["CET", "CEST"] },
  { id: "london", city: { es: "Londres", en: "London" }, zone: "Europe/London", abbr: ["GMT", "BST"] },
  { id: "newyork", city: { es: "Nueva York", en: "New York" }, zone: "America/New_York", abbr: ["EST", "EDT"] },
  // Brazil abolished DST in 2019; both halves of the pair are the same.
  { id: "saopaulo", city: { es: "São Paulo", en: "São Paulo" }, zone: "America/Sao_Paulo", abbr: ["BRT", "BRT"] },
  { id: "mumbai", city: { es: "Mumbai", en: "Mumbai" }, zone: "Asia/Kolkata", abbr: ["IST", "IST"] },
  { id: "tokyo", city: { es: "Tokio", en: "Tokyo" }, zone: "Asia/Tokyo", abbr: ["JST", "JST"] },
];

/** LaLiga's audience is mostly Europe/Madrid, so that is the server default. */
export const DEFAULT_TIMEZONE = TIMEZONES[0];

export function findTimezone(id: string | null | undefined): Timezone {
  return TIMEZONES.find((tz) => tz.id === id) ?? DEFAULT_TIMEZONE;
}

/** The listed zone with this IANA name, if the six happen to cover it. */
export function presetForZone(zone: string): Timezone | undefined {
  return TIMEZONES.find((tz) => tz.zone === zone);
}

/**
 * **The zone everything on screen is rendered in.**
 *
 * ⚠ `null` is not "unset, use the default" — it means **follow the device**,
 * and it is the normal state. The six above are a shortlist of quick picks, not
 * the set of zones this app can display: before this existed, `detectTimezone`
 * matched the device against those six and silently answered Madrid for
 * everywhere else, so a reader in Chicago was shown Madrid kickoffs with nothing
 * on screen saying so.
 *
 * A stored id still wins, because it is an explicit choice. Madrid remains the
 * last resort — for a runtime with no `Intl`, and for the server, which has no
 * browser to ask.
 */
export function effectiveZone(id: string | null | undefined): string {
  if (id) return findTimezone(id).zone;
  return deviceTimeZone() ?? DEFAULT_TIMEZONE.zone;
}

/** "America/Argentina/Buenos_Aires" → "Buenos Aires". */
export function zoneCity(zone: string): string {
  const segment = zone.slice(zone.lastIndexOf("/") + 1);
  return segment.replace(/_/g, " ");
}

/**
 * `Intl` objects are not free to build and `zoneAbbreviation` runs once per
 * jornada render, so each zone/style pair is made once and kept. The same reason
 * `relative()` in `lib/format.ts` keeps its own.
 */
const abbrFormatters = new Map<string, Intl.DateTimeFormat>();

function timeZoneName(
  zone: string,
  style: "short" | "shortOffset",
  at: Date,
): string | undefined {
  const key = `${zone}|${style}`;
  let found = abbrFormatters.get(key);
  if (!found) {
    // ⚠ `en-US` is protocol here, not display — these are international codes,
    // identical in Spanish, exactly like the hand-carried `abbr` pairs above. A
    // locale pass must not touch it.
    found = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: style });
    abbrFormatters.set(key, found);
  }
  return found.formatToParts(at).find((part) => part.type === "timeZoneName")?.value;
}

/** A real abbreviation looks like a word. "GMT+5:30" does not. */
const ABBR_WORD = /^[A-Z]{2,5}$/;

/**
 * The best abbreviation the platform can give for a zone we carry no pair for.
 *
 * ⚠ **`short` is tried first and accepted only when it comes back as a word.**
 * CLDR emits a genuine abbreviation for US and UK zones ("CDT", "CST", "GMT")
 * and an offset string for everywhere else ("GMT+10", "GMT+5:30") — the regex is
 * what tells those apart. When it is an offset we take `shortOffset` instead,
 * which is the same string by a route that is documented to produce it.
 *
 * This is not good enough for the six: `short` renders Europe/Madrid as "GMT+2",
 * not "CEST", which is why `Timezone.abbr` is hand-carried and stays that way.
 */
function derivedAbbreviation(zone: string, at: Date): string {
  try {
    const short = timeZoneName(zone, "short", at);
    if (short && ABBR_WORD.test(short)) return short;
    return timeZoneName(zone, "shortOffset", at) ?? "UTC";
  } catch {
    return "UTC";
  }
}

/** Minutes east of UTC for a zone at a given instant. */
function offsetMinutes(zone: string, at: Date): number {
  // ⚠ `en-US` here is arithmetic, not display. Nothing this formatter emits
  // reaches the screen — every part is read back through `Number()` below, so
  // the only requirement is ASCII digits. A locale numbering system that emits
  // anything else turns every `get()` into NaN and DST detection collapses
  // silently. Do not "translate" this during a locale pass.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const local = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    // Some runtimes render midnight as hour 24 even under hour12: false.
    get("hour") % 24,
    get("minute"),
    get("second"),
  );

  return (local - Math.floor(at.getTime() / 1000) * 1000) / 60_000;
}

/**
 * Whether the zone is on daylight time at that instant, decided by comparing
 * its offset with its own smallest offset that year. That works for southern
 * hemisphere zones too, where daylight time straddles January.
 */
function isDaylight(zone: string, at: Date): boolean {
  const year = at.getUTCFullYear();
  const january = offsetMinutes(zone, new Date(Date.UTC(year, 0, 1)));
  const july = offsetMinutes(zone, new Date(Date.UTC(year, 6, 1)));
  return offsetMinutes(zone, at) > Math.min(january, july);
}

/**
 * "CEST" in August, "CET" in December.
 *
 * Takes either a listed zone or a bare IANA name, because the reader's zone is
 * now a string that may not be one of the six. A name that happens to be listed
 * still gets the curated pair — `Europe/Madrid` must read "CEST", and the
 * platform says "GMT+2".
 */
export function zoneAbbreviation(
  tz: Timezone | string,
  at: Date = new Date(),
): string {
  if (typeof tz !== "string") {
    return isDaylight(tz.zone, at) ? tz.abbr[1] : tz.abbr[0];
  }
  const preset = presetForZone(tz);
  if (preset) return isDaylight(preset.zone, at) ? preset.abbr[1] : preset.abbr[0];
  return derivedAbbreviation(tz, at);
}

/** "Madrid · Berlín (CEST)" — the picker's option text for one of the six. */
export function timezoneLabel(tz: Timezone, locale: Locale, at: Date = new Date()): string {
  return `${tz.city[locale]} (${zoneAbbreviation(tz, at)})`;
}

/**
 * "Nueva York (EDT)" for a listed zone, "Chicago (CDT)" for anywhere else — how
 * the picker names the reader's own zone.
 *
 * Prefers the listed entry when there is one so the auto option and the quick
 * pick below it agree: the derived city is the IANA exonym ("New York"), and
 * two spellings of one place in one dropdown reads as two places.
 */
export function zoneLabel(zone: string, locale: Locale, at: Date = new Date()): string {
  const preset = presetForZone(zone);
  if (preset) return timezoneLabel(preset, locale, at);
  return `${zoneCity(zone)} (${derivedAbbreviation(zone, at)})`;
}

/**
 * The device's IANA zone, or nothing — the real one, not a member of the six.
 *
 * What `PATCH /cronogol/me` sends, and now also what `effectiveZone` renders
 * with. Those two agreeing is new: this used to feed the backend only, while a
 * `detectTimezone()` that matched against the six drove the screen. A Lisbon
 * reader therefore got `.ics` events at the right time and a website timed in
 * Madrid, and nothing anywhere said so.
 *
 * `Intl`'s own output is what the backend validates against, and it always
 * passes. Undefined omits the key; sending an explicit null is a 400.
 */
export function deviceTimeZone(): string | undefined {
  try {
    // expo-localization reads the OS region setting, which is the user's actual
    // answer. `Intl` reports whatever the JS engine was built against and can
    // disagree on a device whose region was changed after launch.
    const fromDevice = getCalendars()[0]?.timeZone;
    if (fromDevice) return fromDevice;
  } catch {
    // Fall through to Intl.
  }
  if (typeof Intl === 'undefined') return undefined;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}
