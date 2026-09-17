/**
 * Crests for the STANDINGS widget — download, downscale, hand over (ADR 0185).
 *
 * ⚠⚠ **Per CLUB, not per fixture, so NOT the `crests/` directory.** The other
 * widgets draw the backend's composed PNG for a fixture's side
 * (`crests/{fixtureId}/{slot}.png`); a table row has no fixture. The URLs come
 * from `GET /cronogol/crests?league=` (senpai-backend §135), which returns the
 * mirrored storage URLs and NEVER bytes — so the resize happens here, the way
 * `features/news/images.ts` does it for headline pictures. `pruneCrestCache`
 * keys on fixture ids and must never learn a club slug; this directory has its
 * own keep-list and its own sweep.
 *
 * ⚠⚠ **Encoded at widget size.** A 420px `medium` crest decoded twenty times in
 * the widget process is a widget the system kills for its memory budget, with
 * nothing in any log. Every file here is at most 33×33 — 11pt @3x.
 *
 * ⚠ **This is better than the fixture route for Serie A AND the Bundesliga.**
 * The backend compositor skips WebP and SVG; this device reads both. WebP
 * decodes straight through `expo-image-manipulator`. SVG (every Bundesliga club,
 * a few Champions League ones) goes through `expo-image`'s bundled SVG coder
 * first — `Image.loadAsync` returns an image ref the manipulator accepts — so
 * the widget receives a plain PNG either way. The API doc's "a lettered tile
 * forever" is about SERVER-drawn surfaces; it does not bind a client that can
 * rasterise. The first build shipped SVG as tiles and Ed caught it on a placed
 * tile.
 *
 * ⚠ **The filename carries the source's content hash** (`{slug}.{hash}.png`).
 * Storage objects are content-addressed by sha256, so a club that changes its
 * badge gets a new file rather than the old one forever, and the snapshot names
 * the exact file — Swift never guesses a path.
 */
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { groupContainer } from '@/features/app-group';
import type { ClubCrestView } from '@/lib/cronogol/types';

import { crestFileName, type CrestDecode } from './snapshot';

/** `<AppGroup>/standings-crests/{slug}.{hash}.png` — read by `StandingsCrest` in Swift. */
export const STANDINGS_CREST_DIR = 'standings-crests';
/** The downloaded originals, in this app's own cache. */
const SOURCE_DIR = 'standings-crests-src';

/** 11pt @3x. */
const CREST_PX = 33;

/**
 * Files being written RIGHT NOW.
 *
 * ⚠ The sweep and the warm run in the same async flow today, but the debounce
 * can fire a second `applyStandingsSnapshot` while the first is still
 * downloading — the race `inFlightCrests` in `crest-cache.ts` exists for
 * (trap 58). A name in here is never deleted.
 */
const inFlight = new Set<string>();

function cacheDir(name: string): Directory {
  const directory = new Directory(Paths.cache, name);
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return directory;
}

/**
 * The crest as something the manipulator can take.
 *
 * ⚠ SVG is loaded by `expo-image` at a bounded size — a vector has no pixel
 * size of its own, and an unbounded load renders at the document's viewBox,
 * which for some clubs is thousands of points. 132px is 4× the output, enough
 * that the downscale below is a real resample rather than a blur.
 */
async function sourceFor(
  target: { name: string; url: string; decode: CrestDecode },
): Promise<string | Awaited<ReturnType<typeof Image.loadAsync>>> {
  if (target.decode === 'svg') {
    return Image.loadAsync(target.url, { maxWidth: 132, maxHeight: 132 });
  }
  const source = new File(cacheDir(SOURCE_DIR), target.name.replace(/\.png$/, ''));
  if (!source.exists) {
    await File.downloadFileAsync(target.url, source, { idempotent: true });
  }
  return source.uri;
}

async function warmOne(
  target: { name: string; url: string; decode: CrestDecode },
  group: Directory,
): Promise<boolean> {
  const file = new File(group, target.name);
  if (file.exists) return true;

  inFlight.add(target.name);
  try {
    const source = await sourceFor(target);

    // Aspect-FIT into the square: a wide badge keeps its width at 33 and a
    // tall one its height. ⚠ Never upscaled — a 25px source stays 25px and the
    // tile draws it `scaledToFit`.
    const probe = await ImageManipulator.manipulate(source).renderAsync();
    const factor = Math.min(CREST_PX / probe.width, CREST_PX / probe.height, 1);
    const width = Math.max(1, Math.round(probe.width * factor));
    const height = Math.max(1, Math.round(probe.height * factor));
    probe.release();

    const rendered = await ImageManipulator.manipulate(source)
      .resize({ width, height })
      .renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.PNG });
    rendered.release();

    // ⚠ Copy then delete, as `news/images.ts` does: the manipulator's output is
    // in ITS cache, and a move into the App Group can cross volumes.
    const output = new File(saved.uri);
    await output.copy(file, { overwrite: true });
    output.delete();
    // The original is only needed until the resize has landed.
    if (typeof source === 'string') {
      const original = new File(source);
      if (original.exists) original.delete();
    } else {
      source.release();
    }
    return file.exists;
  } catch {
    // A CDN hiccup or an undecodable file: the row draws its lettered tile and
    // the next foreground retries.
    return false;
  } finally {
    inFlight.delete(target.name);
  }
}

/**
 * Put every drawable crest on disk and return `team slug → filename` for the
 * ones that are there.
 *
 * ⚠ Sequential, not `Promise.all`: ~150 crests on a first launch, and each
 * decode is transient memory in THIS process. After the first run every call is
 * an existence check per club.
 */
export async function warmStandingsCrests(
  crests: readonly ClubCrestView[],
): Promise<Map<string, string>> {
  const onDisk = new Map<string, string>();
  const container = groupContainer();
  if (!container) return onDisk; // Android, or an unprovisioned simulator.

  let group: Directory;
  try {
    group = new Directory(container, STANDINGS_CREST_DIR);
    if (!group.exists) group.create({ intermediates: true, idempotent: true });
  } catch {
    return onDisk;
  }

  const seen = new Set<string>();
  for (const crest of crests) {
    // ⚠ A club can sit in two sets (a LaLiga side in the Champions League).
    if (seen.has(crest.slug)) continue;
    seen.add(crest.slug);
    const target = crestFileName(crest);
    if (target && (await warmOne(target, group))) onDisk.set(crest.slug, target.name);
  }
  return onDisk;
}

/**
 * Delete every crest file the snapshot does not name.
 *
 * ⚠ Called AFTER the write, never before — the news prune's rule. Keyed on the
 * exact FILENAME, so a club's superseded badge (old hash) goes too.
 *
 * ⚠ A `Directory`'s `uri` ends in a slash and a `File`'s does not (trap 17).
 */
export function pruneStandingsCrests(keepFiles: ReadonlySet<string>): void {
  try {
    const container = groupContainer();
    if (!container) return;
    const group = new Directory(container, STANDINGS_CREST_DIR);
    if (!group.exists) return;
    for (const entry of group.list()) {
      const name = entry.uri.replace(/\/+$/, '').split('/').pop() ?? '';
      if (!name || keepFiles.has(name) || inFlight.has(name)) continue;
      entry.delete();
    }
  } catch {
    // A cache that will not prune is a disk-space problem, not a correctness one.
  }
}

/** `<AppGroup>/standings-crests/{file}` exists — for `_debug/widgets`. */
export function standingsCrestExists(file: string): boolean {
  const container = groupContainer();
  if (!container) return false;
  return new File(container, STANDINGS_CREST_DIR, file).exists;
}
