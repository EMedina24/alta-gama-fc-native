/**
 * The sheet grabber.
 *
 * ⚠ Only for a sheet presented without the native one. `expo-router`'s
 * `formSheet` presentation draws its own via `sheetGrabberVisible`; drawing both
 * gives you two.
 */
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export function Grabber() {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: Spacing.two },
  bar: {
    width: Size.sheetGrabber,
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.hairlineStrong,
  },
});
