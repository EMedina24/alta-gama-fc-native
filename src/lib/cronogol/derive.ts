/**
 * Pure derivations over the wire types.
 *
 * ⚠ PORTED VERBATIM FROM `cronogol/lib/cronogol/derive.ts` (ADR 0018). It had no
 * framework dependency to strip — one type import and pure functions. Keep the
 * path mirrored so upstream fixes stay a one-line diff, and keep the comments:
 * `CLUB_CODES`, the `crestSrc` key order and `nextUpIndex`'s status test each
 * exist because the obvious implementation was tried first and was wrong.
 */
import type { FixtureView, ImageUrls, TeamView } from "./types";

/**
 * Everything the design needs that the API does not return.
 *
 * Verified against production 2026-07-29, after the asset sync: `shortName`,
 * `logoUrls`, `colorPrimary` and `venue.name` are now populated on all 20
 * LaLiga clubs. `venue.city` is still null on every one of them, and
 * `shortName`/`logoUrls` are still null on the 176 opponent-only clubs — so the
 * fallbacks below all still earn their place.
 */

/**
 * The real three-letter codes for the clubs the backend actually serves.
 *
 * The API supplies `shortName` for tracked clubs now, so this is the second
 * choice rather than the only one — but 164 of the 218 clubs reachable with
 * `includeUntracked=true` still return null, and deriving from the name alone
 * collides (Valencia/Valladolid both want VAL; Real Madrid/Atletico Madrid both
 * want MAD once "Real"/"Atletico" are filtered as noise). A grid with two
 * identical monograms reads as a bug, so the table stays.
 */
/** ⚠ Keyed by API slug — no traducir. The three-letter codes are identifiers. */
const CLUB_CODES: Record<string, string> = {
  alaves: "ALA",
  "athletic-club": "ATH",
  "atletico-madrid": "ATM",
  barcelona: "BAR",
  "celta-vigo": "CEL",
  espanyol: "ESP",
  getafe: "GET",
  girona: "GIR",
  "las-palmas": "LPA",
  leganes: "LEG",
  mallorca: "MLL",
  osasuna: "OSA",
  "rayo-vallecano": "RAY",
  "real-betis": "BET",
  "real-madrid": "RMA",
  "real-sociedad": "RSO",
  sevilla: "SEV",
  valencia: "VAL",
  valladolid: "VLL",
  villarreal: "VIL",
};

/** Club-type tokens that should never win the monogram. */
const NOISE = new Set([
  "fc",
  "cf",
  "cd",
  "ca",
  "ud",
  "rc",
  "rcd",
  "sd",
  "ac",
  "sc",
  "afc",
  "sad",
  "de",
  "del",
  "club",
]);

function deriveAbbreviation(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  const meaningful = words.filter((word) => !NOISE.has(word.toLowerCase()));
  const source = meaningful.length > 0 ? meaningful : words;

  // Three or more words: initials. Two: first letter, then two from the second
  // (Real Madrid → RMA). One: the first three letters.
  if (source.length >= 3) {
    return source
      .slice(0, 3)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }
  if (source.length === 2) {
    return (source[0][0] + source[1].slice(0, 2)).toUpperCase();
  }
  return (source[0] ?? "?").slice(0, 3).toUpperCase();
}

/**
 * A club's three-letter code, for the monogram that stands in when there is no
 * crest to render. Prefers the API's own `shortName` and falls back to the
 * table above, then to the club's name.
 */
export function abbreviate(
  name: string,
  slug?: string,
  shortName?: string | null,
): string {
  if (shortName) return shortName;
  if (slug && CLUB_CODES[slug]) return CLUB_CODES[slug];
  return deriveAbbreviation(name);
}

/**
 * ⚠ Valores de protocolo — no traducir. Keys into the API's crest object.
 *
 * `logoUrls` keys are **per-league vocabulary**, not a shared scale. LaLiga
 * clubs carry `xsmall`/`small`/`medium` (plus `large`/`xlarge`, hot-linked from
 * the provider and bigger than any slot we render). Premier League clubs carry
 * pixel widths — `20`/`25`/`50`/`70`/`100` — and an `svg`. Bundesliga clubs
 * carry **`svg` and nothing else** — verified against production 2026-08-07,
 * all 18 — so every size below resolves to the same vector for them, which is
 * why `svg` sits second in each list rather than last.
 *
 * ⚠⚠ **Serie A keys this map by THEME, not by size:** `teamLogo` and
 * `teamLogoLight`, verified 2026-08-08 across all 20. That breaks the
 * assumption the other three leagues taught — a chain walking size names
 * matches nothing for an Italian club and falls through to `logoUrl`, which
 * works but bypasses the mirrored asset. `teamLogo` is therefore named
 * explicitly in every list below.
 *
 * ⚠ `teamLogoLight` is deliberately **absent** from every list, even though the
 * name reads like the dark-surface variant this app would want. On 17 of the 20
 * clubs it is the byte-identical URL, so it buys nothing; on the other three it
 * is genuinely different artwork, so preferring it would light three clubs
 * differently from the seventeen beside them in the same crest row. An
 * inconsistent row is worse than a uniformly standard one. If a real
 * light-on-dark treatment is ever wanted it needs the whole set, not three.
 *
 * ⚠ Do not "fix" a size lookup by assuming a raster key exists. A German club
 * asked for `medium` would fall all the way through to `logoUrl` if `svg` were
 * demoted, and `logoUrl` is the provider's own file for opponent-only clubs.
 *
 * So this is a preference order across all four vocabularies rather than one
 * league's sizes, and `CrestSize` stays the *semantic* ask.
 */
const CREST_KEYS = {
  /** Row crests, the fixture pair, tiles — 40–76px slots. */
  xsmall: ["xsmall", "svg", "50", "70", "100", "small", "medium", "25", "20", "teamLogo"],
  small: ["small", "svg", "70", "100", "50", "medium", "xsmall", "25", "20", "teamLogo"],
  /** The 156px club header. */
  medium: ["medium", "svg", "100", "70", "small", "50", "xsmall", "25", "20", "teamLogo"],
  /**
   * The Starting XI card's 96px crest — the one ask that must NOT return an
   * SVG, because this crest is also drawn onto the export canvas and the PL
   * crests' SVGs carry only a `viewBox`: an image like that can decode and
   * still report no intrinsic size, which Firefox's `drawImage` renders as
   * nothing at all. Rasters first at every weight instead; `svg` is absent
   * from this list on purpose, not by oversight.
   */
  card: ["medium", "100", "large", "small", "70", "xsmall", "50", "25", "20", "teamLogo"],
} as const satisfies Record<string, readonly string[]>;

export type CrestSize = keyof typeof CREST_KEYS;

/**
 * The crest URL to render at a given size, or null when there is none.
 *
 * Always resolved by key. The keys `logoUrls` carries vary per club — several
 * LaLiga clubs add an `hl` the API doc does not list — and they are not ordered
 * by weight, so anything that indexes by position picks a different size per
 * club and occasionally a 249 KB file for a 52px box.
 *
 * **`svg` outranks every raster for a club that has one.** All 20 PL clubs do,
 * and all 18 Bundesliga clubs have nothing else; it is on our own asset host,
 * and one vector serves the 24px account monogram and the 156px club header
 * without either being the wrong file. Rendered through a plain `<img src>`,
 * which does not execute script in an SVG.
 *
 * `logoUrl` is the last resort rather than the first: it is all the
 * opponent-only clubs have, and it is still hot-linked from the provider for
 * them.
 */
export function crestSrc(
  urls: ImageUrls | null,
  logoUrl: string | null,
  want: CrestSize,
): string | null {
  if (urls) {
    for (const key of CREST_KEYS[want]) {
      const url = urls[key];
      if (url) return url;
    }
  }
  return logoUrl ?? null;
}

/**
 * Order the catalogue the way a reader looks a club up.
 *
 * The API sorts by its display name, which since 2026-07-29 carries the legal
 * prefix — so its order files Osasuna under "CA", Barcelona under "FC",
 * Espanyol under "RCD" and Las Palmas under "UD". Sorting on the name with
 * those tokens dropped puts every club back under the letter someone would
 * actually look for.
 */
export function sortClubs<T extends { name: string }>(teams: readonly T[]): T[] {
  const key = (name: string) => {
    const words = name.split(/\s+/).filter(Boolean);
    // Only leading club-type tokens are noise here. "Athletic Club" must keep
    // its second word, or it sorts as an empty string.
    let start = 0;
    while (start < words.length - 1 && NOISE.has(words[start].toLowerCase())) {
      start += 1;
    }
    return words.slice(start).join(" ");
  };

  return [...teams].sort((a, b) =>
    key(a.name).localeCompare(key(b.name), "es"),
  );
}

/**
 * A club's name with its leading and trailing club-type tokens dropped, for
 * places the design needs a short name: "FC Barcelona" → "Barcelona",
 * "Villarreal CF" → "Villarreal", "RC Deportivo" → "Deportivo".
 *
 * ⚠ NOT in the web app — added here because the native table gives a club name
 * ~150pt and the API's `name` has carried the legal prefix since 2026-07-29, so
 * "RCD Espanyol de Barcelona" ellipsises to "RCD Espanyol de Ba…". The design
 * mock shows short names throughout.
 *
 * ⚠ **Display only. Never a key, never persisted, never sent to the API.** Two
 * clubs can share a shortened name (both Madrids shorten to "Madrid" only if
 * "Real"/"Atlético" were noise, which they are not — but the risk is the point).
 * `slug` is the identifier, always.
 *
 * ⚠ Never strips every word: a name that is entirely club-type tokens keeps the
 * original, so nothing can render as an empty string.
 */
export function displayName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  let start = 0;
  let end = words.length;
  while (start < end - 1 && NOISE.has(words[start].toLowerCase())) start += 1;
  while (end - 1 > start && NOISE.has(words[end - 1].toLowerCase())) end -= 1;
  const kept = words.slice(start, end);
  return kept.length > 0 ? kept.join(" ") : name;
}

export interface HomeGround {
  venue: string | null;
  city: string | null;
}

/**
 * A club's stadium and city.
 *
 * The ground comes from `team.venue`, which is the club's actual home. Reading
 * it off the first `homeAway: 'H'` fixture was the only way before and is close
 * but not the same thing: that string is where *that match* is played, so it
 * differs for a ground-share, a temporary move, or a neutral-venue "home" tie.
 * Valladolid is the live example — its first home fixture is at Son Moix.
 *
 * The city still comes off the fixtures. `venue.city` exists on the DTO but is
 * null on all 20 tracked clubs, so trusting it would empty the club header.
 */
export function homeGround(
  team: TeamView,
  fixtures: readonly FixtureView[],
): HomeGround {
  const home = fixtures.find(
    (fixture) => fixture.homeAway === "H" && fixture.venue,
  );
  return {
    venue: team.venue?.name ?? home?.venue ?? null,
    city: team.venue?.city ?? home?.venueCity ?? null,
  };
}

/**
 * The competition a club actually plays in — `"LALIGA EA SPORTS"` or
 * `"LALIGA HYPERMOTION"`. There is nothing on `TeamView` that says, and five of
 * the twenty tracked clubs were relegated, so assuming the top flight labels a
 * quarter of the catalogue wrongly.
 *
 * Takes the most common name among `competition: "league"` rows rather than
 * simply the first fixture's: cup and European rows start appearing during the
 * season, and the earliest fixture will not always be a league one.
 */
export function primaryCompetition(
  fixtures: readonly FixtureView[],
): string | null {
  const counts = new Map<string, number>();

  for (const fixture of fixtures) {
    if (fixture.competition !== "league" || !fixture.competitionName) continue;
    counts.set(
      fixture.competitionName,
      (counts.get(fixture.competitionName) ?? 0) + 1,
    );
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }

  // A club with no league fixtures at all still deserves a label.
  return best ?? fixtures.find((f) => f.competitionName)?.competitionName ?? null;
}

/**
 * "Jornada 12" → 12, "Regular Season - 5" → 5. Null when the round carries no
 * number (cup rounds like "Round of 16") or is absent entirely.
 */
export function matchday(round: string | null): number | null {
  if (!round) return null;
  const match = round.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

/**
 * Index of the fixture to badge "Next up", or -1.
 *
 * Driven off `status`, deliberately not off `kickoffUtc > now`: the API tier
 * has shipped a past season before, and hard-coding a clock comparison renders
 * an empty app when it does.
 */
export function nextUpIndex(fixtures: readonly FixtureView[]): number {
  return fixtures.findIndex(
    (fixture) => fixture.status === "scheduled" || fixture.status === "live",
  );
}

/** Fixtures that can still be added to a calendar. */
export function isAddable(fixture: FixtureView): boolean {
  return fixture.status !== "cancelled";
}

/**
 * `lastSyncedAt === null` means only the matches where this club happened to
 * face a registered team were ever fetched. Showing those six games as though
 * they were a season is the single easiest way to ship a convincing-looking bug.
 */
export function hasCompleteSchedule(team: TeamView): boolean {
  return team.lastSyncedAt !== null;
}

/**
 * W / D / L from the requested team's perspective. Null unless finished.
 *
 * ⚠ Valores de protocolo — no traducir, and read this before adding a caller:
 * `D` here is *Draw*. The Spanish convention is V / E / D, where `D` is
 * *Derrota* — the exact opposite. So these letters stay English as a
 * discriminant and whoever first renders them maps to V/E/D at the render site.
 * There is no such caller today; grep confirmed this function is unused.
 */
export function outcome(fixture: FixtureView): "W" | "D" | "L" | null {
  if (fixture.status !== "finished") return null;
  const { goalsFor, goalsAgainst } = fixture;
  if (goalsFor === null || goalsAgainst === null) return null;
  if (goalsFor > goalsAgainst) return "W";
  if (goalsFor < goalsAgainst) return "L";
  return "D";
}

