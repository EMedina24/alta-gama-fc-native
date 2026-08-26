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

import { Eyebrow, Text } from '@/components/atoms';
import { BottomTabInset, Colors, MaxContentWidth, Size, Spacing } from '@/constants/theme';

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

/** The circular initials button that opens the account sheet. */
/**
 * The account entry point.
 *
 * ⚠ `initials` is nullable and `null` is the SIGNED-OUT state, not a missing
 * prop — it draws a neutral mark. An empty string would render an empty circle,
 * which is what this shipped as while there was no account to name (HANDOFF §5).
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
      style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.7 }]}>
      <Text variant={initials ? 'caption' : 'body'} color="textSecondary">
        {/* ⚠ A bullet, not an SF Symbol: `expo-symbols` is a dependency this app
            does not otherwise use, and the circle is 36pt — a glyph at that size
            reads as a smudge next to the initials it alternates with. */}
        {initials ?? '·'}
      </Text>
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
  avatar: {
    width: Size.avatar,
    height: Size.avatar,
    borderRadius: Size.avatar / 2,
    backgroundColor: Colors.dark.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
