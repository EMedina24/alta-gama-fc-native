/**
 * The NEWS widget's contract — what `NewsWidget.swift` is allowed to know.
 *
 * ⚠⚠ **A SECOND FILE in the App Group, `widget/news.json`, not a bigger
 * `snapshot.json`.** Fixtures and headlines refresh on different clocks —
 * fixtures when a round is published, headlines hourly — and one file means the
 * writer has to hold both to update either. `targets/widget/NewsSnapshot.swift`
 * is this file's mirror; a field added to one is a blank on the tile until it
 * is added to both (ADR 0061).
 *
 * ⚠⚠ **The headline is a QUOTE.** It arrives in the publisher's language and is
 * never translated, shortened or re-cased — the feed is aggregated third-party
 * reporting that links out, and editing it here would misattribute words to
 * MARCA that they did not write. Only `copy` follows the reader's locale,
 * pre-formatted here for the same reason `WidgetSnapshot.copy` is (ADR 0047).
 *
 * ⚠ **Age is NOT baked.** `filedAt` travels raw and Swift derives `3h` against
 * the timeline entry's own date — the one field that inverts the rest of the
 * snapshot's rule, because a baked "3h" is a lie for the next twelve hours.
 *
 * ⚠ The selection is PURE and the writing is not, the same split as
 * `features/widgets/snapshot.ts`, so `_debug/widgets` can show the file this
 * device would write with no native module in sight.
 */
import { File } from 'expo-file-system';

import { groupContainer } from '@/features/app-group';
import { SNAPSHOT_DIR, writeGroupJson } from '@/features/widgets/snapshot';
import { articleTopic, plainText, selectNewsItems } from '@/lib/cronogol/news';
import type { NewsArticleView } from '@/lib/cronogol/types';
import type { Copy } from '@/lib/i18n/copy';

/** Bump when `NewsItem`/`NewsSnapshot` changes shape. */
export const NEWS_SNAPSHOT_VERSION = 1;

/**
 * How many items get an image. The tile draws four — a lead and three rows —
 * and a fifth image is a download and a decode nothing ever shows.
 */
export const NEWS_IMAGE_BUDGET = 4;

export interface NewsItem {
  /** The API's article id — the image file is `news/{id}.jpg`. */
  id: string;
  /** Club or competition per the publisher. ⚠ `null` draws no chip. */
  topic: string | null;
  /** `MARCA`, `SPORT` — the attribution eyebrow. */
  publisher: string;
  title: string;
  /** ⚠ Raw ISO instant. The age is computed in Swift. */
  filedAt: string;
  /** Opens at the publisher, in Safari (ADR 0061). */
  url: string;
  /** Whether `news/{id}.jpg` was on disk when this was written. */
  hasImage: boolean;
}

export interface NewsSnapshot {
  v: number;
  writtenAt: string;
  copy: {
    /** `NEWS` / `NOTICIAS`. */
    news: string;
    /**
     * ⚠ Always `""` since ADR 0061 chose the GLOBAL feed. The header slot
     * stays in the contract so a per-club tile can fill it later without a
     * version bump; Swift draws an empty eyebrow as nothing.
     */
    clubCount: string;
    /** Feed is empty (or every story aged out). */
    noHeadlines: string;
    /** Follows nothing at all. Kept for the Swift contract; see `clubCount`. */
    followPrompt: string;
  };
  items: NewsItem[];
}

/**
 * Everything the tile needs, rendered for THIS reader.
 *
 * ⚠ Pure. `imagesOnDisk` is passed in rather than read here so `hasImage` is
 * a statement about a file that exists, never a promise about a download.
 */
export function buildNewsSnapshot(
  articles: readonly NewsArticleView[],
  now: Date,
  copy: Copy,
  imagesOnDisk: ReadonlySet<string>,
): NewsSnapshot {
  const items = selectNewsItems(articles, now).map<NewsItem>((article) => ({
    id: article.id,
    topic: articleTopic(article),
    publisher: article.publisher.name,
    title: plainText(article.title),
    filedAt: article.publishedAt,
    url: article.url,
    hasImage: imagesOnDisk.has(article.id),
  }));

  return {
    v: NEWS_SNAPSHOT_VERSION,
    writtenAt: now.toISOString(),
    copy: {
      news: copy.widgets.news,
      clubCount: '',
      noHeadlines: copy.widgets.noHeadlines,
      followPrompt: copy.widgets.followPrompt,
    },
    items,
  };
}

const NEWS_NAME = 'news.json';

/** Where `_debug/widgets` and `NewsSnapshot.swift` both look. */
export function newsSnapshotFile(): File | null {
  const container = groupContainer();
  if (!container) return null;
  return new File(container, SNAPSHOT_DIR, NEWS_NAME);
}

/** Temp-then-rename, shared with the fixture snapshot. */
export function writeNewsSnapshot(snapshot: NewsSnapshot): boolean {
  return writeGroupJson(SNAPSHOT_DIR, NEWS_NAME, snapshot);
}

/**
 * The comparison key for "has anything actually changed".
 *
 * ⚠⚠ **`writtenAt` is excluded** for the reason `snapshotKey` documents at
 * length — the re-arm runs on every foreground and WidgetKit rations reloads.
 * Only what the tile DRAWS is compared: ids, image presence and copy. A feed
 * that answered with the same eight stories is not a change.
 */
export function newsSnapshotKey(snapshot: NewsSnapshot): string {
  return JSON.stringify({
    v: snapshot.v,
    copy: snapshot.copy,
    items: snapshot.items.map((item) => [item.id, item.hasImage]),
  });
}
