/**
 * One club: its crest, then its name.
 *
 * ⚠ The point of this shape is CORRESPONDENCE. A match drawn as `⬤ v ⬤` beside
 * two stacked names asks the reader to pair a crest with a name by remembering
 * the order — which is the defect ADR 0158 was written to fix. A crest sitting
 * on its own name needs no pairing at all.
 *
 * ⚠ Promoted out of `finished-today`'s private styles under ADR 0013 once
 * `fixture-list` became the second organism to want it. It stays flat-scalar
 * (ADR 0043): the organism resolves `crestSrc`, `abbreviate` and `displayName`
 * before it renders one of these. Nothing below organisms fetches or derives.
 *
 * ⚠ `lines` defaults to 1 because FINISHED TODAY needs it to: its goal digits
 * are read DOWN the card like a table (ADR 0069), so a row grown by a wrapped
 * name would break that column. The matchday row has no such column and passes
 * `lines={2}`, because a club name that wraps beats one that silently loses its
 * second half — the failure ADR 0029 exists to name.
 *
 * ⚠ `minWidth: 0` on the name is load-bearing. Without it RN refuses to shrink
 * the text and the row overflows its parent instead of wrapping or ellipsing.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Crest, Text, type TypeVariant } from '@/components/atoms';
import { Size, Spacing } from '@/constants/theme';

export interface ClubLineProps {
  /** Already through `crestSrc()`. Null draws the monogram tile. */
  src: string | null;
  /** Already through `abbreviate()` — the 3-letter code the tile shows. */
  fallback: string;
  /** Already through `displayName()`. */
  name: string;
  /** The losing side of a played match — `scoreEmphasis`, ADR 0044. */
  muted?: boolean;
  size?: number;
  variant?: TypeVariant;
  /** `numberOfLines` on the name. See the header before raising it. */
  lines?: number;
  /**
   * Makes the CREST — only the crest — a link to the club (ADR 0191).
   *
   * ⚠ Not the name: on an expandable row the rest of the line is the row's own
   * press target, and a whole-line link would leave nothing to expand with.
   * The organism decides whether the club HAS a page (`useCanOpenClub`) and
   * omits this when it does not — an inert crest, never a dead link.
   */
  onCrestPress?: () => void;
  /** VoiceOver's name for the crest link — "Open Brentford". */
  crestLabel?: string;
}

export function ClubLine({
  src,
  fallback,
  name,
  muted = false,
  size = Size.crestRow,
  variant = 'bodyStrong',
  lines = 1,
  onCrestPress,
  crestLabel,
}: ClubLineProps) {
  const crest = <Crest src={src} fallback={fallback} size={size} />;
  /** Grows the drawn crest's target to `minTouch` without resizing it (SPEC §2). */
  const slop = Math.max(0, (Size.minTouch - size) / 2);
  return (
    <View style={styles.line}>
      {onCrestPress ? (
        <Pressable
          onPress={onCrestPress}
          hitSlop={slop}
          accessibilityRole="link"
          accessibilityLabel={crestLabel}
          style={({ pressed }) => pressed && styles.crestPressed}>
          {crest}
        </Pressable>
      ) : (
        crest
      )}
      <Text
        variant={variant}
        color={muted ? 'textDim' : 'text'}
        numberOfLines={lines}
        style={styles.name}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  /** Scale, not opacity — a faded crest on a dimmed losing line would vanish. */
  crestPressed: { transform: [{ scale: 0.9 }] },
  name: { flex: 1, minWidth: 0 },
});
