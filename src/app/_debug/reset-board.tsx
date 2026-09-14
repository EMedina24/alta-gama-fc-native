/** Dev tool: put the Board back to its shipped layout (ADR 0174), so the default
 *  order and the default hidden set can be checked without removing every card
 *  by hand. Pairs with `?boardEdit=1` on the Today route, which opens straight
 *  into edit mode.
 *
 *  ⚠ A BUTTON, not an effect-on-mount like `skip-onboarding.tsx`. Two reasons:
 *  writing from an effect is the `set-state-in-effect` lint error this repo
 *  carries several of and does not need another of, and this one destroys
 *  something — a deep link that silently wiped an arrangement mid-check would
 *  be its own bug. */
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { Colors, Spacing } from '@/constants/theme';
import { resetBoardLayout } from '@/store/preferences';

export default function ResetBoard() {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <Text variant="title3">Board layout</Text>
      <Text variant="body" color="textDim">
        Restores the default card order and the default hidden set.
      </Text>
      <Button
        label="Reset to default layout"
        onPress={() => {
          resetBoardLayout();
          router.replace('/');
        }}
      />
      <Button label="Back" tone="quiet" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
    backgroundColor: Colors.dark.background,
  },
});
