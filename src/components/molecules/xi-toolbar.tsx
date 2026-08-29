/**
 * Shape · Look · Auto fill · Clear (ADR 0065).
 *
 * The formation tile is wide and carries the current shape; the other three
 * are `minTouch` squares with a drawn glyph — there is no icon set in this
 * app, so the glyphs are transcribed from the handoff's SVGs.
 *
 * ⚠ Accent budget: the pitch's filled tokens are the screen's lime, so these
 * tiles are `card` with accent INK only. Clear is `clearInk` — a destructive
 * action that must not shout next to the lime it sits beside.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface XiToolbarProps {
  formation: string;
  labels: { shape: string; look: string; autoFill: string; clear: string };
  onShape: () => void;
  onLook: () => void;
  onAutoFill: () => void;
  onClear: () => void;
}

export function XiToolbar({ formation, labels, onShape, onLook, onAutoFill, onClear }: XiToolbarProps) {
  const n = Size.xiToolIcon;
  return (
    <View style={styles.row}>
      <Tile onPress={onShape} label={`${labels.shape} ${formation}`} wide>
        <Text variant="xiToolbarLabel" color="textMuted">
          {labels.shape}
        </Text>
        <Text variant="callout" tabular>
          {formation}
        </Text>
      </Tile>
      <Tile onPress={onLook} label={labels.look}>
        <Svg width={n} height={n} viewBox="0 0 20 20" accessible={false}>
          <Rect x={2.5} y={3.5} width={15} height={13} rx={2.5} stroke={Colors.dark.accent} strokeWidth={1.7} fill="none" />
          <Path d="M2.5 10h15M10 3.5v13" stroke={Colors.dark.accent} strokeWidth={1.7} strokeLinecap="round" />
        </Svg>
      </Tile>
      <Tile onPress={onAutoFill} label={labels.autoFill}>
        <Svg width={n} height={n} viewBox="0 0 20 20" accessible={false}>
          <Path
            d="M10 2.5l1.9 4.1 4.6.5-3.4 3.1.9 4.4L10 12.6l-4 2 .9-4.4L3.5 7.1l4.6-.5z"
            stroke={Colors.dark.accent}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Tile>
      <Tile onPress={onClear} label={labels.clear}>
        <Svg width={n} height={n} viewBox="0 0 20 20" accessible={false}>
          <Path
            d="M4 6h12M8 6V4.5h4V6M6.5 6l.7 9.5h5.6L13.5 6"
            stroke={Colors.dark.clearInk}
            strokeWidth={1.7}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Tile>
    </View>
  );
}

function Tile({
  onPress,
  label,
  wide = false,
  children,
}: {
  onPress: () => void;
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, wide && styles.wide, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  tile: {
    width: Size.minTouch,
    height: Size.minTouch,
    borderRadius: Radius.control,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two - 1,
  },
  wide: { flex: 1, width: undefined },
  pressed: { backgroundColor: Colors.dark.rowActive },
});
