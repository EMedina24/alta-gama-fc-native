/**
 * The league selector, as a DROPDOWN (ADR 0162, rebuilt by 0163) — a
 * liquid-glass trigger capsule naming the competition in view, and a panel that
 * blooms out of it carrying every one. Supersedes the rail (0117–0124), which
 * had run out of room: seven equal slots on a 375pt device gave each mark
 * 46.14pt and 0160 spent its last lever shrinking the artwork to 38×19 to fit.
 *
 * ⚠ **The slot arithmetic is GONE, and that is the point.** A dropdown's cost
 * does not scale with the catalogue — an eighth league is one more row on a
 * panel, not another division of a fixed gutter.
 *
 * ⚠ **The name is BACK** (amending ADR 0031). A trigger names ONE thing and a
 * panel row is a menu item — both can afford words, and the text branch that had
 * to stand in for missing artwork is deleted: a league with no logo still reads,
 * because every row says its name.
 *
 * ## Where this draws, and why not here
 *
 * ⚠⚠ **This component renders its TRIGGER and nothing else.** The scrim and the
 * panel are published to the screen's overlay (`useScreenOverlay`), which paints
 * them over the `ScrollView` (ADR 0163). ADR 0162 kept them here and made the
 * CROWN rise so they could escape it — but the crown's gradient is a layer
 * taller than the crown itself, so a lifted crown hazes the top of the body, and
 * the lift was React state racing an animation it could never match. Publishing
 * over the scroll view removes the lift, the haze and the race. ⚠ It also means
 * the scrim is outside the scroll view at last, so a drag on it no longer
 * scrolls the page under an open menu.
 *
 * ## Where the glass is, and where it deliberately is not
 *
 * ⚠⚠ **The TRIGGER is glass. The PANEL is paint.** A glass surface refracts only
 * the screen's own ground; anything layered behind it ghosts through (trap 59),
 * so a panel hanging over a standings table has to be opaque — which left the
 * old build with glass on a 5pt rim while the glass RULES governed the whole
 * control: no fractional alpha on an ancestor (it disables the effect view), no
 * transform scale (it rasterises the backdrop). ADR 0122's rules are real; a rim
 * was not worth obeying them for. See 0163 for what that cost.
 *
 * ⚠ The selection lozenge is paint for a related reason: **glass over an opaque
 * fill is a no-op, not a subtle effect** — it rendered as nothing.
 *
 * ## Motion
 *
 * ⚠⚠ **Opacity and scale, on a `withTiming`. Never a height, never a spring.**
 * Height is a layout prop, so a height animation competes with whatever React is
 * committing — picking a league stalled it part-collapsed for ~760ms. And
 * `Glide.spring` is underdamped: it reaches its target at ~180ms but only
 * reports `finished` at settle, ~350ms, so anything gated on that callback is
 * late by the tail. Both facts cost a bug report each. A timing curve on
 * UI-thread props has neither failure.
 *
 * ## The rest
 *
 * ⚠⚠ **The panel is PLACED, not assumed.** It measures the trigger in the window
 * at open time and drops downward only if the rows actually fit between it and
 * the tab bar; otherwise it opens UPWARD, and if neither side can hold the whole
 * catalogue it takes the roomier one and scrolls. On Clubs, where the control
 * sits halfway down the body, the last league landed under the tab bar before
 * this existed.
 *
 * ⚠ Artwork comes from the API (`league.logoUrls`), not a bundled asset, and a
 * drawn `mark` OUTRANKS a `logoUrl` (ADR 0153): a lockup is an editorial choice,
 * a URL is whatever the wire happened to have. Chosen in ONE place,
 * `LeagueArtwork`, used by the trigger and the rows alike.
 *
 * ⚠ Marks are FULL COLOUR at rest (ADR 0123). An idle row recedes by the 0.72
 * dim alone; selection is the lozenge, the brightened ink and the check.
 */
import { Image } from 'expo-image';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useLayoutEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  Check,
  Chevron,
  COMPETITION_MARK_RATIO,
  CompetitionMark,
  Text,
  type CompetitionMarkKind,
} from '@/components/atoms';
import { BottomTabInset, Colors, Motion, Radius, Size, Spacing } from '@/constants/theme';
import { useScreenOverlay } from '@/hooks/use-screen-overlay';
import { hapticToggle } from '@/lib/haptics';

export interface LeagueOption {
  slug: string;
  name: string;
  /** `logoUrls.icon ?? logoUrls.primary ?? logoUrl`, resolved by the screen. */
  logoUrl: string | null;
  /**
   * A DRAWN mark, for a competition the API serves no artwork for (ADR
   * 0133/0153). ⚠ Outranks `logoUrl` — see the header.
   */
  mark?: CompetitionMarkKind;
}

export interface LeagueMenuCopy {
  /** The trigger's VoiceOver label — the control, then what it currently reads. */
  label: (league: string) => string;
  /** Its hint: what a tap does. */
  hint: string;
  /** The scrim's label — the way out for a reader who opened it by accident. */
  close: string;
}

export interface LeagueMenuProps {
  leagues: readonly LeagueOption[];
  /**
   * The selected slug.
   *
   * ⚠⚠ **Pass the STATE, never a slug read off a derived object.** A screen
   * that resolves its selection into an entity with a fallback —
   * `find(...) ?? CATALOGUE[0]` — hands this the FALLBACK's slug whenever the
   * selection is not in that catalogue, and the trigger then NAMES THE WRONG
   * COMPETITION while the screen shows another. That shipped on Matchdays the
   * day the Champions League joined the rail (ADR 0157). The dropdown removes
   * the second half of that bug — there is no early-returning chip to become
   * unpressable — but not the first, and the first is now a false label rather
   * than a mis-drawn plate, which is worse.
   */
  active: string;
  onSelect: (slug: string) => void;
  copy: LeagueMenuCopy;
  /** Which ground the control sits on. The default is the screen body. */
  tone?: 'crown' | 'ground';
  /**
   * ⚠ **Debug only — never set this in the app.** Multiplies the open/close
   * duration so `/_debug/menu` can play the transition slowly enough to
   * screenshot frame by frame. Three visual artifacts on this control have each
   * needed a cold launch and a lucky capture to see; this is the tool that
   * replaces that.
   */
  motionScale?: number;
}

const LIQUID = isLiquidGlassAvailable();

/** An idle row recedes a step, exactly as an idle chip did (ADR 0117/0123). */
const IDLE_ROW_OPACITY = 0.72;

/** The press dim, the app's `pressed` value. ⚠ Lands on CONTENT, never on glass. */
const PRESSED_OPACITY = 0.7;

/**
 * How small the panel starts and ends. Small on purpose: a menu that scales far
 * reads as a zoom rather than a disclosure, and the artwork inside it goes soft
 * for the frames it is under-scaled.
 */
const PANEL_SHUT_SCALE = 0.96;

/**
 * The panel's resolved box in WINDOW coordinates, plus which edge it grew from.
 *
 * ⚠ Everything is settled in the measure callback, so the render has no geometry
 * left to decide. `up` survives only to pick the anchor the scale grows from.
 */
interface Place {
  up: boolean;
  left: number;
  width: number;
  top: number;
  height: number;
}

export function LeagueMenu({
  leagues,
  active,
  onSelect,
  copy,
  tone = 'ground',
  motionScale = 1,
}: LeagueMenuProps) {
  const crown = tone === 'crown';
  const fade = { duration: Motion.quick * motionScale };
  const reduceMotion = useReducedMotion();

  /**
   * Two states, not one. `open` is the LOGICAL state — the chevron, the
   * a11y expansion, whether a tap commits. `mounted` is whether the panel
   * EXISTS, and it outlives `open` by one fade so the close animates.
   */
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  /**
   * The scrim and panel do not render HERE — they are published to the screen's
   * overlay, above the scroll view (ADR 0163). This control renders its trigger
   * and nothing else.
   *
   * ⚠ Published from an effect rather than at the two ends, so the overlay is a
   * derived value and cannot diverge from `mounted` the way the crown lift it
   * replaced did. The cleanup covers the screen unmounting mid-open.
   *
   * ⚠⚠ Loop-safe only because `payload` is the SCREEN's element and React bails
   * out of re-rendering it when the scaffold re-renders — see `useScreenOverlay`.
   */
  const publish = useScreenOverlay();

  const triggerH = crown ? Size.leagueChipHCrown : Size.leagueMenuTriggerH;
  const panelH = panelHeight(leagues.length);

  /**
   * Where the panel goes, decided at OPEN time from a real measurement — see
   * the header. `height` is what it may actually use, which is `panelH` unless
   * neither side of the trigger can hold it.
   */
  const hostRef = useRef<View>(null);
  /**
   * ⚠⚠ Which open the pending measurement belongs to. `measureInWindow` answers
   * in a CALLBACK, and that callback was seen landing **1.4 seconds** late on a
   * busy screen — long after the reader had closed the menu again, at which
   * point it dutifully re-opened it (simulator, 2026-09-13; the panel had
   * already collapsed, so what was left on screen was a stuck black bar and a
   * hazed crown). Every open takes a ticket, and every close and pick voids it.
   */
  const openId = useRef(0);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  /**
   * The trigger's box IN WINDOW COORDINATES plus which way the panel goes. The
   * panel takes the trigger's own `x`/`width`, which reproduces the screen
   * gutter and the `MaxContentWidth` cap for free rather than deriving them a
   * second time and drifting.
   */
  const [place, setPlace] = useState<Place>({
    up: false,
    left: 0,
    width: 0,
    top: 0,
    height: panelH,
  });
  /** Rows outnumber the room. The list scrolls rather than being cut short. */
  const capped = place.height < panelH;
  /** The active row's index, or 0 — the lozenge always has somewhere to be. */
  const activeIndex = Math.max(
    0,
    leagues.findIndex((league) => league.slug === active),
  );
  const activeLeague = leagues[activeIndex];

  /**
   * 0 = shut, 1 = open. Drives the panel's opacity and scale and the scrim's
   * dim — all three are UI-thread props, so nothing here can be held up by a
   * busy JS thread.
   *
   * ⚠⚠ **`withTiming`, never a spring** (ADR 0163). `Glide.spring` is
   * underdamped (ζ ≈ 0.705): it crosses its target at ~180ms and only reports
   * `finished` at settle, ~350ms. Anything gated on that callback is late by the
   * whole tail — which is how a released-too-late crown lift left ~150ms of haze
   * across the page. A timing curve ends when it ends.
   */
  const grow = useSharedValue(0);

  // ⚠ Every shared-value write happens at EVENT time, never in an effect —
  // the rail's rule, for the React Compiler's reason.
  const raise = (next: Place) => {
    setPlace(next);
    grow.value = 0;
    setMounted(true);
    setOpen(true);
    grow.value = reduceMotion ? 1 : withTiming(1, fade);
  };

  const openMenu = () => {
    void hapticToggle();
    const mine = ++openId.current;
    const host = hostRef.current;
    // ⚠ No ref yet (the very first frame): drop downward at full height rather
    // than not opening. One tap on an unmeasured control is the only cost.
    // ⚠ No ref yet (the very first frame): there is nothing to anchor to, so
    // skip rather than open at a guessed position. One dead tap on an unmeasured
    // control beats a panel in the wrong place.
    if (!host) return;
    // ⚠ `measureInWindow` is a CALLBACK, so the open lands a frame late. That
    // is deliberate and invisible: the alternative is guessing at a position
    // from `onLayout`, which reports a box relative to a parent that is itself
    // halfway down a scroll view.
    host.measureInWindow((x, y, w, h) => {
      // ⚠ Voided by a close (or by a newer open) while we were measuring — see
      // `openId`. Without this the menu re-opens itself after being dismissed.
      if (openId.current !== mine) return;
      // The tab bar is drawn natively and cannot be measured from JS, so the
      // floor is the design token that stands in for it (see `BottomTabInset`).
      const floor = window.height - BottomTabInset;
      const ceiling = insets.top + Spacing.two;
      const below = floor - (y + h) - Size.leagueMenuGap;
      const above = y - ceiling - Size.leagueMenuGap;
      const up = panelH > below && above > below;
      // ⚠ One row is the floor: a panel too short to show anything is worse
      // than one that scrolls.
      const room = Math.max(panelHeight(1), up ? above : below);
      const height = Math.min(panelH, room);
      // ⚠⚠ The panel takes the trigger's OWN `x`/`w`. The host is a block child
      // of the crown's inner (or the scaffold's body), both of which are
      // `maxWidth: MaxContentWidth, alignSelf: 'center'` with the screen gutter
      // — so the measured box already IS the content column, on both tones.
      // Re-deriving it from `window.width` would be a second source of truth,
      // and it would drift.
      raise({
        up,
        left: x,
        width: w,
        top: up ? y - Size.leagueMenuGap - height : y + h + Size.leagueMenuGap,
        height,
      });
    });
  };

  /** The panel is gone: the overlay comes down with `mounted` — see `publish`. */
  const shut = () => {
    setMounted(false);
  };

  const closeMenu = () => {
    openId.current += 1;
    setOpen(false);
    if (reduceMotion) {
      grow.value = 0;
      shut();
      return;
    }
    grow.value = withTiming(0, fade, (finished) => {
      // ⚠ Guarded: an interrupting re-open restarts this timing, and an
      // unguarded callback would unmount the panel the reader just asked for.
      // ⚠⚠ With a TIMING this fires on the frame the fade reaches 0 — the whole
      // reason it is not a spring (ADR 0163).
      if (finished) runOnJS(shut)();
    });
  };

  /**
   * ⚠ **A pick animates like every other close now** (ADR 0163). ADR 0162 had to
   * dismiss it instantly: the close animated the panel's HEIGHT, a layout prop,
   * and choosing a league is the exact moment the screen does its heaviest work
   * — new query, new standings, a whole list re-rendered. The two competed and
   * the panel stalled part-collapsed, ~760ms of black bar under the trigger.
   * Opacity and scale run on the UI thread and cannot be held up by a JS commit,
   * so the two paths are one again.
   */
  const pick = (league: LeagueOption) => {
    if (league.slug !== active) {
      void hapticToggle();
      onSelect(league.slug);
    }
    closeMenu();
  };

  const many = leagues.length > 1;

  /**
   * ⚠ `useLayoutEffect`, not `useEffect`: a passive effect publishes AFTER paint,
   * which would cost the open a second painted frame on top of the one
   * `measureInWindow` already costs. This flushes the scaffold's re-render
   * before paint.
   *
   * ⚠ See `publish` above for why publishing from an effect cannot loop.
   */
  useLayoutEffect(() => {
    publish(
      mounted ? (
        <MenuOverlay
          place={place}
          leagues={leagues}
          active={active}
          capped={capped}
          closeLabel={copy.close}
          activeIndex={activeIndex}
          grow={grow}
          onClose={closeMenu}
          onPick={pick}
        />
      ) : null,
    );
    return () => publish(null);
  });

  return (
    <View ref={hostRef} style={{ height: triggerH }}>
      <Trigger
        league={activeLeague}
        crown={crown}
        height={triggerH}
        open={open}
        disclosed={many}
        label={copy.label(activeLeague?.name ?? '')}
        hint={copy.hint}
        onPress={open ? closeMenu : openMenu}
      />
    </View>
  );
}

/**
 * What the screen's overlay draws while the menu is open (ADR 0163): the scrim
 * and the panel, over the scroll view rather than inside the crown.
 *
 * ⚠ Positioned in WINDOW coordinates from the trigger's measured box, so it is
 * anchored to the control without being its descendant. It takes the trigger's
 * own `x`/`width`, which is how it inherits the screen gutter and the
 * `MaxContentWidth` cap without computing either.
 *
 * ⚠ Split out as its own component so the overlay node this publishes is small
 * and the shared-value reads sit in one scope — the pattern the old rail used
 * for its plate.
 */
function MenuOverlay({
  place,
  leagues,
  active,
  capped,
  closeLabel,
  activeIndex,
  grow,
  onClose,
  onPick,
}: {
  place: Place;
  leagues: readonly LeagueOption[];
  active: string;
  capped: boolean;
  closeLabel: string;
  activeIndex: number;
  grow: SharedValue<number>;
  onClose: () => void;
  onPick: (league: LeagueOption) => void;
}) {
  /**
   * ⚠⚠ **Opacity and scale — NOT height.** This is the whole fix (ADR 0163).
   * The panel is paint now, not glass, so both are legal: ADR 0122's ban covers
   * a fractional alpha on a glass ANCESTOR and a transform scale ON glass, and
   * there is no glass here to kill. Neither touches layout, so neither can stall
   * behind a busy JS thread, and neither leaves a hairline on the way out — the
   * box never shrinks, it fades. ⚠ Do not "improve" this back into a height
   * animation; that is what ADR 0162 had, and it cost three bug reports.
   *
   * The scale is small and anchored at the trigger's edge by `transformOrigin`
   * below, so it reads as blooming out of the capsule.
   */
  const panelFade = useAnimatedStyle(() => {
    const scale = PANEL_SHUT_SCALE + (1 - PANEL_SHUT_SCALE) * grow.value;
    // ⚠⚠ The anchor is COMPOSED, not declared. `transformOrigin` would say this
    // more directly, but whether Reanimated preserves a statically-declared
    // origin while it writes `transform` on Fabric is not something this repo
    // has verified — and the failure mode is silent (the panel scales from its
    // centre). RN composes a transform array as T·S, so scaling first in local
    // space and then translating by half the shrinkage pins the chosen edge,
    // with no platform question to answer.
    const anchor = ((place.up ? 1 : -1) * (1 - scale) * place.height) / 2;
    return { opacity: grow.value, transform: [{ translateY: anchor }, { scale }] };
  });
  const scrimFade = useAnimatedStyle(() => ({ opacity: grow.value }));

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      {/* ⚠ The dismiss catcher. Outside the `ScrollView` at last, so a DRAG on
          it no longer scrolls the page under the open menu — which it did for
          as long as this lived in the crown. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimFade]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          { left: place.left, width: place.width, top: place.top, height: place.height },
          panelFade,
        ]}>
        {/* ⚠ A `ScrollView` ALWAYS, scrolling only when the rows outgrow the
            room the measurement found. The alternative — clipping the overflow
            — is a silent truncation: the reader is shown a menu that looks
            complete and is missing its last leagues. Nothing else changes,
            because with room to spare it never scrolls. */}
        <ScrollView
          scrollEnabled={capped}
          showsVerticalScrollIndicator={capped}
          contentContainerStyle={styles.rows}>
          {/* ⚠ STATIC, and it always was. This carried a shared value and an
              animated style on the claim that it "springs" between rows — it
              never did: both writes were plain assignments, and a pick unmounts
              the panel before any travel could be seen. It is a `top` now.
              ⚠ INSIDE the scroll content, so it travels with the row it marks. */}
          <View
            style={[styles.lozenge, { top: Spacing.one + activeIndex * Size.leagueMenuRowH }]}
            pointerEvents="none"
          />
          {leagues.map((league) => (
            <Row
              key={league.slug}
              league={league}
              selected={league.slug === active}
              onPress={() => onPick(league)}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

/**
 * The resting control: artwork, the competition's name, and the chevron.
 *
 * ⚠ The press dim is on the CONTENT row, which is the glass shell's sibling —
 * a `Pressable` style callback returning `{ opacity }` would put a fractional
 * alpha on the shell's ancestor and switch the glass off (ADR 0122).
 */
function Trigger({
  league,
  crown,
  height,
  open,
  disclosed,
  label,
  hint,
  onPress,
}: {
  league: LeagueOption | undefined;
  crown: boolean;
  height: number;
  open: boolean;
  disclosed: boolean;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const box = league ? artworkBox(league, crown ? 'triggerCrown' : 'trigger') : null;
  /**
   * ⚠ The mark COLUMN is the widest cut for this tone, not the drawn box: a
   * drawn lockup is ~35pt where a landscape mark is 54, and sizing the column
   * to the artwork would slide the name left and right as the reader changes
   * competition. The name starts at one x on this screen, always.
   */
  const column = crown ? Size.leagueChipMarkWCrown : Size.leagueChipMarkW;

  return (
    <Pressable
      onPress={onPress}
      disabled={!disclosed}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={label}
      accessibilityHint={disclosed ? hint : undefined}>
      {({ pressed }) => (
        <View style={[styles.trigger, { height }]}>
          {LIQUID ? (
            <GlassView style={styles.triggerShell} glassEffectStyle="regular" colorScheme="dark" />
          ) : (
            <View style={[styles.triggerShell, styles.triggerShellFlat]} />
          )}
          <View style={[styles.triggerRow, pressed && styles.pressed]}>
            <View style={[styles.triggerMark, { width: column }]}>
              {league && box ? (
                <LeagueArtwork option={league} width={box.width} height={box.height} />
              ) : null}
            </View>
            <Text variant="headline" numberOfLines={1} style={styles.triggerName}>
              {league?.name ?? ''}
            </Text>
            {disclosed ? <Chevron expanded={open} color="textSecondary" /> : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

/**
 * One competition in the panel.
 *
 * ⚠ **No entrance animation of its own.** The rows used to stagger in with
 * `FadeIn`, because the panel grew as a box and its contents had to arrive into
 * it. The panel fades as a whole now (ADR 0163), and a second, slower fade
 * inside it only made the list look like it was lagging its own container.
 */
function Row({
  league,
  selected,
  onPress,
}: {
  league: LeagueOption;
  selected: boolean;
  onPress: () => void;
}) {
  const box = artworkBox(league, 'row');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      accessibilityLabel={league.name}
      style={styles.row}>
      {({ pressed }) => (
        <View
          style={[
            styles.rowBody,
            { opacity: selected ? 1 : IDLE_ROW_OPACITY },
            pressed && styles.pressed,
          ]}>
          <View style={styles.rowMark}>
            {box ? <LeagueArtwork option={league} width={box.width} height={box.height} /> : null}
          </View>
          <Text
            variant="bodyStrong"
            color={selected ? 'text' : 'textSecondary'}
            numberOfLines={1}
            style={styles.rowName}>
            {league.name}
          </Text>
          {selected ? <Check /> : null}
        </View>
      )}
    </Pressable>
  );
}

/**
 * What artwork a league draws, in ONE place — the trigger and the rows share
 * this decision by construction rather than by agreement (ADR 0153's rule,
 * whose consequences section is entirely about what happens when they do not).
 *
 * Precedence is `mark → logoUrl → nothing`. ⚠ There is no text branch any more
 * and there must not be one: the name is ALWAYS beside the artwork now, so a
 * league that arrives with no logo reads perfectly — which is the fix ADR 0160
 * wanted and could not have, since a 46pt chip had only the name to draw with
 * and broke it mid-word.
 */
function LeagueArtwork({
  option,
  width,
  height,
}: {
  option: LeagueOption;
  width: number;
  height: number;
}) {
  if (option.mark) {
    // ⚠ Inked `text`, not `accent` (ADR 0133/0153): a drawn lockup has no
    // colour of its own and white is its own ink on a dark ground.
    return <CompetitionMark kind={option.mark} height={height} color="text" decorative />;
  }
  if (option.logoUrl) {
    return (
      <Image
        source={{ uri: option.logoUrl }}
        style={{ width, height }}
        contentFit="contain"
        accessible={false}
      />
    );
  }
  return null;
}

/** Where a mark is being drawn. Three boxes, and no slot-count arithmetic. */
type MarkSlot = 'triggerCrown' | 'trigger' | 'row';

/**
 * The artwork box for a slot.
 *
 * ⚠ A drawn lockup is sized by its own HEIGHT token and measured ratio, never
 * by the landscape mark box: it is roughly square with a wordmark inside it, so
 * at a landscape mark's height its words become a smudge (`Size.competitionMark`).
 */
function artworkBox(
  option: LeagueOption,
  slot: MarkSlot,
): { width: number; height: number } | null {
  if (option.mark) {
    const height = slot === 'triggerCrown' ? Size.leagueChipLockupHCrown : Size.competitionMark;
    return { width: height * COMPETITION_MARK_RATIO[option.mark], height };
  }
  if (!option.logoUrl) return null;
  return slot === 'triggerCrown'
    ? { width: Size.leagueChipMarkWCrown, height: Size.leagueChipMarkHCrown }
    : { width: Size.leagueChipMarkW, height: Size.leagueChipMarkH };
}

/**
 * The open panel's height — the ONLY place the catalogue's length shows up in a
 * number, and it grows by one row rather than dividing a fixed gutter. That
 * difference is the whole decision (ADR 0162).
 *
 * ⚠ Rows plus the scroll content's own padding, and nothing else. It lost the
 * `trayPad` band with the double-bezel tray (ADR 0163) — the panel is one
 * surface now, not a shell around an inner.
 */
function panelHeight(count: number): number {
  return Spacing.one * 2 + count * Size.leagueMenuRowH;
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: Colors.dark.recess },
  trigger: { justifyContent: 'center' },
  triggerShell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.pill,
  },
  /** Only where liquid glass is missing does the capsule become flat paint. */
  triggerShellFlat: {
    backgroundColor: Colors.dark.tabBar,
    borderWidth: 1,
    borderColor: Colors.dark.hairlineMid,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Size.leagueMenuPadX,
  },
  /** Width is set inline from the tone's widest cut — see `Trigger`. */
  triggerMark: { alignItems: 'center', justifyContent: 'center' },
  triggerName: { flex: 1 },
  pressed: { opacity: PRESSED_OPACITY },
  /**
   * The panel: ONE opaque surface, positioned in window coordinates from the
   * trigger's measured box (ADR 0163). `left`/`width`/`top`/`height` and
   * `transformOrigin` are all set inline — see `MenuOverlay`.
   *
   * ⚠⚠ **Paint, not glass, and that is the point.** ADR 0162 built this as the
   * 0090/0091 tray — a `GlassView` shell around an opaque inner — which meant
   * the only glass was a 5pt rim (trap 59 forces the body opaque), while the
   * glass RULES governed the whole animation: no fractional alpha on an
   * ancestor, no scale. That is why the open/close had to animate HEIGHT, and a
   * layout animation is what produced a stall, a sliver and a rim-at-zero-height
   * in three consecutive bug reports. A rim was not worth it. ⚠ Putting glass
   * back here brings the height animation back with it.
   *
   * `sheetGround` rather than `trayInner`, and its own token comment says why:
   * "modal sheets — glass over a scrim reads muddy". This is a sheet over a
   * scrim. ⚠ No `overflow: 'hidden'` is needed any more — nothing here shrinks
   * to a hairline, because nothing here animates its box at all.
   */
  panel: {
    position: 'absolute',
    borderRadius: Radius.tray,
    // ⚠ The hairline of `Surfaces.glass`, but NOT its translucent fill — the
    // surface under it is opaque on purpose (trap 59).
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
    backgroundColor: Colors.dark.sheetGround,
    overflow: 'hidden',
  },
  /** ⚠ The pad lives on the scroll CONTENT, so it scrolls with the rows. */
  rows: { paddingVertical: Spacing.one },
  /**
   * The selection, riding the panel's own opaque ground. Rows paint over it.
   *
   * ⚠ The SEGMENTED THUMB's fill (`segThumb`), which is what this is: a raised
   * step on a dark surface marking one of a set. A step up from `trayInner` big
   * enough to read, with the hairline the app gives every raised surface — and
   * no accent ring, which the flat league plate carried only because it was
   * standing in for missing glass. The lime here is the check alone.
   */
  lozenge: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: Size.leagueMenuRowH,
    borderRadius: Radius.control,
    backgroundColor: Colors.dark.segThumb,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
  },
  row: { height: Size.leagueMenuRowH },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Size.leagueMenuPadX,
  },
  /** The 0089 ground cut's width, so every name in the panel starts level. */
  rowMark: {
    width: Size.leagueChipMarkW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { flex: 1 },
});
