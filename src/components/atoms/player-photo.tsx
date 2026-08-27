/**
 * A player portrait, falling back to a silhouette.
 *
 * ⚠ PORTED FROM `cronogol/components/squad-list/player-photo.tsx` +
 * `person-glyph.tsx` (ADR 0018, the same route `crest.tsx` took), collapsed into
 * one atom and re-scaled to the native `Size` tokens.
 *
 * ⚠ **The silhouette is part of the design, not a failure state.** `photoUrl` is
 * null for roughly one in five LaLiga players and one in TWO Premier League
 * players — worst on recent signings, because the source serves a grey
 * silhouette for anyone it has no photo of and the backend drops it rather than
 * storing a fake. Any consumer builds this fallback before it builds the image.
 *
 * ⚠ **The two fits are deliberately opposite, and swapping them is a bug.**
 * `row` crops centre-top, which frames the chest in a small circle. `card`
 * CONTAINS bottom, which cuts the bust at the chest and — the load-bearing part
 * — never stretches a source whose aspect ratio we do not control: 256×278 for
 * LaLiga, 110×140 for the Premier League, and nothing guaranteed at all for an
 * operator-uploaded stopgap.
 *
 * The web version needed a `naturalWidth === 0` effect because a server-rendered
 * `<img>` could 404 before React hydrated. That is an SSR artefact with no
 * counterpart here; `onError` is sufficient.
 *
 * ⚠ Drawn with plain views rather than `react-native-svg`, because a circle
 * over a dome does not justify reaching for it. ⚠ **Amended 2026-08-26:** that
 * was a judgement about THIS silhouette, not about the package — `react-native-svg`
 * is now in use, for the match-event glyphs (`event-glyph.tsx`, ADR 0045).
 * This one stays plain views; two views beat a dependency import for two shapes.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Size } from '@/constants/theme';

export interface PlayerPhotoProps {
  /** `null` renders the silhouette immediately, with no image request. */
  src?: string | null;
  /** `row` is a circle at `Size.playerThumb`; `card` is the sheet's portrait well. */
  variant: 'row' | 'card';
}

export function PlayerPhoto({ src, variant }: PlayerPhotoProps) {
  const [failed, setFailed] = useState(false);
  const row = variant === 'row';

  const frame = row
    ? { width: Size.playerThumb, height: Size.playerThumb, borderRadius: Radius.pill }
    : { width: Size.playerPhotoW, height: Size.playerPhotoH, borderRadius: Radius.tile };

  return (
    <View style={[styles.well, frame]}>
      {!src || failed ? (
        <Silhouette row={row} />
      ) : (
        <Image
          source={{ uri: src }}
          style={styles.fill}
          contentFit={row ? 'cover' : 'contain'}
          contentPosition={row ? 'top center' : 'bottom center'}
          transition={120}
          onError={() => setFailed(true)}
          // The player's name carries the label; the portrait is decorative (SPEC).
          accessible={false}
        />
      )}
    </View>
  );
}

/**
 * Head over shoulders, sized off the well so one shape serves both variants.
 *
 * ⚠ The torso is a wide, tall rounded rectangle pushed BELOW the frame — only its
 * rounded top is meant to be visible, and `overflow: 'hidden'` on the well is
 * what crops the rest.
 */
function Silhouette({ row }: { row: boolean }) {
  const box = row ? Size.playerThumb : Size.playerPhotoW;
  const head = box * (row ? 0.36 : 0.3);
  const torso = box * (row ? 0.72 : 0.75);

  return (
    <View style={styles.glyph} pointerEvents="none">
      <View
        style={[
          styles.mark,
          { width: head, height: head, borderRadius: head / 2, marginBottom: box * 0.06 },
        ]}
      />
      <View
        style={[
          styles.mark,
          { width: torso, height: torso, borderTopLeftRadius: torso / 2, borderTopRightRadius: torso / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    // ⚠ `raisedAlt` under a `glyph` mark, NOT `raised` under `raisedAlt` — those
    // two are three points apart and the silhouette disappeared into the tile.
    backgroundColor: Colors.dark.raisedAlt,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { width: '100%', height: '100%' },
  glyph: { alignItems: 'center', justifyContent: 'flex-end', width: '100%', height: '100%' },
  mark: { backgroundColor: Colors.dark.glyph },
});
