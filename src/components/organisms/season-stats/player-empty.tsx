/**
 * The Players view when the chosen player has no block for this season.
 *
 * ⚠ **It keeps the identity strip and the Change chip.** A bare "no stats yet"
 * sentence strands the reader: every goalkeeper and most substitutes answer
 * `seasons: []` — a real, permanent answer for someone who has not scored or
 * been booked — and without the chip the only way out is back through the
 * segmented control. The way to read about a different player has to be on the
 * screen that says there is nothing to read.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { PlayerPhoto, Text } from '@/components/atoms';
import { Tray } from '@/components/molecules';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Copy } from '@/lib/i18n/copy';
import type { SquadPlayerView } from '@/lib/cronogol/types';

export interface PlayerEmptyProps {
  name: string;
  squad: SquadPlayerView | null;
  positionLabel: string | null;
  copy: Copy['stats'];
  wash?: string | null;
  onChangePlayer: () => void;
}

export function PlayerEmpty({
  name,
  squad,
  positionLabel,
  copy,
  wash = null,
  onChangePlayer,
}: PlayerEmptyProps) {
  return (
    <Tray>
      <View style={styles.body}>
        {wash ? <View style={[styles.wash, { backgroundColor: wash }]} /> : null}
        <View style={styles.row}>
          <PlayerPhoto src={squad?.photoUrl ?? null} variant="hero" />
          <View style={styles.names}>
            {positionLabel ? (
              <Text variant="eyebrowSm" color="textDim" numberOfLines={1}>
                {positionLabel}
              </Text>
            ) : null}
            <Text variant="title3" numberOfLines={2}>
              {name}
            </Text>
          </View>
          <Pressable
            onPress={onChangePlayer}
            accessibilityRole="button"
            accessibilityLabel={copy.change}
            hitSlop={{ top: 7, bottom: 7, left: 8, right: 8 }}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
            <Text variant="eyebrowSm" color="accent">
              {copy.change}
            </Text>
          </Pressable>
        </View>
        <Text variant="body" color="textSecondary">
          {copy.empty}
        </Text>
      </View>
    </Tray>
  );
}

const styles = StyleSheet.create({
  body: { padding: Spacing.four, gap: Spacing.four, position: 'relative' },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  names: { flex: 1, minWidth: 0, gap: Spacing.half },
  chip: {
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.seg,
    backgroundColor: Colors.dark.accentWash,
  },
  chipPressed: { opacity: 0.7 },
});
