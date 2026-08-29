/**
 * The News screen's body: filter chips, day groups of rows, the attribution
 * line at the end (ADR 0064).
 *
 * ⚠ The chips stay visible over an EMPTY list. A reader who picked a league
 * that is quiet must be able to pick another; hiding the rail with the rows
 * leaves them a dead screen (handoff empty-state rule).
 *
 * ⚠ Attribution is not a footnote to trim: publisher on every row and the
 * aggregation line here are what make collecting third-party headlines
 * defensible.
 */
import { ScrollView, StyleSheet, View } from 'react-native';

import { ChipButton, SkeletonRows, Text } from '@/components/atoms';
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
  rows: readonly (NewsRowProps & { key: string })[];
}

export interface NewsListProps {
  chips: readonly NewsChip[];
  activeChip: string;
  onChip: (id: string) => void;
  groups: readonly NewsGroup[];
  loading: boolean;
  copy: { quiet: string; attribution: string };
}

export function NewsList({ chips, activeChip, onChip, groups, loading, copy }: NewsListProps) {
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
            onPress={() => onChip(chip.id)}
          />
        ))}
      </ScrollView>

      {loading ? (
        <SkeletonRows count={6} height={Size.newsThumb + Spacing.three * 2} />
      ) : groups.length === 0 ? (
        <Text variant="body" color="textDim">
          {copy.quiet}
        </Text>
      ) : (
        groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <SectionHeader title={group.label} meta={group.count} />
            <View style={styles.rows}>
              {group.rows.map(({ key, ...row }) => (
                <NewsRow key={key} {...row} />
              ))}
            </View>
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
  rows: { gap: Spacing.two },
});
