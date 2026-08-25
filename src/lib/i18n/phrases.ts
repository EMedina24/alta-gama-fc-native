/**
 * The half of the copy that cannot be a plain string: counted phrases, and the
 * pinned calendar tables.
 *
 * ⚠ PORTED FROM `cronogol/lib/i18n/phrases/{es,en}.ts` (ADR 0018), trimmed to
 * what this app renders. The web app's reason for the split was the RSC
 * serialization boundary, which does not exist here — but the two *other*
 * reasons do, and they are why this file still exists:
 *
 * 1. **Counted phrases.** Spanish makes the wording depend on the number in ways
 *    a template cannot: "partido" is masculine and "jornada" feminine, so
 *    anything agreeing with either has to be written out.
 *
 *    ⚠ Every function annotates `: string` explicitly. Without it TypeScript
 *    infers the *Spanish wording* as the return type, and `Phrases` would then
 *    demand English return `"jornada" | "jornadas"` too. The annotation is what
 *    makes the shape shared rather than the words.
 *
 * 2. **The calendar tables are pinned, not read from `Intl`.** CLDR versions
 *    disagree about Spanish abbreviations — current data emits `sept`, older
 *    builds `sept.`. Nineteen tokens fixed by the RAE will not improve with a
 *    future ICU release, and on a phone the ICU build is the OS's, not ours.
 */

export const es = {
  /** Keyed by the stable `en-US` short weekday — see `format.ts`. */
  weekdays: {
    Sun: 'dom', Mon: 'lun', Tue: 'mar', Wed: 'mié',
    Thu: 'jue', Fri: 'vie', Sat: 'sáb',
  } as Record<string, string>,

  /** January first. `sep` over `sept` keeps the date block to ten characters. */
  months: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],

  /** The `Intl` locale for anything not pinned above — clocks, long dates. */
  intl: 'es-ES',

  /** Home/away tag. ⚠ `L`/`V` in Spanish (local/visitante), not `H`/`A`. */
  home: 'L',
  away: 'V',

  /** Form chip letters. ⚠ Spanish is V/E/D — `D` is *Derrota*, a LOSS. */
  formLetters: { W: 'V', D: 'E', L: 'D' } as Record<'W' | 'D' | 'L', string>,

  matches: (n: number): string => `${n} ${n === 1 ? 'partido' : 'partidos'}`,
  clubs: (n: number): string => `${n} ${n === 1 ? 'club' : 'clubes'}`,
  players: (n: number): string => `${n} ${n === 1 ? 'jugador' : 'jugadores'}`,
  matchdays: (n: number): string => `${n} ${n === 1 ? 'jornada' : 'jornadas'}`,

  justNow: 'ahora mismo',
  kickoffTbd: 'hora de inicio por confirmar',
};

export const en: Phrases = {
  weekdays: {
    Sun: 'SUN', Mon: 'MON', Tue: 'TUE', Wed: 'WED',
    Thu: 'THU', Fri: 'FRI', Sat: 'SAT',
  },

  months: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],

  intl: 'en-GB',

  home: 'H',
  away: 'A',

  formLetters: { W: 'W', D: 'D', L: 'L' },

  matches: (n: number): string => `${n} ${n === 1 ? 'match' : 'matches'}`,
  clubs: (n: number): string => `${n} ${n === 1 ? 'club' : 'clubs'}`,
  players: (n: number): string => `${n} ${n === 1 ? 'player' : 'players'}`,
  matchdays: (n: number): string => `${n} ${n === 1 ? 'matchday' : 'matchdays'}`,

  justNow: 'just now',
  kickoffTbd: 'kickoff time to be confirmed',
};

/** Spanish is the shape-defining locale: Spain is the primary market. */
export type Phrases = typeof es;

export const PHRASES: Record<Locale, Phrases> = { es, en };

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
