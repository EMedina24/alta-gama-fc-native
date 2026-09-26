/**
 * The Starting XI player picker (ADR 0214): search, a band filter that opens
 * on the tapped slot's own band, and the squad grouped by band.
 *
 * ⚠ Opens on the SLOT's band (a tap on LCB shows defenders), with All one tap
 * away — the handoff's rule. The bench opens on All.
 *
 * ⚠ A formSheet: no `flex: 1` anywhere (it collapses to zero inside one,
 * trap 19), and the head is pinned by `stickyHeaderIndices`.
 *
 * Fetches nothing; the route hands it rows.
 */
import { ScrollView, StyleSheet, View } from 'react-native';

import { SHEET_GROUND, Text } from '@/components/atoms';
import { SearchField, SegmentedControl } from '@/components/molecules';
import { SheetClose } from '@/components/molecules/sheet-close';
import { XiPlayerRow, type XiPlayerRowProps } from '@/components/molecules/xi-player-row';
import { Spacing } from '@/constants/theme';

export type PickerBand = 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD';

export interface PickerSection {
  key: string;
  title: string;
  rows: (Omit<XiPlayerRowProps, 'onPress'> & { id: string })[];
}

export interface XiPickerSheetProps {
  title: string;
  caption: string | null;
  query: string;
  onQuery: (query: string) => void;
  searchPlaceholder: string;
  band: PickerBand;
  bands: readonly { value: PickerBand; label: string }[];
  onBand: (band: PickerBand) => void;
  sections: readonly PickerSection[];
  empty: string;
  onPick: (id: string) => void;
  onClose: () => void;
  closeLabel: string;
}

export function XiPickerSheet(props: XiPickerSheetProps) {
  const { sections } = props;
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      stickyHeaderIndices={[0]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <Text variant="headline" numberOfLines={1} style={styles.title}>
            {props.title}
          </Text>
          {props.caption ? (
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {props.caption}
            </Text>
          ) : null}
          <SheetClose onPress={props.onClose} accessibilityLabel={props.closeLabel} />
        </View>
        <SearchField value={props.query} onChangeText={props.onQuery} placeholder={props.searchPlaceholder} />
        <SegmentedControl<PickerBand> options={props.bands} value={props.band} onChange={props.onBand} />
      </View>
      {sections.length === 0 ? (
        <Text variant="body" color="textSecondary" style={styles.empty}>
          {props.empty}
        </Text>
      ) : (
        sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text variant="eyebrowSm" color="textMuted" style={styles.eyebrow}>
              {section.title}
            </Text>
            {section.rows.map(({ id, ...row }) => (
              <XiPlayerRow key={id} {...row} onPress={() => props.onPick(id)} />
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.seven },
  head: {
    backgroundColor: SHEET_GROUND,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { flex: 1, minWidth: 0 },
  section: { paddingTop: Spacing.three },
  eyebrow: { paddingHorizontal: Spacing.two, paddingBottom: Spacing.one },
  empty: { paddingTop: Spacing.five, textAlign: 'center' },
});
