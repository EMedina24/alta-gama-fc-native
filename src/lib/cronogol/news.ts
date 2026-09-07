/**
 * The pure half of the news feed — what the widget selects and how a string
 * off RSS is made safe to print.
 *
 * ⚠ PORTED FROM `cronogol/lib/cronogol/news.ts` (ADR 0061): `plainText` and
 * `articleTopic` verbatim. `articleExcerpt` followed at ADR 0129 when the
 * story sheet grew a description. `NewsScope`, `articleHref` and
 * `articleByline` remain un-ported — a helper nothing renders is a helper
 * that drifts (the sheet's byline needs to KNOW whether an author existed,
 * which `articleByline`'s fallback collapses, so the route derives it).
 *
 * ⚠ No native import, deliberately. This is the module the harness exercises.
 */
import type { NewsArticleView, NewsFeedView } from './types';

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
 * The publisher's own summary, or null.
 *
 * ⚠ Already truncated server-side to 400 chars on a word boundary. Clamp it
 * with styles if the layout needs to, but never cut it again here — that ends
 * up with two ellipses.
 */
export function articleExcerpt(article: NewsArticleView): string | null {
  const excerpt = article.excerpt ? plainText(article.excerpt) : '';
  return excerpt || null;
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

// ---------------------------------------------------------------- news reel (ADR 0129)

/**
 * Pages off the reel's infinite query, flattened newest-first.
 *
 * ⚠ Dedupe by `id`, FIRST occurrence wins — a page-one refetch after new
 * stories arrive shifts the keyset window, so the same article can straddle
 * two pages. (The web's `mergeArticles` rule: by `id` only, never by title —
 * two publishers filing the same headline are two stories.)
 */
export function mergeNewsPages(pages: readonly NewsFeedView[]): NewsArticleView[] {
  const seen = new Set<string>();
  const merged: NewsArticleView[] = [];
  for (const page of pages) {
    for (const article of page.articles) {
      if (seen.has(article.id)) continue;
      seen.add(article.id);
      merged.push(article);
    }
  }
  return merged;
}

/**
 * What the reel draws — every printable story, however old.
 *
 * ⚠ Deliberately NOT `selectNewsItems`: the 48h cutoff belongs to the widget
 * and the Today card, and the reel pages BACK in time — a cutoff would empty
 * every page after the first. The unprintable rules stay: no `url`, no
 * printable title, or no parseable `publishedAt` (no honest age) → no card.
 * No re-sort either — keyset pages arrive newest-first already.
 */
export function selectReelItems(articles: readonly NewsArticleView[]): NewsArticleView[] {
  return articles.filter((article) => {
    if (!article.url || !plainText(article.title)) return false;
    return !Number.isNaN(Date.parse(article.publishedAt));
  });
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
