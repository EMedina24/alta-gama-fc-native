/**
 * The reel's PINNED, TRANSPARENT crown (ADR 0129): back link, `News` at 300 38,
 * the story count, the league filter pill, and the Saved doorway — over one
 * dark veil that does not scroll with the cards.
 *
 * ⚠ Deliberately NOT `templates/crown.tsx`. That component's contract is the
 * OPPOSITE on every axis: it scrolls away with the page, paints the lime band,
 * and switches to the `onCrown` ink set. Bending it would poison four tabs;
 * this screen owns its own crown.
 *
 * ⚠ `pointerEvents="box-none"` on the container, so swipes over the veil's
 * lower half still reach the cards; only the content block takes touches.
 *
 * ⚠ The veil is `WashGradient` + `ReelVeil` (hex + `stopOpacity`, trap 42) and
 * runs BEHIND the status bar — height is the token plus the inset, the 0094
 * reasoning: a veil that starts below the clock reads as a floating slab.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { BookmarkGlyph, Chevron, Text, WashGradient } from '@/components/atoms';
import { Colors, ReelVeil, Size, Spacing } from '@/constants/theme';

export interface ReelCrownProps {
  /** Names its destination — `copy.today.title` (ADR 0092 §5). */
  backLabel: string;
  title: string;
  /** `7 STORIES` — already phrased and cased by the screen. */
  count: string;
  /** The active league's name, or the ALL label. */
  filterLabel: string;
  filterOpen: boolean;
  /** a11y label for the Saved doorway — `copy.news.savedTitle`. */
  savedLabel: string;
  /** The screen's top safe-area inset. */
  topInset: number;
  onBack: () => void;
  onToggleFilter: () => void;
  onSaved: () => void;
}

export function ReelCrown({
  backLabel,
  title,
  count,
  filterLabel,
  filterOpen,
  savedLabel,
  topInset,
  onBack,
  onToggleFilter,
  onSaved,
}: ReelCrownProps) {
  return (
    <View pointerEvents="box-none" style={styles.crown}>
      <View pointerEvents="none" style={[styles.veil, { height: Size.reelCrown + topInset }]}>
        <WashGradient angle="vertical" stops={ReelVeil} />
      </View>

      <View style={[styles.content, { paddingTop: topInset + Spacing.one }]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text variant="bodyStrong" color="accent">
            {`‹  ${backLabel}`}
          </Text>
        </Pressable>

        <View style={styles.titleRow}>
          <View>
            <Text variant="reelTitle" style={styles.title}>
              {title}
            </Text>
            <Text variant="reelCount" color="reelCountInk" style={styles.count}>
              {count}
            </Text>
          </View>

          <View style={styles.controls}>
            <Pressable
              onPress={onSaved}
              accessibilityRole="button"
              accessibilityLabel={savedLabel}
              style={({ pressed }) => [styles.savedDoor, pressed && styles.pressed]}>
              <BookmarkGlyph />
            </Pressable>
            <Pressable
              onPress={onToggleFilter}
              accessibilityRole="button"
              accessibilityLabel={filterLabel}
              accessibilityState={{ expanded: filterOpen }}
              style={({ pressed }) => [
                styles.filterPill,
                filterOpen && styles.filterPillOpen,
                pressed && styles.pressed,
              ]}>
              <Text variant="reelControl">{filterLabel}</Text>
              <Chevron expanded={filterOpen} color="text" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  crown: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 12 },
  veil: { position: 'absolute', left: 0, right: 0, top: 0 },
  content: { paddingHorizontal: Spacing.five },
  back: { alignSelf: 'flex-start', marginBottom: Spacing.two + Spacing.half },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  title: {
    color: Colors.dark.reelInk,
    textShadowColor: Colors.dark.reelTitleShadow,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 2 },
  },
  count: { marginTop: Spacing.two },
  controls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexShrink: 0 },
  savedDoor: {
    width: Size.reelAction,
    height: Size.reelAction,
    borderRadius: Size.reelAction / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.reelGlass,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.reelGlassLine,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
    height: Size.pill,
    paddingHorizontal: Spacing.three,
    borderRadius: Size.pill / 2,
    backgroundColor: Colors.dark.reelGlass,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.reelGlassLine,
  },
  /** Open state — dc's lime wash + ring; the existing accent tokens carry it. */
  filterPillOpen: {
    backgroundColor: Colors.dark.accentWashStrong,
    borderColor: Colors.dark.accentRing,
  },
  pressed: { opacity: 0.7 },
});
