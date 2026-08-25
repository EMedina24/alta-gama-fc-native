/**
 * The band legend.
 *
 * ⚠ Shows only the bands actually PRESENT in this table (`usedZones`), so it can
 * never caption a colour nobody can see — and it is suppressed entirely, along
 * with every rail, when `bandsApply` is false.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { ZoneKind } from '@/lib/cronogol/leagues';

const BAND: Record<ZoneKind, string> = {
  ucl: Colors.dark.bandUcl,
  uel: Colors.dark.bandUel,
  conf: Colors.dark.bandConf,
  rel: Colors.dark.bandRel,
};

export function Legend({
  zones,
  labels,
}: {
  zones: readonly ZoneKind[];
  labels: Record<ZoneKind, string>;
}) {
  if (zones.length === 0) return null;
  return (
    <View style={styles.legend}>
      {zones.map((zone) => (
        <View key={zone} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: BAND[zone] }]} />
          <Text variant="micro" color="textFaint">
            {labels[zone]}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
    paddingHorizontal: Spacing.five,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  swatch: { width: 3, height: 14, borderRadius: Radius.rail },
});
