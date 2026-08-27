/**
 * Crest imagery for notifications — download, cache, hand to iOS.
 *
 * ⚠⚠ **This module never DRAWS anything, and that is the whole design.** Two of
 * our four leagues cannot be drawn on this device at all: Bundesliga clubs
 * publish `svg` and nothing else, and Serie A crests are WebP. Neither can
 * become a `UNNotificationAttachment`, and a Notification Service Extension has
 * no SVG rasteriser either. `senpai-backend` owns a PNG compositor, so it draws
 * the plate, the pair, and the abbreviation tile, and this file only ever moves
 * a finished PNG around (ADR 0036).
 *
 * The route always answers with an image — a crest that will not decode comes
 * back as a lettered tile, never an error — so a 404 here means a bad fixture
 * id, not a club without artwork.
 *
 * ⚠⚠ **`UNNotificationAttachment` MOVES the file it is given.** iOS relocates it
 * into the notification's own data store, so attaching the cached file empties
 * the cache and the next re-arm re-downloads all over again. Everything handed
 * to `scheduleNotificationAsync` is a COPY, made by `attachmentCopy` below.
 *
 * ⚠ The long-look card is drawn by an extension in a different process, which
 * cannot read this app's sandbox. Its crests go to the App Group container
 * instead — the same `group.com.altagamafc.app` the widgets now also read
 * (ADR 0047). That shared directory is why `pruneCrestCache` takes the widget's
 * pins into account; see the ⚠⚠ block on its App Group sweep.
 */
import { Directory, File, Paths } from 'expo-file-system';

import { API_BASE } from '@/lib/cronogol/client';
import { groupContainer } from '@/features/app-group';
import { widgetCrestPins } from '@/features/widgets/pins';

const CACHE_DIR = 'notif-crests';
const ATTACH_DIR = 'notif-attach';
const GROUP_DIR = 'crests';

export type CrestSlot = 'pair' | 'home' | 'away';

/**
 * ⚠ Built here rather than taken from a payload for the local reminder, and
 * taken FROM the payload for a server push — the backend sends the same URLs so
 * the service extension does not need to know how to build one.
 */
export function crestUrl(fixtureId: string, slot: CrestSlot): string {
  return `${API_BASE}/cronogol/fixtures/${encodeURIComponent(fixtureId)}/crest.png?slot=${slot}`;
}

function dir(...parts: string[]): Directory {
  const directory = new Directory(Paths.cache, ...parts);
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return directory;
}

/**
 * The composed home-and-away plate for one fixture, as a `file://` URI.
 *
 * Cached by fixture id, so a re-arm that has already seen this fixture costs
 * nothing. Returns `null` on any failure — a reminder without a crest is still
 * a reminder, and losing the notification to a flaky download would be far worse
 * than losing the artwork.
 */
export async function crestPairFile(fixtureId: string): Promise<string | null> {
  try {
    const target = new File(dir(CACHE_DIR), `${fixtureId}.png`);
    if (target.exists) return target.uri;

    const downloaded = await File.downloadFileAsync(crestUrl(fixtureId, 'pair'), target, {
      idempotent: true,
    });
    return downloaded.uri;
  } catch {
    return null;
  }
}

/**
 * A throwaway duplicate of a cached crest, safe to hand to iOS.
 *
 * ⚠ See the header: the attachment is MOVED, not read. Never pass a cache path
 * to `scheduleNotificationAsync` directly.
 *
 * ⚠ `key` is per NOTIFICATION, not per fixture (`PlannedReminder.key`). A reader
 * with three lead times gets three notifications for one match, and each needs
 * its own copy — the first one scheduled consumes the file, and iOS drops an
 * attachment it cannot read without saying so (ADR 0040).
 */
export async function attachmentCopy(cachedUri: string, key: string): Promise<string | null> {
  try {
    const source = new File(cachedUri);
    if (!source.exists) return null;

    const target = new File(dir(ATTACH_DIR), `${key}.png`);
    await source.copy(target, { overwrite: true });
    return target.uri;
  } catch {
    return null;
  }
}

/**
 * Put this fixture's two crests where the content extension can read them.
 *
 * Best-effort and deliberately silent: the extension falls back to the
 * abbreviation tile it can draw from `homeAbbr`/`awayAbbr` in the payload, so a
 * missing file costs artwork, not the card.
 */
export async function warmLongLookCrests(fixtureId: string): Promise<void> {
  const container = groupContainer();
  if (!container) return; // Simulator without the group provisioned, or Android.

  try {
    const target = new Directory(container, GROUP_DIR, fixtureId);
    if (!target.exists) target.create({ intermediates: true, idempotent: true });

    await Promise.all(
      (['home', 'away'] as const).map(async (slot) => {
        const file = new File(target, `${slot}.png`);
        if (file.exists) return;
        await File.downloadFileAsync(crestUrl(fixtureId, slot), file, { idempotent: true });
      }),
    );
  } catch {
    // Nothing to recover. The tile fallback covers it.
  }
}

/**
 * Drop every cached crest and attachment copy no longer in the reminder queue.
 *
 * ⚠ Called at the END of a re-arm, never at the start — pruning first would
 * throw away exactly the files the re-arm is about to attach.
 *
 * ⚠ **TWO keep-lists, because the three directories are keyed differently.** The
 * plate cache and the App Group are per FIXTURE; the attachment directory is per
 * NOTIFICATION (`${fixtureId}-${lead}`). Sweeping the attachments against fixture
 * ids would match nothing and delete every copy on every re-arm (ADR 0040).
 */
export function pruneCrestCache(
  keepFixtures: readonly string[],
  keepAttachments: readonly string[],
): void {
  const wantedFixtures = new Set(keepFixtures);
  const wantedAttachments = new Set(keepAttachments);

  const sweep = (directory: Directory, wanted: Set<string>, idOf: (name: string) => string) => {
    if (!directory.exists) return;
    for (const entry of directory.list()) {
      // ⚠ **A `Directory`'s `uri` ends in a slash and a `File`'s does not.**
      // `FileSystemPath.init` standardises through
      // `appendingPathComponent(_:isDirectory:)`, which appends one. A plain
      // `split('/').pop()` therefore yields `''` for every directory — never a
      // member of `wanted` — and this sweep would delete the entire App Group
      // crest cache on every single re-arm. The card would then show lettered
      // tiles for clubs that HAVE a crest, and re-download the lot on every
      // foreground. Strip the slash first.
      const name = entry.uri.replace(/\/+$/, '').split('/').pop() ?? '';
      if (!name) continue;
      if (!wanted.has(idOf(name))) entry.delete();
    }
  };

  try {
    const stem = (name: string) => name.replace(/\.png$/, '');

    sweep(new Directory(Paths.cache, CACHE_DIR), wantedFixtures, stem);
    sweep(new Directory(Paths.cache, ATTACH_DIR), wantedAttachments, stem);

    // ⚠⚠ **THE APP GROUP SWEEP TAKES A THIRD KEEP-LIST, and this is trap 17's
    // cousin.** That directory serves the long-look card AND the widgets, but
    // the two are different selections over different windows: the reminder
    // queue is the soonest 12 fixtures inside 7 days, the widget snapshot is
    // one fixture per followed club across 21. A club whose next match is 12
    // days out is in the second and not the first — so sweeping against
    // `keepFixtures` alone deletes exactly the crests the widget is drawing,
    // on the very next foreground, and the widget silently falls back to
    // lettered tiles for clubs that HAVE artwork.
    //
    // ⚠ The two `Paths.cache` sweeps above are deliberately NOT unioned: the
    // widget uses neither the composed `pair` plate nor the attachment copies.
    const container = groupContainer();
    if (container) {
      const wantedGroup = new Set([...keepFixtures, ...widgetCrestPins()]);
      sweep(new Directory(container, GROUP_DIR), wantedGroup, (name) => name);
    }
  } catch {
    // A cache that will not prune is a disk-space problem, not a correctness one.
  }
}
