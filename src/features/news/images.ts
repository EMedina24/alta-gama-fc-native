/**
 * Headline pictures for the NEWS widget — download, downscale, hand over.
 *
 * ⚠⚠ **Encoded at widget size, never the publisher's original.** A widget
 * process that decodes a 1200px JPEG is a widget the system kills for
 * exceeding its memory budget — with nothing in any log. Every file written to
 * `news/{id}.jpg` is at most `LEAD_WIDTH × LEAD_HEIGHT` (the lead at @3x),
 * cover-cropped, so the extension's `UIImage(data:)` is bounded (ADR 0061).
 *
 * ⚠ ONE size per item, the lead's, not lead-plus-thumbnail. When the lead ages
 * out of the 48h window the second story becomes the lead, and a 132² thumb
 * upscaled to 308×116pt is a blurry hero. The row's `scaledToFill` in a 44pt
 * square centre-crops the wide image, which is the crop the web's
 * `aspect-video` well makes anyway.
 *
 * ⚠ Pre-downloaded, never fetched by the extension — the same rule as crests
 * (ADR 0025 step 4). And a SEPARATE directory from `crests/` with its own
 * sweep: `pruneCrestCache` keys on fixture ids and must not learn about
 * article ids, so the two never share a keep-list.
 *
 * ⚠ Best-effort and silent per item. A publisher's CDN can 404 or hotlink-block
 * at any time; the tile draws the lime-ruled headline block instead of a
 * picture, which is a layout, not a hole.
 */
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { groupContainer } from '@/features/app-group';

import { NEWS_IMAGE_BUDGET, type NewsItem } from './snapshot';

/** `<AppGroup>/news/{id}.jpg` — read by `NewsImage.load` in Swift. */
const GROUP_DIR = 'news';
/** The publisher originals, in this app's own cache, keyed by article id. */
const SOURCE_DIR = 'news-src';

/** The lead at 308×116pt, @3x. */
const LEAD_WIDTH = 924;
const LEAD_HEIGHT = 348;
const JPEG_QUALITY = 0.8;

function cacheDir(name: string): Directory {
  const directory = new Directory(Paths.cache, name);
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return directory;
}

/**
 * Get one article's picture onto disk at widget size. `true` when the App
 * Group file exists afterwards.
 */
async function warmOne(item: NewsItem & { imageUrl: string | null }, group: Directory): Promise<boolean> {
  const target = new File(group, `${item.id}.jpg`);
  if (target.exists) return true;
  if (!item.imageUrl) return false;

  try {
    const source = new File(cacheDir(SOURCE_DIR), item.id);
    if (!source.exists) {
      await File.downloadFileAsync(item.imageUrl, source, { idempotent: true });
    }

    // Cover-crop. `scale` is what makes the picture just COVER the lead box;
    // below 1 the original is larger than the box and is scaled down to it,
    // above 1 it is smaller and is left at its own size (⚠ never upscaled — a
    // 600px photo stays 600px and the tile draws it `scaledToFill`), cropped
    // to the lead's aspect instead. Cropping past the bounds throws.
    const probe = await ImageManipulator.manipulate(source.uri).renderAsync();
    const scale = Math.max(LEAD_WIDTH / probe.width, LEAD_HEIGHT / probe.height);
    const factor = Math.min(scale, 1);
    const width = Math.round(probe.width * factor);
    const height = Math.round(probe.height * factor);
    const cropWidth = Math.min(width, Math.round((height * LEAD_WIDTH) / LEAD_HEIGHT));
    const cropHeight = Math.min(height, Math.round((width * LEAD_HEIGHT) / LEAD_WIDTH));
    probe.release();

    const rendered = await ImageManipulator.manipulate(source.uri)
      .resize({ width, height })
      .crop({
        originX: Math.floor((width - cropWidth) / 2),
        originY: Math.floor((height - cropHeight) / 2),
        width: cropWidth,
        height: cropHeight,
      })
      .renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
    rendered.release();

    // ⚠ Copy then delete the manipulator's own output: it lands in ITS cache
    // directory, and a `move` across into the App Group container is a
    // different volume on some devices.
    const output = new File(saved.uri);
    await output.copy(target, { overwrite: true });
    output.delete();
    return target.exists;
  } catch {
    return false;
  }
}

/**
 * Warm the first `NEWS_IMAGE_BUDGET` items' pictures, in `filedAt` order, and
 * return the ids whose file is on disk — the set `buildNewsSnapshot` turns
 * into `hasImage`.
 *
 * ⚠ In order and capped, as the handoff specifies: a fifth image is never
 * drawn. Sequential rather than `Promise.all` because each decode of a
 * publisher original is a few MB of transient memory in THIS process too.
 */
export async function warmNewsImages(
  items: readonly (NewsItem & { imageUrl: string | null })[],
): Promise<Set<string>> {
  const onDisk = new Set<string>();
  const container = groupContainer();
  if (!container) return onDisk; // Android, or an unprovisioned simulator.

  let group: Directory;
  try {
    group = new Directory(container, GROUP_DIR);
    if (!group.exists) group.create({ intermediates: true, idempotent: true });
  } catch {
    return onDisk;
  }

  for (const item of items.slice(0, NEWS_IMAGE_BUDGET)) {
    if (await warmOne(item, group)) onDisk.add(item.id);
  }
  return onDisk;
}

/**
 * Drop every picture not in the current snapshot, in both directories.
 *
 * ⚠ Called AFTER the write, never before — pruning first throws away the file
 * the snapshot is about to claim `hasImage` for.
 *
 * ⚠ A `Directory`'s `uri` ends in a slash and a `File`'s does not (trap 17);
 * strip it before taking the last path segment or every entry is `''`.
 */
export function pruneNewsImages(keepIds: readonly string[]): void {
  const wanted = new Set(keepIds);

  const sweep = (directory: Directory, idOf: (name: string) => string) => {
    if (!directory.exists) return;
    for (const entry of directory.list()) {
      const name = entry.uri.replace(/\/+$/, '').split('/').pop() ?? '';
      if (!name) continue;
      if (!wanted.has(idOf(name))) entry.delete();
    }
  };

  try {
    sweep(new Directory(Paths.cache, SOURCE_DIR), (name) => name);
    const container = groupContainer();
    if (container) sweep(new Directory(container, GROUP_DIR), (name) => name.replace(/\.jpg$/, ''));
  } catch {
    // A cache that will not prune is a disk-space problem, not a correctness one.
  }
}

/** `<AppGroup>/news/{id}.jpg` exists — for `_debug/widgets`. */
export function newsImageExists(id: string): boolean {
  const container = groupContainer();
  if (!container) return false;
  return new File(container, GROUP_DIR, `${id}.jpg`).exists;
}
