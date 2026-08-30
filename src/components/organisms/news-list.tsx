/**
 * The News screen's body: filter chips, day groups, the attribution line at
 * the end (ADR 0064) — and, since ADR 0070, the first group is a FRONT PAGE:
 * a lead, up to two tiles, then rows. Every later group is rows.
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

import { ChipButton, Pill, Skeleton, SkeletonRows, Text } from '@/components/atoms';
import {
  NewsLead,
  NewsRow,
  NewsTile,
  SectionHeader,
  type NewsLeadProps,
  type NewsRowProps,
  type NewsTileProps,
} from '@/components/molecules';
import { Radius, Size, Spacing } from '@/constants/theme';

export interface NewsChip {
  id: string;
  label: string;
}

export interface NewsGroup {
  /** `TODAY` / `YESTERDAY` / a date — resolved by the screen. */
  label: string;
  /** `3 STORIES`. */
  count: string;
  /** The front page — set on the first group only. */
  lead?: (NewsLeadProps & { key: string }) | null;
  tiles?: readonly (NewsTileProps & { key: string })[];
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

const omitKey = ({ key: _key, ...rest }: NewsLeadProps & { key: string }): NewsLeadProps => rest;

/** The lead's loading height at the screen's content width — 393 − 2 × 20. */
const LEAD_SKELETON = Math.round((393 - Spacing.five * 2) / Size.newsLeadRatio);

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
            onPress={() => onChip(chip.id)}
          />
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.group}>
          <Skeleton height={LEAD_SKELETON} radius={Radius.card} />
          <SkeletonRows count={4} height={Size.newsCardRow + Spacing.three * 2} />
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
            {/* ⚠ `key` is stripped before the spread — React warns on a
                spread that carries one, and the lead needs no key: one per group. */}
            {group.lead ? <NewsLead {...omitKey(group.lead)} /> : null}
            {group.tiles && group.tiles.length > 0 ? (
              <View style={styles.tiles}>
                {group.tiles.map(({ key, ...tile }) => (
                  <NewsTile key={key} {...tile} wide={group.tiles!.length === 1} />
                ))}
              </View>
            ) : null}
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
