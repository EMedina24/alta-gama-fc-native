/**
 * The pure half of the news feed — what the widget selects and how a string
 * off RSS is made safe to print.
 *
 * ⚠ PORTED FROM `cronogol/lib/cronogol/news.ts` (ADR 0061): `plainText` and
 * `articleTopic` verbatim. `NewsScope`, `articleHref`, `articleByline` and the
 * excerpt helper were NOT ported — the widget draws a headline, a publisher and
 * an age, and a helper nothing renders is a helper that drifts.
 *
 * ⚠ No native import, deliberately. This is the module the harness exercises.
 */
import type { NewsArticleView } from './types';

const HTML_TAG = /<[^>]*>/g;
const ENTITY = /&(#\d+|#x[0-9a-f]+|[a-z]+);/gi;
const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Every string off an article passes through here before it is printed.
 *
 * These fields come out of RSS and occasionally carry the publisher's own
 * markup — a headline arrived as `…con el Barça<br>` on 2026-08-01. Stripping
 * a tag and decoding an entity is not EDITING the quote (the handoff's rule):
 * the words are the publisher's, the `<br>` never was.
 */
export function plainText(value: string): string {
  return value
    .replace(HTML_TAG, ' ')
    .replace(ENTITY, (whole, ref: string) => {
      if (ref.startsWith('#x') || ref.startsWith('#X')) {
        return String.fromCodePoint(Number.parseInt(ref.slice(2), 16));
      }
      if (ref.startsWith('#')) {
        return String.fromCodePoint(Number.parseInt(ref.slice(1), 10));
      }
      // An entity we don't know is likelier to be literal text than markup.
      return NAMED[ref.toLowerCase()] ?? whole;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The label above a headline — the publisher's own tag for the story.
 *
 * ⚠ Not a club and not one of our slugs. It is `"Osasuna"` and `"Atlético"`
 * often enough to read as one, but it is also `"Fútbol"` on MARCA's general
 * desk. ⚠ `null`, never `""` and never `—`: the widget draws NO chip for a
 * missing topic, and a dash reads as a value that failed to load.
 */
export function articleTopic(article: NewsArticleView): string | null {
  // ⚠ On a FIRST-PARTY row `categories[0]` is the editorial KIND — `story`,
  // `matchday-briefing` — not a topic (CRONOGOL-API.md). Printing it drew a
  // `STORY` chip on every one of our own pieces (seen 2026-08-29, ADR 0064).
  if (article.publisher.isFirstParty) return null;
  const topic = article.categories[0] ? plainText(article.categories[0]) : '';
  return topic || null;
}

/**
 * How long a headline stays drawable. ⚠ Mirrors `NewsSnapshot.fresh(at:)` in
 * Swift, which applies the same cutoff against the timeline ENTRY's date — so a
 * story that is fresh when written still ages out on the tile without a write.
 */
export const NEWS_FRESH_HOURS = 48;

/**
 * How many items travel in `news.json`.
 *
 * ⚠ Eight, not four. The tile draws four, but the app may not run for a day
 * while the widget keeps rendering — and the extension drops anything older
 * than 48h at each entry, so a file of exactly four decays to three, two, one.
 * Eight is a day of headroom on a feed that files a few stories an hour.
 */
export const NEWS_ITEM_BUDGET = 8;

/**
 * Newest first, inside the freshness window, with anything unprintable dropped.
 *
 * ⚠ An unparseable `publishedAt` is dropped rather than treated as "now" — a
 * story with no honest age would otherwise sit at the top of the tile forever.
 */
export function selectNewsItems(
  articles: readonly NewsArticleView[],
  now: Date,
  budget: number = NEWS_ITEM_BUDGET,
): NewsArticleView[] {
  const cutoff = now.getTime() - NEWS_FRESH_HOURS * 3600 * 1000;

  return articles
    .filter((article) => {
      if (!article.url || !article.title) return false;
      const filed = Date.parse(article.publishedAt);
      if (Number.isNaN(filed)) return false;
      return filed >= cutoff;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, budget);
}

// ---------------------------------------------------------------- app screens (ADR 0064)

/**
 * `12m` / `3h` / `2d` — a headline's age at render time.
 *
 * ⚠ Mirrors the widget's `W.age(from:to:)` in Swift, unit for unit, so the
 * card and the tile never disagree about the same story. Locale-neutral on
 * purpose: `m`/`h`/`d` read the same in both languages and the widget already
 * prints them under a Spanish reader's `NOTICIAS`. Never stored — computed
 * against `now` on every render, or a `3h` is a lie for the next twelve hours.
 */
export function newsAge(filedAt: string, now: Date): string {
  const seconds = Math.max(0, (now.getTime() - Date.parse(filedAt)) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 48 * 3600) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

export interface NewsDayGroup {
  /** `today` / `yesterday` get a word; `date` gets the day formatted. */
  kind: 'today' | 'yesterday' | 'date';
  /** `YYYY-MM-DD` in the reader's zone. */
  dayKey: string;
  items: NewsArticleView[];
}

/**
 * Today / Yesterday / date groups, newest first, in the READER's zone.
 *
 * ⚠ `dayKey(iso)` is injected rather than computed here so this module stays
 * free of `Intl`-dependent code the harness cannot pin — the screen passes
 * `zonedDayKey` from `lib/format.ts`. The handoff's version bucketed on
 * `toISOString().slice(0, 10)`, which is UTC: a story filed at 23:30 Madrid
 * would have sat under TODAY until 02:00 the next day.
 *
 * ⚠ Compute against `now` at RENDER, not at fetch: a list opened at 00:05 must
 * move last night's stories into YESTERDAY without a refetch.
 */
export function groupNewsByDay(
  items: readonly NewsArticleView[],
  now: Date,
  dayKey: (iso: string) => string,
): NewsDayGroup[] {
  const today = dayKey(now.toISOString());
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000).toISOString());
  const buckets = new Map<string, NewsArticleView[]>();

  for (const item of [...items].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  )) {
    const key = dayKey(item.publishedAt);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  return [...buckets.entries()].map(([key, group]) => ({
    kind: key === today ? 'today' : key === yesterday ? 'yesterday' : 'date',
    dayKey: key,
    items: group,
  }));
}

export interface NewsCardPick {
  lead: NewsArticleView | null;
  rows: NewsArticleView[];
  /** Stories filed after the reader last opened News. */
  newCount: number;
}

/**
 * What the Today card shows: the newest story with its picture, two more as
 * single lines, and how many arrived since the reader last opened News.
 *
 * ⚠ THREE, hard. The card is a doorway, not a feed — a fourth row pushes the
 * rest of the round off the first screen, and scores come first on that board.
 *
 * ⚠ `seenAt === null` (never opened News) counts ZERO, not everything. A first
 * run announcing `20 NEW` is noise dressed as a signal.
 */
export function newsCardPick(items: readonly NewsArticleView[], seenAt: string | null): NewsCardPick {
  const fresh = [...items].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const seen = seenAt === null ? Number.NaN : Date.parse(seenAt);
  return {
    lead: fresh[0] ?? null,
    rows: fresh.slice(1, 3),
    newCount: Number.isNaN(seen) ? 0 : fresh.filter((i) => Date.parse(i.publishedAt) > seen).length,
  };
}

export interface NewsFrontPagePick {
  lead: NewsArticleView | null;
  /** Zero, one (rendered full width) or two. */
  tiles: NewsArticleView[];
  rows: NewsArticleView[];
}

/**
 * The shape of the News screen's first day group (ADR 0070): one lead with its
 * picture, up to two tiles, the rest as rows. Items arrive in the group's own
 * order and are NOT re-sorted here — the screen already sorted them newest
 * first through `selectNewsItems`.
 *
 * ⚠ Only the FIRST group on the screen is a front page. Every later day is
 * rows: one front page per screen, or nothing on it leads.
 *
 * ⚠ A quiet league is a real state: two stories are a lead and ONE tile drawn
 * full width, one story is a lead alone. Never pad the tiles from another day.
 */
export function frontPagePick(items: readonly NewsArticleView[]): NewsFrontPagePick {
  return {
    lead: items[0] ?? null,
    tiles: items.slice(1, 3),
    rows: items.slice(3),
  };
}

/**
 * The ONE branch point between our own editorial and aggregated reporting.
 *
 * ⚠ `publisher.isFirstParty`, never the URL's host and never
 * `publisher.id === 'cronogol'` — the registry belongs to the API, exactly as
 * the league list does (CRONOGOL-API.md, "`isFirstParty` decides how you link").
 */
export function isOurs(article: NewsArticleView): boolean {
  return article.publisher.isFirstParty;
}
