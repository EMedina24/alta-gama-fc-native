/**
 * News feed types and grouping for the app screens.
 *
 * ⚠ ONE feed, two consumers. This screen and the News widget read the same
 * query — the widget's App Group writer (`widget/news.json`) should serialise
 * what this cache already holds rather than fetch a second time. See
 * `export/news-widget/NEWS-WIDGET.md`.
 */
export interface NewsItem {
  id: string;
  /** Club or competition. ⚠ NULL is normal — every SPORT item files under none.
   *  A null topic draws no chip; never render a dash. */
  topic: string | null;
  /** `MARCA`, `SPORT`, `ESPN Deportes`, or `AltaGama FC` for our own. */
  publisher: string;
  /** ⚠ A QUOTE. Publisher's language, never translated, trimmed or re-cased. */
  title: string;
  /** ISO instant the publisher filed it. Age is derived, never stored. */
  filedAt: string;
  /** Opens at the publisher — except our own pieces, which open in-app. */
  url: string;
  imageUrl: string | null;
  /** Slugs this item was matched to, for the "Your clubs" filter. */
  clubSlugs: string[];
  leagueSlug: string | null;
  /** True when `publisher === 'AltaGama FC'` — no link-out sheet, no Safari view. */
  ours: boolean;
}

export type NewsFilter = { kind: 'all' } | { kind: 'clubs' } | { kind: 'league'; slug: string };

export function filterNews(items: NewsItem[], filter: NewsFilter, followed: string[]): NewsItem[] {
  if (filter.kind === 'all') return items;
  if (filter.kind === 'clubs') return items.filter(i => i.clubSlugs.some(s => followed.includes(s)));
  return items.filter(i => i.leagueSlug === filter.slug);
}

/**
 * Today / Yesterday / date groups, in the reader's zone.
 *
 * ⚠ Compute against `now` at render, not at fetch: a list opened at 00:05 must
 * move last night's stories into "Yesterday" without a refetch.
 */
export function groupByDay(items: NewsItem[], now: Date, locale: string) {
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const today = key(now);
  const yesterday = key(new Date(now.getTime() - 86_400_000));
  const buckets = new Map<string, NewsItem[]>();

  for (const item of [...items].sort((a, b) => b.filedAt.localeCompare(a.filedAt))) {
    const k = key(new Date(item.filedAt));
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(item);
  }

  return [...buckets.entries()].map(([k, group]) => ({
    label:
      k === today ? 'TODAY'
      : k === yesterday ? 'YESTERDAY'
      : new Date(k).toLocaleDateString(locale, { day: 'numeric', month: 'short' }).toUpperCase(),
    items: group,
  }));
}

/** `3h`, `18h`, `2d` — same shape as the widget's `W.age`, recomputed on appear. */
export function age(filedAt: string, now: Date): string {
  const seconds = Math.max(0, (now.getTime() - new Date(filedAt).getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 48 * 3600) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

/**
 * What the Today card shows: the newest story with its picture, then two more
 * as single lines, and how many arrived since the reader last opened News.
 *
 * ⚠ Three, hard. The card is a doorway; a fourth row pushes "Rest of the round"
 * off the first screen of the board, and scores come first on that board.
 */
export function todayCard(items: NewsItem[], lastSeen: Date) {
  const fresh = [...items].sort((a, b) => b.filedAt.localeCompare(a.filedAt));
  return {
    lead: fresh[0] ?? null,
    rows: fresh.slice(1, 3),
    newCount: fresh.filter(i => new Date(i.filedAt) > lastSeen).length,
  };
}
