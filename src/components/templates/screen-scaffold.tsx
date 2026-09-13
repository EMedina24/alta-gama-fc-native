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

import { Avatar, MeshGround, PremierCrest } from '@/components/atoms';
import { ScreenOverlayContext } from '@/hooks/use-screen-overlay';
import { leagueCrownTheme } from '@/lib/cronogol/league-theme';
import {
  BottomTabInset,
  Colors,
  CrownArt,
  CrownRamp,
  MaxContentWidth,
  Spacing,
} from '@/constants/theme';
import { Crown } from './crown';

/**
 * How far down the crown its ink stops being dark-on-bright. `CrownGrad` is
 * mid-teal by 50 % and dark green by 68 %; two fifths is where the band behind
 * the status bar stops carrying the lime.
 *
 * Exported for the one crowned screen that cannot use this scaffold — the
 * onboarding picker (ADR 0099), which needs its own pinned footer.
 */
export const BRIGHT_BAND = 0.42;

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
  /** A control row above the crown's head — the banner pill + avatar (ADR 0165). */
  banner?: ReactNode;
  /** A dot-separated line under the title (ADR 0165). See `Crown.metaLine`. */
  metaLine?: string;
  /** `quiet` marks a provisional value — see `Crown.metaTone`. */
  metaTone?: 'strong' | 'quiet';
  /**
   * The league this screen is scoped to, as its **`apiSlug`** — the crown and
   * the page mesh take that league's hue (ADR 0164).
   *
   * ⚠⚠ `apiSlug`, not our route `slug`: `laliga`, never `la-liga`. Pass the
   * wrong one and LaLiga alone falls back to the brand crown while every other
   * league looks correct (trap 34 / ADR 0084). `findLeague(slug)?.apiSlug` is
   * the conversion.
   *
   * ⚠ Omitted is the CORRECT state for a screen with no single league — Today
   * and News are multi-league by construction — and for a competition with no
   * `LeagueBand` entry. Both wear the brand crown.
   */
  tintLeague?: string | null;
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
  banner,
  metaLine,
  metaTone,
  tintLeague,
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
  /**
   * What a control has published to draw OVER the page — see `useScreenOverlay`.
   * Null at rest, and the control that puts a node here takes it back down.
   */
  const [overlay, setOverlay] = useState<ReactNode>(null);
  const threshold = Math.max(0, (insets.top + CrownRamp) * BRIGHT_BAND - insets.top);

  /**
   * The league's paint, DERIVED — never held in state (trap 72: if two pieces
   * of state must agree, compute one from the other). Both calls are a handful
   * of HSL conversions over ten colours, and both return the brand's own frozen
   * table when there is no league, so the common case allocates nothing.
   *
   * ⚠ No cross-fade, deliberately (trap 71). Picking a league is already the
   * heaviest frame in the app — new query, new list, whole screen re-rendered —
   * and an animation on that frame stalls visibly. The recolour lands on the
   * same commit as the content it belongs to, which is what makes it read as
   * "the screen changed" rather than as a transition that hitched.
   */
  const theme = leagueCrownTheme(tintLeague);
  /** Whether this screen wears a league's dark head rather than the brand's lime. */
  const deepCrown = theme.tone === 'deep';

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOverBright(e.nativeEvent.contentOffset.y < threshold);
  };

  return (
    // ⚠ The provider wraps the WHOLE screen, not just the payload: Clubs renders
    // its league control in `children` (the body), not in the crown, and both
    // must be able to publish. A payload-only provider would leave the Clubs
    // menu opening into nothing.
    //
    // ⚠⚠ **`value` must stay the bare setter.** A `useState` setter is stable
    // forever; wrap it in an object literal and the context value is new on
    // every render, which propagates THROUGH React's bail-outs to the consumer,
    // which publishes again — an infinite render loop the moment the menu opens.
    // The publisher is safe today only because this reference never changes.
    <ScreenOverlayContext.Provider value={setOverlay}>
    <View style={styles.screen}>
      {/* ⚠ Only while FOCUSED: a blurred tab still mounted under a pushed club
          page would otherwise hold the status bar dark over that screen. */}
      {/* ⚠⚠ The flip is the BRIGHT crown's alone. Dark glyphs exist because the
          brand's lime runs up behind the status bar; a DEEP league crown is dark
          at every offset, so `light` is correct there from y = 0 and the scroll
          position is irrelevant. Asking `overBright` on a deep crown would put
          black glyphs on a near-black band. */}
      <StatusBar style={focused && deepCrown === false && overBright ? 'dark' : 'light'} />
      {/* The aurora mesh sits BEHIND the scroll and does not move (ADR 0087). */}
      <MeshGround pools={theme.pools} />
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
              // ⚠ The spinner spins over the crown's TOP, so its ink follows the
              // same rule the head's does: dark on the brand's bright band,
              // white on a league's deep one (ADR 0165).
              tintColor={deepCrown ? Colors.dark.onDeepDim : Colors.dark.onCrownDim}
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
          stops={theme.stops}
          tone={theme.tone}
          art={theme.art === 'premier-league' ? <PremierCrest height={CrownRamp * CrownArt.height} alpha={CrownArt.alpha} /> : null}
          banner={banner}
          metaLine={metaLine}
          metaTone={metaTone}
          topInset={insets.top}>
          {payload}
        </Crown>
        <View style={styles.body}>{children}</View>
      </ScrollView>
      {/* ⚠⚠ LAST, and outside the scroll view — the whole point of the slot
          (ADR 0163). Painted over the page, so a control no longer has to lift
          the crown to escape it; and touches land here rather than reaching the
          `ScrollView`, so an open overlay's scrim finally blocks scrolling.
          ⚠ It does NOT cover the tab bar, which `NativeTabs` draws outside this
          screen — tapping a tab is a legitimate way out and always has been. */}
      {overlay}
    </View>
    </ScreenOverlayContext.Provider>
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
      {/* ⚠ `attention` ONLY while signed out (ADR 0101): the spinning arc is
          the sign-in invitation, and it must not outlive it. */}
      <Avatar initials={initials} tone={tone} attention={initials === null} />
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
