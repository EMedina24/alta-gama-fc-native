/**
 * A club crest, falling back to a bordered monogram tile.
 *
 * ⚠ PORTED FROM `cronogol/ui/molecules/crest.tsx` + `ui/atoms/monogram.tsx`
 * (ADR 0018), collapsed into one atom and re-scaled to the native `Size` tokens.
 *
 * The abbreviation tile is **part of the design, not a failure state**: LaLiga is
 * the only league with full crest coverage, so everything else renders as a tile
 * by default. Never invent artwork for a club that has none.
 *
 * Two different fallback sources feed this, and they are not interchangeable:
 * `abbreviate(name, slug, shortName)` for clubs from our own API, and
 * `scoreAbbr(team)` for the scoreboard's — which shares no identifier with us,
 * so it gets no slug and caps at four characters.
 *
 * The web version needed a `useEffect` checking `naturalWidth === 0` because a
 * server-rendered `<img>` could fail before React hydrated. That is an SSR
 * artefact with no counterpart here; `onError` is sufficient.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from './text';
import { Colors, Radius } from '@/constants/theme';

export interface CrestProps {
  /** `null` renders the fallback immediately, with no image request. */
  src?: string | null;
  /** Normally a 3-letter code. Shown when `src` is null or the image fails. */
  fallback: string;
  size: number;
  /** Dressing for the FALLBACK only — the artwork itself is never framed. */
  tone?: 'default' | 'accent' | 'faint';
  filled?: boolean;
}

/**
 * ⚠ The code is sized off the TILE, not off the type scale.
 *
 * A three-letter code at the `micro` step is ~24pt wide, which does not fit a
 * 26pt row tile once the border is taken off — `OSA` rendered as `O…`. The ramp
 * below plus `adjustsFontSizeToFit` is what guarantees three characters always
 * fit, at every size the design uses (26 / 30 / 40 / 58).
 */
function codeSize(tile: number): number {
  if (tile <= 26) return 9;
  if (tile <= 30) return 10;
  if (tile <= 40) return 12.5;
  return 16;
}

export function Crest({ src, fallback, size, tone = 'default', filled = false }: CrestProps) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };

  if (!src || failed) {
    return (
      <View
        style={[
          styles.tile,
          box,
          { borderRadius: size <= 30 ? Radius.chipSm : Radius.chip },
          filled && styles.filled,
          tone === 'accent' && styles.accent,
        ]}>
        <Text
          color={tone === 'accent' ? 'accent' : tone === 'faint' ? 'textFaint' : 'textSecondary'}
          style={[styles.code, { fontSize: codeSize(size) }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}>
          {fallback}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: src }}
      style={box}
      contentFit="contain"
      transition={120}
      onError={() => setFailed(true)}
      // The club name carries the label; the artwork is decorative (SPEC).
      accessible={false}
    />
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.hairlineStrong,
  },
  filled: { backgroundColor: Colors.dark.raised },
  accent: { borderColor: Colors.dark.accentRing },
  code: { fontWeight: '800', letterSpacing: 0, textAlign: 'center' },
});
