/**
 * The screen shell: large title, optional eyebrow, account avatar, scroll, and
 * the tab-bar inset.
 *
 * ⚠ The bottom padding is `BottomTabInset` plus the safe-area inset. The design
 * pins the bar height at 80 (ADR 0015) — but `NativeTabs` draws the real bar, so
 * this number is a design token standing in for a measurement we cannot take
 * from JS. If content ever sits under the bar, this is the line to look at.
 */
import { type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Eyebrow, Text } from '@/components/atoms';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';

export interface ScreenScaffoldProps {
  title: string;
  eyebrow?: string;
  /** Right of the title — the account avatar, or a pager. */
  accessory?: ReactNode;
  /** Rendered under the header, outside the scroll gutter (league switchers). */
  sticky?: ReactNode;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function ScreenScaffold({
  title,
  eyebrow,
  accessory,
  sticky,
  children,
  onRefresh,
  refreshing = false,
}: ScreenScaffoldProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.two, paddingBottom: BottomTabInset + Spacing.six },
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.dark.textFaint}
            />
          ) : undefined
        }>
        <View style={styles.header}>
          <View style={styles.headings}>
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <Text variant="largeTitle">{title}</Text>
          </View>
          {accessory}
        </View>
        {sticky}
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * The account entry point — the circular initials button that opens the sheet.
 *
 * ⚠ `initials` is nullable and `null` is the SIGNED-OUT state, not a missing
 * prop. The disc itself is the `Avatar` atom (ADR 0081), which the account
 * sheet's identity block draws too; this is only the press target around it.
 *
 * ⚠ No `ring` here. The accent ring marks a signed-in reader on the SHEET,
 * where it is the one lime thing; on a tab screen that budget already belongs
 * to the live marker (SPEC §2).
 */
export function AvatarButton({
  initials,
  onPress,
}: {
  initials: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Account"
      hitSlop={8}
      style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <Avatar initials={initials} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.five, // the 20pt screen gutter
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headings: { flex: 1, gap: Spacing.one },
});
