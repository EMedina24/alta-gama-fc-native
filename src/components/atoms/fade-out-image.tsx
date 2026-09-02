/**
 * An image that dissolves toward its bottom edge — the CSS
 * `mask-image: linear-gradient(...)` treatment, built without a mask
 * (ADR 0098).
 *
 * ⚠ Why not an SVG `<Mask>`: react-native-svg's `<Image>` decodes through the
 * native raster pipeline, and a Bundesliga crest is an `.svg` URL with no
 * raster anywhere — probed 2026-09-01, `logoUrls` carries `['svg']` alone and
 * `logoUrl` is itself the `.svg` — so a masked crest would silently vanish
 * for a whole league (trap 12's shape, again). Why not `masked-view`: a new
 * native module, which the installed dev build cannot load, spent on a
 * 6%-alpha watermark.
 *
 * So the image is drawn in horizontal BANDS: one solid window above
 * `fadeFrom`, then `bands` windows stepping opacity down a half-cosine to
 * zero at `fadeTo`. Every band is a clipped viewport onto the SAME
 * expo-image source — decoded once, cached once, every format expo-image
 * speaks (svg included). At watermark alphas the per-band step is ≤1.5%,
 * far below perception; this is only honest for low-opacity artwork — a
 * full-opacity photo would band visibly.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

export interface FadeOutImageProps {
  uri: string;
  /** The square box the image is contained in. */
  size: number;
  /** Where the dissolve begins, as a fraction of `size` from the top. */
  fadeFrom: number;
  /** Where it reaches zero. Below this line nothing is drawn. */
  fadeTo: number;
  bands?: number;
  /** Position and overall opacity live on the caller's wrapper style. */
  style?: StyleProp<ViewStyle>;
}

export function FadeOutImage({
  uri,
  size,
  fadeFrom,
  fadeTo,
  bands = 6,
  style,
}: FadeOutImageProps) {
  const solid = Math.round(size * fadeFrom);
  const bandH = (size * (fadeTo - fadeFrom)) / bands;

  const window = (top: number, height: number, opacity: number) => (
    <View key={top} style={[styles.window, { top, height, opacity }]}>
      <Image
        source={{ uri }}
        // The full image, shifted so this window shows its own slice.
        style={{ position: 'absolute', top: -top, left: 0, width: size, height: size }}
        contentFit="contain"
        accessible={false}
      />
    </View>
  );

  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      {window(0, solid, 1)}
      {Array.from({ length: bands }, (_, i) => {
        // ⚠ Rounded EDGES, not rounded heights — adjacent windows must share
        // their boundary pixel or a hairline of the image repeats between them.
        const top = Math.round(solid + i * bandH);
        const next = Math.round(solid + (i + 1) * bandH);
        // Sampled at the band's centre on a half-cosine, so the dissolve eases
        // out instead of hitting zero with a visible last step.
        const alpha = (1 + Math.cos(Math.PI * ((i + 0.5) / bands))) / 2;
        return window(top, next - top, alpha);
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  window: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
});
