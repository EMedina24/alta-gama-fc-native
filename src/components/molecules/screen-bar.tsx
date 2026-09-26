/**
 * A pushed screen's top bar (ADR 0208) — the Medina kit's: a glass back circle
 * on the left, the screen's name centred, and an empty 44pt box on the right so
 * the title is centred on the SCREEN rather than on the space left of nothing.
 *
 * ⚠ Scrolls with the content, like the club page's hero bar — it is not a
 * native header. The screen pads it below the status bar itself.
 *
 * ⚠ The back circle is `GlassIconButton`, so the rules of glass apply to this
 * bar's ancestors too: no opacity, no scale (0120/0122).
 */
import { StyleSheet, View } from 'react-native';

import { Chevron, GlassIconButton, Text } from '@/components/atoms';
import { Size, Spacing } from '@/constants/theme';

export interface ScreenBarProps {
  title: string;
  onBack: () => void;
  /** The back circle's name for VoiceOver — the chevron is not a readable one. */
  backLabel: string;
}

export function ScreenBar({ title, onBack, backLabel }: ScreenBarProps) {
  return (
    <View style={styles.bar}>
      <GlassIconButton onPress={onBack} accessibilityLabel={backLabel}>
        <Chevron direction="left" color="text" />
      </GlassIconButton>
      <Text variant="headline" numberOfLines={1} accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {/* Balances the back circle — see the header. */}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Size.glassIcon,
  },
  title: { flex: 1, textAlign: 'center' },
  spacer: { width: Size.glassIcon },
});
