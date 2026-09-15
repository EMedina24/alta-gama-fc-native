/**
 * The Board's background choice (ADR 0175) — the grammar the preference
 * travels in, and nothing else.
 *
 * One scalar string, `'default' | 'league:{slug}' | 'club:{slug}'` — a scalar
 * because `preferences.ts`'s `same()` covers scalars by walking keys, where an
 * object field would compare by reference and re-ship the ADR 0166 bug.
 *
 * ⚠ The league half holds our ROUTE slug (`la-liga`), `leagueSlug`'s own
 * convention: `LeagueMenu` and the picker speak it, and the one conversion to
 * `apiSlug` stays at the tint site (`findLeague(slug)?.apiSlug`).
 *
 * ⚠ A club slug is validated SYNTACTICALLY only — the club catalogue is remote
 * and `parse()` must stay pure and synchronous. A slug the catalogue no longer
 * answers renders as the brand default at the screen, which NEVER rewrites the
 * stored value: a transient network failure must not destroy the pick.
 *
 * ⚠ Pure, no native import — `board-layout.ts`'s contract, for the same
 * reason: the parse rule is provable in `scripts/preferences-harness.mjs`.
 */
import { findLeague } from '@/lib/cronogol/leagues';

export type BoardBackgroundChoice =
  | { kind: 'default' }
  | { kind: 'league'; slug: string }
  | { kind: 'club'; slug: string };

export const DEFAULT_BOARD_BG = 'default';

/** What every stored club slug must look like — the API's own slug shape. */
const CLUB_SLUG = /^[a-z0-9-]+$/;

export function encodeBoardBackground(choice: BoardBackgroundChoice): string {
  if (choice.kind === 'default') return DEFAULT_BOARD_BG;
  return `${choice.kind}:${choice.slug}`;
}

/**
 * The stored string, read back out. Never throws: an unrecognised value is the
 * default, which is also what `parseBoardBackground` guarantees can't be
 * stored — this is belt and braces for a value that skipped the store.
 */
export function decodeBoardBackground(value: string): BoardBackgroundChoice {
  if (value.startsWith('league:')) {
    const slug = value.slice('league:'.length);
    return findLeague(slug) ? { kind: 'league', slug } : { kind: 'default' };
  }
  if (value.startsWith('club:')) {
    const slug = value.slice('club:'.length);
    return CLUB_SLUG.test(slug) ? { kind: 'club', slug } : { kind: 'default' };
  }
  return { kind: 'default' };
}

/**
 * A stored background pick, or the default — `preferences.parse()`'s branch.
 * Absent means "the brand default", which every payload before v8 is.
 *
 * ⚠ A league pick is validated against the CATALOGUE, `parseLeagueSlug`'s own
 * rule: a slug from a build that shipped a league we have since dropped must
 * not leave the board asking for a crown that no longer exists.
 */
export function parseBoardBackground(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_BOARD_BG;
  const choice = decodeBoardBackground(raw);
  return encodeBoardBackground(choice);
}
