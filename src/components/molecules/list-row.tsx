/** crest · title · subtitle · trailing slot — the generic list line. */
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Crest, Text } from '@/components/atoms';
import { Colors, Size, Spacing } from '@/constants/theme';

export interface ListRowProps {
  title: string;
  subtitle?: string | null;
  crest?: string | null;
  /** The monogram shown when there is no crest. */
  abbr: string;
  crestSize?: number;
  trailing?: ReactNode;
  onPress?: () => void;
  /** A followed club's row takes the `rowActive` ground. */
  active?: boolean;
}

export function ListRow({
  title,
  subtitle,
  crest,
  abbr,
  crestSize = Size.crestList,
  trailing,
  onPress,
  active = false,
}: ListRowProps) {
  const body = (
    <View style={[styles.row, active && styles.active]}>
      <Crest src={crest} fallback={abbr} size={crestSize} filled={!crest} />
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="textDim" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Size.minTouch + Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  active: { backgroundColor: Colors.dark.rowActive },
  text: { flex: 1, gap: Spacing.half, minWidth: 0 },
});
