/**
 * Modal sheets.
 *
 * ⚠ `presentation: 'formSheet'` is the native iOS sheet via react-native-screens —
 * no bottom-sheet library needed, and `sheetGrabberVisible` draws the grabber, so
 * the `Grabber` atom is only for a surface that is NOT presented this way.
 * Drawing both gives you two.
 *
 * ⚠ Sheets live outside `(tabs)/` so they present over the tab bar rather than
 * inside a tab's stack.
 */
import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function SheetsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'formSheet',
        headerShown: false,
        sheetGrabberVisible: true,
        sheetAllowedDetents: [0.6, 1],
        contentStyle: { backgroundColor: Colors.dark.card },
      }}
    />
  );
}
