/**
 * A player's shirt number on the shoulder of his orb (ADR 0213).
 *
 * ⚠ A null shirt draws NOTHING — not `0`, not `—`. A squad number nobody has
 * been given is not the number zero; the orb's initials already name him.
 * The caller decides that by not rendering this.
 *
 * Saira, like every number in the app (ADR 0194).
 */
import { StyleSheet, Text as RNText, View } from 'react-native';

import { Colors, DisplayFont, Radius } from '@/constants/theme';

export interface ShirtBadgeProps {
  shirt: number;
  /** Disc diameter, points. */
  size: number;
  /** Ring width, points. */
  ring: number;
}

export function ShirtBadge({ shirt, size, ring }: ShirtBadgeProps) {
  const font = size * 0.525;
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderWidth: ring },
      ]}>
      <RNText
        allowFontScaling={false}
        numberOfLines={1}
        style={[styles.num, { fontSize: font, lineHeight: font * 1.2 }]}>
        {shirt}
      </RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.xiBadge,
    borderColor: Colors.dark.xiBadgeRing,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontFamily: DisplayFont.bold,
    color: Colors.dark.text,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
