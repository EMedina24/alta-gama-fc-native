/**
 * The save/share circles at a reel card's foot (ADR 0129).
 *
 * ⚠ `Size.reelAction` is 44 — equal to `Size.minTouch`, and the spec calls it
 * the minimum hit target; the handoff's RN reference drew 40 and that was the
 * drift, not the design.
 * ⚠ Flat `reelGlass` fills over the photo (trap 59) — see `reel-meta-chip.tsx`.
 * ⚠ Saved state: `savedFill` plate, `accent` ring, `onAccent` ink — the
 * bookmark itself fills (`BookmarkGlyph saved`).
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { BookmarkGlyph, ShareGlyph } from '@/components/atoms';
import { Colors, Size, Spacing } from '@/constants/theme';

export interface ReelActionsProps {
  saved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  /** a11y labels — `copy.news.saveStory` / `savedStory` / `share`. */
  saveLabel: string;
  savedLabel: string;
  shareLabel: string;
}

export function ReelActions({
  saved,
  onToggleSave,
  onShare,
  saveLabel,
  savedLabel,
  shareLabel,
}: ReelActionsProps) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggleSave}
        accessibilityRole="button"
        accessibilityLabel={saved ? savedLabel : saveLabel}
        accessibilityState={{ selected: saved }}
        style={({ pressed }) => [styles.circle, saved && styles.circleOn, pressed && styles.pressed]}>
        <BookmarkGlyph saved={saved} />
      </Pressable>
      <Pressable
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel={shareLabel}
        style={({ pressed }) => [styles.circle, pressed && styles.pressed]}>
        <ShareGlyph />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  circle: {
    width: Size.reelAction,
    height: Size.reelAction,
    borderRadius: Size.reelAction / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.reelGlass,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.reelGlassLine,
  },
  circleOn: {
    backgroundColor: Colors.dark.savedFill,
    borderColor: Colors.dark.accent,
  },
  pressed: { opacity: 0.7 },
});
