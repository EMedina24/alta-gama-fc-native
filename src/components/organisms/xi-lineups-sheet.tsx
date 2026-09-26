/**
 * A club's saved lineups (ADR 0211, 0214): up to five cards — name, shape, the
 * eleven as initials, when — each loadable and deletable.
 *
 * ⚠ The loaded one wears a lime ring. That is a MARKER, not a button state:
 * editing the pitch afterwards does not clear it (the web's and the handoff's
 * rule) — it says which save the pitch started from.
 *
 * ⚠ Saved on this device only. There is no lineup endpoint.
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text, TrashGlyph, XiOrb } from '@/components/atoms';
import { SheetClose } from '@/components/molecules/sheet-close';
import { Colors, Radius, Size, Spacing, Xi } from '@/constants/theme';

export interface XiLineupItem {
  id: string;
  name: string;
  formation: string;
  /** Eleven, in slot order; `null` is a slot saved empty or a player who has left. */
  dots: readonly (string | null)[];
  date: string;
  loaded: boolean;
}

export interface XiLineupsSheetProps {
  title: string;
  lineups: readonly XiLineupItem[];
  empty: { title: string; body: string };
  loadedLabel: string;
  deleteLabel: string;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  closeLabel: string;
}

export function XiLineupsSheet(props: XiLineupsSheetProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.titleRow}>
        <Text variant="headline" style={styles.title}>
          {props.title}
        </Text>
        <SheetClose onPress={props.onClose} accessibilityLabel={props.closeLabel} />
      </View>
      {props.lineups.length === 0 ? (
        <View style={styles.emptyTile}>
          <Text variant="bodyStrong">{props.empty.title}</Text>
          <Text variant="footnote" color="textSecondary">
            {props.empty.body}
          </Text>
        </View>
      ) : (
        props.lineups.map((lineup) => (
          <Pressable
            key={lineup.id}
            onPress={() => props.onLoad(lineup.id)}
            accessibilityRole="button"
            accessibilityLabel={`${lineup.name}, ${lineup.formation}, ${lineup.date}${lineup.loaded ? `, ${props.loadedLabel}` : ''}`}
            style={({ pressed }) => [styles.card, lineup.loaded && styles.loaded, pressed && styles.pressed]}>
            <View style={styles.cardHead}>
              <View style={styles.cardText}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {lineup.name}
                </Text>
                <Text variant="caption" color="textMuted">
                  {lineup.date}
                </Text>
              </View>
              <Text variant="xiFormation" tabular>
                {lineup.formation}
              </Text>
              <Pressable
                onPress={() => props.onDelete(lineup.id)}
                accessibilityRole="button"
                accessibilityLabel={`${props.deleteLabel} ${lineup.name}`}
                hitSlop={Spacing.one}
                style={({ pressed }) => [styles.trash, pressed && styles.pressed]}>
                <TrashGlyph size={17} />
              </Pressable>
            </View>
            <View style={styles.dots}>
              {lineup.dots.map((initials, i) =>
                initials ? (
                  <XiOrb key={i} size={Xi.lineupDot} initials={initials} />
                ) : (
                  <View key={i} style={styles.hole} />
                ),
              )}
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, paddingTop: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.seven },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { flex: 1 },
  card: {
    borderRadius: Radius.group,
    paddingVertical: Spacing.three + 2,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    backgroundColor: Colors.dark.glassFill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  loaded: { borderColor: Colors.dark.accent },
  pressed: { backgroundColor: Colors.dark.rowActive },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  cardText: { flex: 1, minWidth: 0, gap: 2 },
  trash: {
    width: Xi.trash,
    height: Xi.trash,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.xiControl,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.xiControlLine,
  },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  hole: {
    width: Xi.lineupDot,
    height: Xi.lineupDot,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.dark.xiBenchDash,
  },
  emptyTile: {
    borderRadius: Radius.group,
    padding: Spacing.five,
    gap: Spacing.two,
    backgroundColor: Colors.dark.glassFill,
  },
});
