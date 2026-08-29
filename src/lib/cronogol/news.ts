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
