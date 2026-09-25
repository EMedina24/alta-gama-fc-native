/**
 * The Board background picker (ADR 0175): the brand default, every catalogue
 * league, and every catalogue club grouped by league — each row a mini crown
 * swatch of exactly what it paints.
 *
 * ⚠ Picking CLOSES the sheet (ADR 0183, reversing 0175's stay-open clause) —
 * the route writes the store first, so the recolour is what the dismissal
 * reveals. Since ADR 0199 this is the full catalogue behind the edit panel's
 * "More" tile.
 * ⚠ A `ScrollView` with padded content, `stickyHeaderIndices` for the bar —
 * `account-sheet`'s proven formSheet shape. Never `flex: 1` in here: inside a
 * `formSheet` it collapses to zero (trap 19).
 *
 * ⚠ Presentational (ADR 0013): the route resolves queries into plain rows.
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Crest, SHEET_GROUND, Skeleton, Text } from '@/components/atoms';
import { CrownSwatch, SectionHeader } from '@/components/molecules';
import { BoardBg, Colors, Radius, Size, Spacing } from '@/constants/theme';
import type { CrownStop } from '@/lib/cronogol/league-theme';

export interface BackgroundOption {
  /** The encoded pick — `'default'`, `'league:{slug}'`, `'club:{slug}'`. */
  id: string;
  label: string;
  /** The choice's ramp, drawn as the row's swatch. */
  stops: readonly CrownStop[];
  /** Club rows only — the crest beside the name. */
  crest?: string | null;
  /** The `Crest` fallback code for a club with no artwork. */
  crestFallback?: string;
  selected: boolean;
}

export interface BackgroundSection {
  /** The league's name, as the group heading. */
  title: string;
  league: BackgroundOption;
  clubs: readonly BackgroundOption[];
  /** The roster query is still out — skeletons under the league row. */
  pending: boolean;
}

export interface BoardBackgroundSheetProps {
  title: string;
  defaultOption: BackgroundOption;
  sections: readonly BackgroundSection[];
  closeLabel: string;
  onPick: (id: string) => void;
  onClose: () => void;
}

export function BoardBackgroundSheet({
  title,
  defaultOption,
  sections,
  closeLabel,
  onPick,
  onClose,
}: BoardBackgroundSheetProps) {
  return (
    <ScrollView contentContainerStyle={styles.wrap} stickyHeaderIndices={[0]}>
      {/* ⚠ TWO views deep, `account-sheet`'s finding: RN hoists a sticky
          child's style onto its own wrapper, so `bar` is what gets hoisted and
          `barRow` is the layout that survives. Flatten this and the row
          renders as a column. */}
      <View style={styles.bar}>
        <View style={styles.barRow}>
          <Text variant="callout" color="textSecondary">
            {title}
          </Text>
          <Button label={closeLabel} tone="quiet" full={false} onPress={onClose} />
        </View>
      </View>

      <OptionRow option={defaultOption} onPick={onPick} />

      {sections.map((section) => (
        <View key={section.league.id} style={styles.section}>
          <SectionHeader title={section.title} />
          <OptionRow option={section.league} onPick={onPick} />
          {section.pending
            ? Array.from({ length: PENDING_ROWS }, (_, i) => (
                <View key={i} style={styles.skeletonRow}>
                  <Skeleton width={BoardBg.swatchW} height={BoardBg.swatchH} />
                  <Skeleton width={140} />
                </View>
              ))
            : section.clubs.map((club) => (
                <OptionRow key={club.id} option={club} onPick={onPick} />
              ))}
        </View>
      ))}
    </ScrollView>
  );
}

function OptionRow({
  option,
  onPick,
}: {
  option: BackgroundOption;
  onPick: (id: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onPick(option.id)}
      accessibilityRole="button"
      accessibilityLabel={option.label}
      accessibilityState={{ selected: option.selected }}
      style={({ pressed }) => [
        styles.row,
        option.selected && styles.rowOn,
        pressed && styles.pressed,
      ]}>
      <CrownSwatch stops={option.stops} />
      {option.crestFallback !== undefined ? (
        <Crest src={option.crest} fallback={option.crestFallback} size={BoardBg.crest} />
      ) : null}
      <Text
        variant="bodyStrong"
        color={option.selected ? 'accent' : 'text'}
        numberOfLines={1}
        style={styles.label}>
        {option.label}
      </Text>
    </Pressable>
  );
}

/** Enough skeletons to say "a roster is coming", not to fake its length. */
const PENDING_ROWS = 4;

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.seven,
    gap: Spacing.three,
  },
  /**
   * Sticky, so the way out never scrolls away. Opaque on the sheet's own
   * ground (ADR 0093) — a transparent bar would ghost rows through it.
   * Full-bleed out of the gutter so no row shows past its sides.
   */
  bar: { marginHorizontal: -Spacing.five, backgroundColor: SHEET_GROUND },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // The right gutter is the Button's own padding, account-sheet's rule.
    paddingLeft: Spacing.five,
    paddingRight: Spacing.one,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.two,
  },
  section: { gap: Spacing.three, marginTop: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    minHeight: Size.minTouch,
    borderRadius: Radius.tile,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
  },
  // The accent frame is the selection language (`xi-look`'s rule): one lime
  // ring on the active choice, nothing else lime in the list.
  rowOn: { borderColor: Colors.dark.accent },
  pressed: { opacity: 0.7 },
  label: { flex: 1, minWidth: 0 },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    minHeight: Size.minTouch,
  },
});
