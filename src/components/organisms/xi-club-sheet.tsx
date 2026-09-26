/**
 * The Starting XI club switcher (ADR 0212): search, a league filter, and every
 * offered club grouped by league.
 *
 * ⚠ Picking a club does NOT clear anything — every club keeps its own working
 * XI (ADR 0211). The handoff's switcher wiped the pitch; the web's does not.
 *
 * ⚠ The league filter is a row of chips, not a segmented control: four league
 * names do not fit one at 375pt.
 */
import { ScrollView, StyleSheet, View } from 'react-native';

import { Check, ChipButton, Crest, SHEET_GROUND, Text } from '@/components/atoms';
import { SearchField, SettingsRow } from '@/components/molecules';
import { SheetClose } from '@/components/molecules/sheet-close';
import { Size, Spacing } from '@/constants/theme';

export interface XiClubSheetProps {
  title: string;
  query: string;
  onQuery: (query: string) => void;
  searchPlaceholder: string;
  filters: readonly { key: string; label: string }[];
  filter: string;
  onFilter: (key: string) => void;
  sections: readonly {
    key: string;
    title: string;
    clubs: readonly { slug: string; name: string; crest: string | null; abbr: string; current: boolean }[];
  }[];
  empty: string | null;
  onPick: (slug: string) => void;
  onClose: () => void;
  closeLabel: string;
}

export function XiClubSheet(props: XiClubSheetProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      stickyHeaderIndices={[0]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <Text variant="headline" style={styles.title}>
            {props.title}
          </Text>
          <SheetClose onPress={props.onClose} accessibilityLabel={props.closeLabel} />
        </View>
        <SearchField value={props.query} onChangeText={props.onQuery} placeholder={props.searchPlaceholder} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {props.filters.map((f) => (
            <ChipButton
              key={f.key}
              label={f.label}
              tone="neutral"
              active={f.key === props.filter}
              onPress={() => props.onFilter(f.key)}
            />
          ))}
        </ScrollView>
      </View>
      {props.empty ? (
        <Text variant="body" color="textSecondary" style={styles.empty}>
          {props.empty}
        </Text>
      ) : (
        props.sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text variant="eyebrowSm" color="textMuted" style={styles.eyebrow}>
              {section.title}
            </Text>
            {section.clubs.map((club) => (
              <SettingsRow
                key={club.slug}
                title={club.name}
                leading={<Crest src={club.crest} fallback={club.abbr} size={Size.crestList} />}
                trailing={club.current ? <Check /> : undefined}
                selected={club.current}
                chevron={false}
                onPress={() => props.onPick(club.slug)}
              />
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.seven },
  head: { backgroundColor: SHEET_GROUND, paddingTop: Spacing.four, paddingBottom: Spacing.three, gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { flex: 1 },
  chips: { gap: Spacing.two },
  section: { paddingTop: Spacing.three, gap: Spacing.one },
  eyebrow: { paddingHorizontal: Spacing.two, paddingBottom: Spacing.one },
  empty: { paddingTop: Spacing.five, textAlign: 'center' },
});
