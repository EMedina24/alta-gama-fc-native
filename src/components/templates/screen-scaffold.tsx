/**
 * The screen shell: the aurora mesh, the CROWN (eyebrow, title, avatar, and
 * the screen's payload), scroll, and the tab-bar inset (ADR 0087/0088).
 *
 * ⚠ The bottom padding is `BottomTabInset` plus the safe-area inset. The design
 * pins the bar height at 80 (ADR 0015) — but `NativeTabs` draws the real bar, so
 * this number is a design token standing in for a measurement we cannot take
 * from JS. If content ever sits under the bar, this is the line to look at.
 *
 * ⚠ **The gutter moved** (ADR 0087): the scroll's content container no longer
 * pads horizontally — the crown must run edge to edge — so the 20pt gutter,
 * the `MaxContentWidth` cap and the section gap live on `body`, which wraps
 * `children` alone. Every `-Spacing.five` bleed in the organisms (fixture
 * rows, day headers, rails) assumes exactly this contract; a change here is a
 * change to all of them.
 *
 * ⚠⚠ **The crown runs to y = 0, behind the status bar** (ADR 0094), so this
 * template owns the STATUS BAR STYLE: dark glyphs while the crown's bright
 * band is up there, light again once it has scrolled past. Neither style is
 * correct on its own — white on lime and black on the mesh are both
 * unreadable — and the root layout's `light` is the app-wide default this
 * overrides only while a tab is focused.
 */
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Avatar, MeshGround } from '@/components/atoms';
import { BottomTabInset, Colors, CrownRamp, MaxContentWidth, Spacing } from '@/constants/theme';
import { Crown } from './crown';

/**
 * How far down the crown its ink stops being dark-on-bright. `CrownGrad` is
 * mid-teal by 50 % and dark green by 68 %; two fifths is where the band behind
 * the status bar stops carrying the lime.
 */
const BRIGHT_BAND = 0.42;

export interface ScreenScaffoldProps {
  title: string;
  eyebrow?: string;
  /**
   * A quiet line UNDER the title — the Clubs screen's `{n} clubs followed`
   * (ADR 0082).
   *
   * ⚠ Not `eyebrow`, and the two are not interchangeable: an eyebrow sits ABOVE
   * the title and names the screen's scope (`LALIGA 2026/27 · 20 clubs`), while
   * this states something about the reader's own state and reads after the
   * title, not before it. Both may be set.
   */
  subtitle?: string;
  /** The Clubs screen's 48pt title; everything else takes the default 40. */
  titleVariant?: 'crownTitle' | 'crownTitleLg';
  /** A right-aligned block beside the title — Table's caption lines. */
  meta?: ReactNode;
  /** Right of the title — the account avatar, on crown ink. */
  accessory?: ReactNode;
  /**
   * The screen's controls, rendered INSIDE the crown under the head (ADR
   * 0087): Today's live plate, Matchdays' pager + chips, Table's league
   * picker, Clubs' search + rail. Replaces the old `sticky` slot.
   */
  payload?: ReactNode;
  /** Override the crown's content-driven bottom padding (see `Crown`). */
  crownPadBottom?: number;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function ScreenScaffold({
  title,
  eyebrow,
  subtitle,
  titleVariant,
  meta,
  accessory,
  payload,
  crownPadBottom,
  children,
  onRefresh,
  refreshing = false,
}: ScreenScaffoldProps) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();

  /**
   * Whether the crown's bright band is still behind the status bar. The
   * gradient is a FIXED layer (`topInset + CrownRamp`, ADR 0094), so the
   * threshold is arithmetic — no measuring.
   *
   * ⚠ `setState` in `onScroll` is deliberate and cheap: the value is a
   * BOOLEAN, so React bails out of every frame that does not cross the
   * threshold — this re-renders twice per scroll, not sixty times a second.
   */
  const [overBright, setOverBright] = useState(true);
  const threshold = Math.max(0, (insets.top + CrownRamp) * BRIGHT_BAND - insets.top);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOverBright(e.nativeEvent.contentOffset.y < threshold);
  };

  return (
    <View style={styles.screen}>
      {/* ⚠ Only while FOCUSED: a blurred tab still mounted under a pushed club
          page would otherwise hold the status bar dark over that screen. */}
      <StatusBar style={focused && overBright ? 'dark' : 'light'} />
      {/* The aurora mesh sits BEHIND the scroll and does not move (ADR 0087). */}
      <MeshGround />
      <ScrollView
        style={styles.scroll}
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: BottomTabInset + Spacing.six },
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              // Dark ink — the spinner spins over the crown's bright band.
              tintColor={Colors.dark.onCrownDim}
            />
          ) : undefined
        }>
        <Crown
          eyebrow={eyebrow}
          title={title}
          titleVariant={titleVariant}
          subtitle={subtitle}
          meta={meta}
          accessory={accessory}
          padBottom={crownPadBottom}
          topInset={insets.top}>
          {payload}
        </Crown>
        <View style={styles.body}>{children}</View>
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
 *
 * ⚠ Crown ink by default: every current call site is a tab header, and every
 * tab header is a crown now (ADR 0087).
 */
export function AvatarButton({
  initials,
  onPress,
  tone = 'crown',
}: {
  initials: string | null;
  onPress: () => void;
  tone?: 'ground' | 'crown';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Account"
      hitSlop={8}
      style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <Avatar initials={initials} tone={tone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  scroll: { flex: 1 },
  // ⚠ No horizontal padding here — the crown is full-bleed. The gutter is
  // `body`'s.
  content: {},
  body: {
    paddingHorizontal: Spacing.five, // the 20pt screen gutter
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
});
