/**
 * The Board editor's bottom panel (ADR 0199) — the Medina kit's floating glass
 * panel: the BACKGROUND tiles with a Reset beside the heading, and the hidden
 * cards as chips that put each one back.
 *
 * It replaces three pieces of 0174/0175: the Background row, the add tray and
 * (for the common picks) the background sheet, which now sits behind the
 * row's "More" tile as the full catalogue.
 *
 * ⚠ Painted OVER the page through the scaffold's overlay slot (ADR 0163), not
 * in the scroll: it floats while the cards scroll under it, which is also what
 * gives its glass something to refract (a blur over plain ground is a hole).
 * The stack pads its end by `onHeight`, so the last card can clear it.
 *
 * ⚠ Reset restores the order, the hidden set AND the background (Ed's call —
 * the kit's scope, wider than 0174's layout-only button). Immediate, no
 * confirm: every piece is one tap to change back.
 *
 * ⚠ The grabber is DECORATION, the kit's: the panel does not resize or
 * dismiss. DONE, in the crown, is the only way out of the mode.
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface, Grabber, PlusGlyph, Text } from '@/components/atoms';
import { SceneTile, type SceneTileProps } from '@/components/molecules';
import { BoardEdit, Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface EditPanelTile extends SceneTileProps {
  key: string;
}

export interface EditPanelProps {
  title: string;
  resetLabel: string;
  resetAccessibilityLabel: string;
  tiles: readonly EditPanelTile[];
  hiddenTitle: string;
  /** The put-away cards, in their remembered order. Empty hides the section. */
  hidden: readonly { id: string; label: string; accessibilityLabel: string }[];
  onAdd: (id: string) => void;
  onReset: () => void;
  /** The panel's height, for the stack's end padding and the drag's edge band. */
  onHeight: (height: number) => void;
}

export function EditPanel({
  title,
  resetLabel,
  resetAccessibilityLabel,
  tiles,
  hiddenTitle,
  hidden,
  onAdd,
  onReset,
  onHeight,
}: EditPanelProps) {
  const insets = useSafeAreaInsets();
  /**
   * The strip OPENS on the current pick — a club chosen from the full sheet
   * can sit several tiles in, and a selection scrolled off the panel is a
   * selection the reader cannot see. ⚠ `contentOffset` is read at mount only,
   * which is the point: a tap mid-strip must not yank it back.
   */
  const picked = Math.max(0, tiles.findIndex((tile) => tile.selected));
  const pitch = BoardEdit.tileW + Spacing.three + Spacing.two;
  const openAt = Math.max(0, picked * pitch - Spacing.seven);

  return (
    <View
      style={[styles.panel, { paddingBottom: Math.max(insets.bottom, Spacing.five) }]}
      onLayout={(e) => onHeight(e.nativeEvent.layout.height + Spacing.two)}>
      <GlassSurface style={styles.shell} flatStyle={styles.flat} glass="regular" />
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Grabber />
      </View>

      <View style={styles.head}>
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
        <Pressable
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel={resetAccessibilityLabel}
          hitSlop={Spacing.three}
          style={({ pressed }) => pressed && styles.pressed}>
          <Text variant="callout" color="textSecondary">
            {resetLabel}
          </Text>
        </Pressable>
      </View>

      {/* ⚠ Bleeds to the panel's inner edge so a tile scrolls off it, not off
          a gutter — the row reads as a strip, the kit's. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: openAt, y: 0 }}
        style={styles.strip}
        contentContainerStyle={styles.tiles}>
        {tiles.map(({ key, ...tile }) => (
          <SceneTile key={key} {...tile} />
        ))}
      </ScrollView>

      {hidden.length > 0 ? (
        <View style={styles.hidden}>
          <Text variant="eyebrowSm" color="textMuted">
            {hiddenTitle}
          </Text>
          <View style={styles.chips}>
            {hidden.map((card) => (
              <Pressable
                key={card.id}
                onPress={() => onAdd(card.id)}
                accessibilityRole="button"
                accessibilityLabel={card.accessibilityLabel}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
                {/* ⚠ `text`, not the glyph's lime default: this chip is
                    neutral, and the screen's one lime is DONE. */}
                <PlusGlyph color="text" />
                <Text variant="caption">{card.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    bottom: Spacing.two,
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  shell: {
    ...StyleSheet.absoluteFill,
    borderRadius: BoardEdit.panelRadius,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
  },
  flat: { backgroundColor: BoardEdit.panelFill },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { opacity: 0.6 },
  strip: { marginHorizontal: -Spacing.five },
  tiles: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  hidden: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two - 2,
    paddingVertical: Spacing.two - 1,
    paddingLeft: Spacing.two + 1,
    paddingRight: Spacing.three,
    borderRadius: Radius.chip,
    backgroundColor: Colors.dark.glassFill,
    minHeight: Size.pill,
  },
});
