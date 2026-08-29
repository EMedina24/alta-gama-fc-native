/**
 * Rendering and handing off the shareable card (ADR 0065).
 *
 * ⚠ The ONE seam for three native modules — `react-native-view-shot`,
 * `expo-sharing`, `expo-media-library`. A dev client built before they were
 * declared throws here and nowhere else.
 *
 * The capture view lives in the BUILDER SCREEN (a 9:16 card at @3x is 640pt
 * tall, taller than any sheet detent), while the buttons live in the export
 * sheet, which shares no React state with the screen. So the screen registers
 * a `capture` function on mount and the sheet calls `exportLineup`, which
 * awaits it. One registered capture at a time — there is one builder screen.
 *
 * ⚠ The card is rasterised at a TRUE 1080 × H: the capture view is laid out
 * at `1080 / PixelRatio` points and captured at device pixel ratio, so the
 * PNG is 1080 wide on any density. Never a screenshot of the 361pt pitch
 * scaled up — the same rule the web page states.
 *
 * ⚠ Save needs Photos ADD-ONLY permission (`requestPermissionsAsync(true)`),
 * which is the narrower prompt and all the feature needs. `NSPhotoLibraryAddUsageDescription`
 * comes from the `expo-media-library` plugin in `app.json`.
 */
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import type { ExportSize } from './card-geometry';

export type CaptureFn = (size: ExportSize) => Promise<unknown>;
export type ExportKind = 'share' | 'save';
export type ExportOutcome = 'shared' | 'saved' | 'denied' | 'unavailable';

let capture: CaptureFn | null = null;

/** The builder screen registers its capture on mount and `null` on unmount. */
export function registerCapture(fn: CaptureFn | null): void {
  capture = fn;
}

/** Wraps `captureRef` so the screen does not import view-shot itself. */
export async function captureView(ref: React.RefObject<unknown>): Promise<string> {
  return captureRef(ref as never, { format: 'png', quality: 1, result: 'tmpfile' });
}

export async function exportLineup(kind: ExportKind, size: ExportSize): Promise<ExportOutcome> {
  if (!capture) return 'unavailable';
  const uri = (await capture(size)) as string;

  if (kind === 'share') {
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    return 'shared';
  }

  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) return 'denied';
  await MediaLibrary.saveToLibraryAsync(uri);
  return 'saved';
}
