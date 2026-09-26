/**
 * A player on the Starting XI builder: a light disc with his initials in
 * Saira, or his portrait (ADR 0213, the handoff's token orb).
 *
 * One atom at every size the builder draws him — the pitch token (scaled by
 * the camera), the 38pt bench and picker orbs, the player card's 60pt, the
 * saved lineup's 24pt initials dots — so a player looks like one object
 * wherever he is.
 *
 * ⚠ **Portrait when the league gives one, initials when it does not, and a
 * failed portrait falls back to initials** (ADR 0072's rule, kept). About one
 * LaLiga player in five and one Premier League player in two has no
 * `photoUrl`, and every Honduran has none.
 *
 * ⚠ The disc's gradient is the handoff's `linear-gradient(160deg, #f4f6f6,
 * #c9cfd4)`, drawn in SVG — two opaque stops, so no premultiplied-alpha
 * artefact. The ring and halo sit OUTSIDE the disc's box, as the CSS
 * `box-shadow` spread does: the layout size is the disc alone.
 *
 * ⚠ Drawn, not loaded — the repo has no icon set.
 */
import { Image } from 'expo-image';
import { useId, useState } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Colors, DisplayFont, Radius } from '@/constants/theme';

export interface XiOrbProps {
  /** Disc diameter, points. */
  size: number;
  /** Two letters, already derived. */
  initials: string;
  photoUrl?: string | null;
  /** Ring colour; `none` draws none. */
  ring?: 'none' | 'white' | 'lime';
  /** Ring width, points. */
  ringWidth?: number;
  /** A faint halo past the ring, points. 0 draws none. */
  halo?: number;
  /** Fires once the portrait has loaded or failed — the export's capture barrier. */
  onPhotoSettled?: () => void;
}

/** CSS 160° → an SVG gradient vector across the unit box. */
const G = { x1: 0.329, y1: 0.03, x2: 0.671, y2: 0.97 };

export function XiOrb({
  size,
  initials,
  photoUrl,
  ring = 'none',
  ringWidth = 0,
  halo = 0,
  onPhotoSettled,
}: XiOrbProps) {
  const [failed, setFailed] = useState(false);
  // ⚠ Unique per instance, as `WashGradient` does: a squad of orbs on one
  // screen must not resolve each other's `url(#…)`.
  const gradient = `xi-orb-${useId().replace(/:/g, '')}`;
  const photo = photoUrl && !failed ? photoUrl : null;
  const ringColor = ring === 'lime' ? Colors.dark.accent : Colors.dark.xiTokenRing;
  const outer = ring === 'none' ? 0 : ringWidth;

  return (
    <View style={{ width: size, height: size }}>
      {halo > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.round,
            {
              left: -(outer + halo),
              top: -(outer + halo),
              width: size + (outer + halo) * 2,
              height: size + (outer + halo) * 2,
              backgroundColor: Colors.dark.xiTokenHalo,
            },
          ]}
        />
      ) : null}
      {outer > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.round,
            {
              left: -outer,
              top: -outer,
              width: size + outer * 2,
              height: size + outer * 2,
              backgroundColor: ringColor,
            },
          ]}
        />
      ) : null}
      <View style={[styles.disc, { width: size, height: size }]}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill} accessible={false}>
          <Defs>
            <LinearGradient id={gradient} x1={G.x1} y1={G.y1} x2={G.x2} y2={G.y2}>
              <Stop offset={0} stopColor={Colors.dark.xiOrbHi} />
              <Stop offset={1} stopColor={Colors.dark.xiOrbLo} />
            </LinearGradient>
          </Defs>
          <Rect width={size} height={size} fill={`url(#${gradient})`} />
        </Svg>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={{ left: '50%', top: '12%' }}
            // ⚠ 0, not a fade: a capture mid-crossfade is a half-faded face.
            transition={0}
            cachePolicy="memory-disk"
            onLoad={onPhotoSettled}
            onError={() => {
              setFailed(true);
              onPhotoSettled?.();
            }}
            accessible={false}
          />
        ) : (
          <RNText
            allowFontScaling={false}
            numberOfLines={1}
            style={[
              styles.initials,
              { fontSize: size * 0.36, lineHeight: size * 0.36 * 1.2 },
            ]}>
            {initials}
          </RNText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  round: { position: 'absolute', borderRadius: Radius.pill },
  disc: {
    borderRadius: Radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: DisplayFont.bold,
    color: Colors.dark.xiOrbInk,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
