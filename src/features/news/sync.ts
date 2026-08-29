/**
 * Getting `news.json` onto disk and the timelines reloaded.
 *
 * ⚠ Mirrors `features/widgets/sync.ts`: a trailing debounce plus a "did anything
 * actually change" guard. The re-arm runs on EVERY foreground; without the
 * guard each one would spend a WidgetKit reload (trap 34).
 *
 * ⚠ The order inside `applyNewsSnapshot` is load-bearing: images are warmed
 * BEFORE the snapshot is built, so `hasImage` is a fact about a file on disk
 * rather than a hope about a download — and the prune runs AFTER the write.
 */
import { reloadWidgets } from '@/features/push/capability';
import { selectNewsItems } from '@/lib/cronogol/news';
import type { NewsArticleView } from '@/lib/cronogol/types';
import type { Copy } from '@/lib/i18n/copy';

import { pruneNewsImages, warmNewsImages } from './images';
import { buildNewsSnapshot, newsSnapshotKey, writeNewsSnapshot } from './snapshot';

const DEBOUNCE_MS = 1_000;

let timer: ReturnType<typeof setTimeout> | null = null;

/** In-memory only, as `features/widgets/sync.ts` argues: one write per launch. */
let lastKey: string | null = null;

export async function applyNewsSnapshot(
  articles: readonly NewsArticleView[],
  now: Date,
  copy: Copy,
): Promise<void> {
  const picked = selectNewsItems(articles, now);

  // ⚠ Warm even when the snapshot will turn out unchanged: a download that
  // failed last time (offline, a CDN hiccup) must be retryable, and a settled
  // cache costs nothing — `warmOne` skips files already on disk.
  const onDisk = await warmNewsImages(
    picked.map((article) => ({
      id: article.id,
      topic: null,
      publisher: article.publisher.name,
      title: article.title,
      filedAt: article.publishedAt,
      url: article.url,
      hasImage: false,
      imageUrl: article.imageUrl,
    })),
  );

  const snapshot = buildNewsSnapshot(articles, now, copy, onDisk);
  const key = newsSnapshotKey(snapshot);
  const changed = key !== lastKey;

  if (changed) {
    if (!writeNewsSnapshot(snapshot)) return; // No App Group: Android, or unprovisioned.
    lastKey = key;
  }

  pruneNewsImages(snapshot.items.map((item) => item.id));

  // ⚠ `reloadWidgets` passes no kind (ADR 0047), so this reloads the fixture
  // widgets too. The key guard keeps that to once per new headline set.
  if (changed) await reloadWidgets();
}

/** Trailing-debounced `applyNewsSnapshot`. */
export function scheduleNewsSync(articles: readonly NewsArticleView[], now: Date, copy: Copy): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void applyNewsSnapshot(articles, now, copy);
  }, DEBOUNCE_MS);
}

/** ⚠ Test/debug only — forces the next `applyNewsSnapshot` to write. */
export function forgetNewsSnapshot(): void {
  lastKey = null;
}
