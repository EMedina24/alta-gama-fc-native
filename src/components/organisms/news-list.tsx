/**
 * The News screen's body: filter chips, day groups of uniform glass story
 * cards, and the attribution line at the end (ADR 0064/0092).
 *
 * ⚠ The FRONT PAGE is gone (0070 reversed by 0092): no lead, no tiles. Every
 * story in a group is one card of one weight, and the screen maps the WHOLE
 * group — nothing may be filtered out on the way in.
 *
 * ⚠ The chips stay visible over an EMPTY list. A reader who picked a league
 * that is quiet must be able to pick another; hiding the rail with the rows
 * leaves them a dead screen (handoff empty-state rule).
 *
 * ⚠ Attribution is not a footnote to trim: publisher on every row and the
 * aggregation line here are what make collecting third-party headlines
 * defensible.
 *
 * ⚠ The `N NEW` pill goes on the FIRST group's header only, whatever day that
 * group is. It is the screen's count, not the day's.
 */
import { ScrollView, StyleSheet, View } from 'react-native';

import { ChipButton, Pill, SkeletonRows, Text } from '@/components/atoms';
import { NewsRow, SectionHeader, type NewsRowProps } from '@/components/molecules';
import { Size, Spacing } from '@/constants/theme';

export interface NewsChip {
  id: string;
  label: string;
}

export interface NewsGroup {
  /** `TODAY` / `YESTERDAY` / a date — resolved by the screen. */
  label: string;
  /** `3 STORIES`. */
  count: string;
  /** Every story in the group, one card each (ADR 0092). */
  rows: readonly (NewsRowProps & { key: string })[];
}

export interface NewsListProps {
  chips: readonly NewsChip[];
  activeChip: string;
  onChip: (id: string) => void;
  groups: readonly NewsGroup[];
  loading: boolean;
  /** `6 NEW`, or null — drawn on the first group's header. */
  newLabel: string | null;
  copy: { quiet: string; attribution: string };
}

export function NewsList({ chips, activeChip, onChip, groups, loading, newLabel, copy }: NewsListProps) {
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        style={styles.railWrap}>
        {chips.map((chip) => (
          <ChipButton
            key={chip.id}
            label={chip.label}
            active={chip.id === activeChip}
            // ⚠ Neutral when unselected: a rail of lime rings read as every
            // league being on at once (ADR 0092).
            tone="neutral"
            onPress={() => onChip(chip.id)}
          />
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.group}>
          <SkeletonRows count={5} height={Size.newsStoryThumb + Spacing.three * 2} />
        </View>
      ) : groups.length === 0 ? (
        <Text variant="body" color="textDim">
          {copy.quiet}
        </Text>
      ) : (
        groups.map((group, index) => (
          <View key={group.label} style={styles.group}>
            <SectionHeader
              title={group.label}
              meta={group.count}
              accessory={index === 0 && newLabel ? <Pill label={newLabel} tone="accent" /> : null}
            />
            {group.rows.length > 0 ? (
              <View style={styles.rows}>
                {group.rows.map(({ key, ...row }) => (
                  <NewsRow key={key} {...row} />
                ))}
              </View>
            ) : null}
          </View>
        ))
      )}

      <Text variant="footnote" color="textFaint">
        {copy.attribution}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  // Bleeds to the screen edge so the last chip scrolls out under the gutter.
  railWrap: { marginHorizontal: -Spacing.five },
  rail: { paddingHorizontal: Spacing.five, gap: Spacing.two },
  group: { gap: Spacing.three },
  tiles: { flexDirection: 'row', gap: Spacing.three },
  /** Hairline rows carry their own top rule — no gap between them. */
  rows: { gap: 0 },
});
