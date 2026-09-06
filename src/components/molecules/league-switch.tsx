/**
 * The horizontal league selector — 0089's marks on a STATIC glass rail (the
 * nav bar's own material; flat ink paint where liquid glass is missing) with
 * a liquid-glass plate that GLIDES to the selection and DRAGS under the
 * finger (ADR 0117/0118/0120), echoing the NativeTabs bar. The rail serves both
 * grounds (`tone`): the CROWN's bright band (Matchdays, Table) or the screen
 * body (Clubs); only the slot height differs.
 *
 * ⚠ **The rail never scrolls** (ADR 0118). Every league shares the gutter
 * width as an equal flexed slot — the crown mark wears 0116's smaller first
 * cut so five slots still fit. A sixth league shrinks the slots further; the
 * mark tokens are the lever if that day comes.
 *
 * ⚠ **Artwork alone — no text label** (ADR 0031, which 0089 and 0117 keep).
 * The chips are a filter row, not a legend; the name still reaches VoiceOver
 * through `accessibilityLabel`. The text branch survives for a league that
 * arrives with NO artwork at all — an empty chip is unpickable.
 *
 * ⚠ **Marks are FULL COLOUR at rest** (ADR 0123, superseding 0089's
 * grayscale idle): on the dark glass rail a desaturated mark read as
 * washed-out white, not as "off". Idle chips recede by the 0.72 dim alone;
 * selection is the plate plus the chip brightening in `Motion.quick`.
 *
 * ⚠ The plate refracts only the screen's own ground (trap 59's rule): chips
 * paint OVER it and nothing renders under it inside the rail.
 *
 * ⚠ Artwork comes from the API (`league.logoUrls`), not a bundled asset, so a
 * new league appears without an asset drop. Prefer `icon`, fall back to
 * `primary` — only LaLiga ships an icon-only cut today.
 */
import { Image } from 'expo-image';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Text } from '@/components/atoms';
import { Colors, Glide, Motion, Radius, Size } from '@/constants/theme';
import { hapticToggle } from '@/lib/haptics';

export interface LeagueOption {
  slug: string;
  name: string;
  /** `logoUrls.icon ?? logoUrls.primary ?? logoUrl`, resolved by the screen. */
  logoUrl: string | null;
}

export interface LeagueSwitchProps {
  leagues: readonly LeagueOption[];
  active: string;
  onSelect: (slug: string) => void;
  /** Which ground the row sits on. The default is the screen body. */
  tone?: 'crown' | 'ground';
}

const LIQUID = isLiquidGlassAvailable();

/** The whole idle chip dims a step on the ink rail (was crown-only pre-0117). */
const IDLE_CHIP_OPACITY = 0.72;

interface ChipBox {
  x: number;
  width: number;
}

interface Slot extends ChipBox {
  slug: string;
  logoUrl: string | null;
}

export function LeagueSwitch({ leagues, active, onSelect, tone = 'ground' }: LeagueSwitchProps) {
  const crown = tone === 'crown';
  const reduceMotion = useReducedMotion();
  // Slots are equal by flex, but the plate still follows measured boxes —
  // rounding and the text branch keep the truth in onLayout, not arithmetic.
  const [boxes, setBoxes] = useState<Record<string, ChipBox>>({});

  /** Whether the plate has been placed once. The first placement is assigned. */
  const placed = useRef(false);
  const tx = useSharedValue(0);
  const w = useSharedValue(0);
  const shown = useSharedValue(0);
  /** The plate's position when the drag began. */
  const grabX = useSharedValue(0);
  /**
   * 0 = resting (frosted plate behind the marks), 1 = touched (the LENS over
   * them). The nav's two states: the lens exists only under a finger —
   * always-on, it smeared the resting mark into unreadable streaks (ADR 0122).
   * ⚠ DISCRETE, never animated: a fractional alpha on any ancestor DISABLES
   * a UIVisualEffectView — a crossfade rendered the lens as nothing.
   */
  const lensUp = useSharedValue(0);
  /**
   * ⚠ The lens is MOUNTED only while touched (`touching`), never parked at
   * opacity 0: a glass view set up inside an alpha-0 ancestor stays BLANK
   * when the alpha returns — the second way the plate "disappeared" under a
   * held finger (simulator-caught, twice). Mount fresh, born visible.
   */
  const [touching, setTouching] = useState(false);
  /** The press swell — ours, a transform; see `Glide.swell`. */
  const lensScale = useSharedValue(1);
  /**
   * 0→1 while the lens is held: the rail's backdrop capsule INFLATES
   * `Glide.hover` pt on every edge — the nav bar getting bigger in place
   * under a grabbed lens (ADR 0124). Bounds only; nothing else moves.
   */
  const railHover = useSharedValue(0);

  // ⚠ Placement happens at EVENT time (the deck's `jump()` pattern), never in
  // an effect: the React Compiler's immutability rule forbids a shared value
  // written by both an effect and the pan's worklets.
  const placePlate = (box: ChipBox, animate: boolean) => {
    if (!animate || reduceMotion) {
      tx.value = box.x;
      w.value = box.width;
    } else {
      tx.value = withSpring(box.x, Glide.spring);
      // Width is a layout prop, animated knowingly: slots are equal-width in
      // practice, so this spring only ever runs for the text-branch outlier.
      w.value = withSpring(box.width, Glide.spring);
    }
    shown.value = 1;
    placed.current = true;
  };

  // The drag needs every slot measured, in leagues order.
  const measured = leagues.map((league) => {
    const box = boxes[league.slug];
    return box
      ? { slug: league.slug, x: box.x, width: box.width, logoUrl: league.logoUrl }
      : null;
  });
  const slots: Slot[] | null = measured.every(Boolean) ? (measured as Slot[]) : null;

  /** The selection change alone — the drag's snap already moved the plate. */
  const select = (slug: string) => {
    if (slug === active) return;
    void hapticToggle();
    onSelect(slug);
  };

  // The nav's drag: the plate tracks the finger along the rail and snaps to
  // the nearest slot on release, committing that league. Finger tracking is
  // direct manipulation and stays under Reduce Motion (0113's rule); only the
  // release snap becomes an assignment.
  const pan = Gesture.Pan()
    .enabled(slots !== null && leagues.length > 1)
    .activeOffsetX([-Glide.activateX, Glide.activateX])
    .failOffsetY([-Glide.failY, Glide.failY])
    // A touch DOWN on the plate raises the lens before any movement — the
    // tap-and-hold magnify. The swell is OURS (a scale spring): the glass
    // itself takes no touches at all (ADR 0122).
    .onTouchesDown((e) => {
      if (!LIQUID) return;
      const t = e.allTouches[0];
      if (!t || t.x < tx.value || t.x > tx.value + w.value) return;
      lensUp.value = 1;
      if (!reduceMotion) {
        lensScale.value = withSpring(Glide.swell, Glide.spring);
        railHover.value = withSpring(1, Glide.spring);
      }
      runOnJS(setTouching)(true);
    })
    .onStart(() => {
      grabX.value = tx.value;
      // A drag from anywhere on the rail also rides under the lens.
      if (LIQUID) {
        lensUp.value = 1;
        if (!reduceMotion) {
          lensScale.value = withSpring(Glide.swell, Glide.spring);
          railHover.value = withSpring(1, Glide.spring);
        }
        runOnJS(setTouching)(true);
      }
    })
    .onUpdate((e) => {
      if (!slots) return;
      const first = slots[0];
      const last = slots[slots.length - 1];
      const min = first.x;
      const max = last.x + last.width - w.value;
      const next = grabX.value + e.translationX;
      tx.value = next < min ? min : next > max ? max : next;
    })
    .onEnd(() => {
      if (!slots) return;
      const center = tx.value + w.value / 2;
      let best = slots[0];
      let bestD = Number.MAX_VALUE;
      for (const slot of slots) {
        const d = Math.abs(slot.x + slot.width / 2 - center);
        if (d < bestD) {
          bestD = d;
          best = slot;
        }
      }
      if (reduceMotion) {
        tx.value = best.x;
        w.value = best.width;
      } else {
        tx.value = withSpring(best.x, Glide.spring);
        w.value = withSpring(best.width, Glide.spring);
      }
      runOnJS(select)(best.slug);
    })
    // Fires on release, cancel, or failure alike — the lens never outlives
    // the finger.
    .onFinalize(() => {
      if (LIQUID) {
        lensUp.value = 0;
        lensScale.value = 1;
        railHover.value = reduceMotion ? 0 : withSpring(0, Glide.spring);
        runOnJS(setTouching)(false);
      }
    });

  // The hover: ONLY the backdrop capsule inflates, by animated INSETS —
  // bounds, never a transform (0122's finding 3), and never the layout:
  // chips, plates and the gesture's coordinates stay exactly put.
  const hoverGrow = useAnimatedStyle(() => {
    const e = -Glide.hover * railHover.value;
    return { top: e, bottom: e, left: e, right: e };
  });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.rail}>
        {/* The rail's capsule, split from the layout so the hover can grow
            it past its bounds (ADR 0124). */}
        <Animated.View style={[styles.railBack, hoverGrow]} pointerEvents="none">
          {LIQUID ? (
            // The rail is GLASS TOO (ADR 0120) — the nav bar is the system's
            // material, not paint, and a flat fill read matte beside it.
            // ⚠ UNTINTED, dark scheme: a `tabBar` tint crushed the glass to
            // solid black (screenshotted against the bar); the bar's smoky
            // translucency IS the untinted dark-appearance material.
            <GlassView style={styles.railBackFill} glassEffectStyle="regular" colorScheme="dark" />
          ) : (
            <View style={[styles.railBackFill, styles.railBackFlat]} />
          )}
        </Animated.View>
        {/* Resting selection: the frosted plate BEHIND the marks (0119's
            material), so the selected mark stays crisp. */}
        <SelectionPlate
          crown={crown}
          tx={tx}
          w={w}
          shown={shown}
          lensUp={lensUp}
          lensScale={lensScale}
          slots={null}
          lens={false}
        />
        {leagues.map((league) => (
          <Chip
            key={league.slug}
            league={league}
            selected={league.slug === active}
            crown={crown}
            onPress={() => {
              select(league.slug);
              const box = boxes[league.slug];
              if (box) placePlate(box, placed.current);
            }}
            onBox={(box) => {
              setBoxes((prev) => {
                const held = prev[league.slug];
                return held && held.x === box.x && held.width === box.width
                  ? prev
                  : { ...prev, [league.slug]: box };
              });
              // First placement, and re-pinning after any relayout — assigned,
              // never animated (segmented.tsx's rule).
              if (league.slug === active) placePlate(box, false);
            }}
          />
        ))}
        {/* ⚠ The LENS rides OVER the marks (ADR 0122) — last child, so it
            refracts and magnifies the mark under the finger the way the
            nav's lens warps its icons. A deliberate divergence from trap
            59's ordering: magnifying the content IS this element's job.
            Mounted only while touched — see `touching`. */}
        {touching ? (
          <SelectionPlate
            crown={crown}
            tx={tx}
            w={w}
            shown={shown}
            lensUp={lensUp}
            lensScale={lensScale}
            slots={slots}
            lens
          />
        ) : null}
      </View>
    </GestureDetector>
  );
}

/**
 * The selection plate, worn in two states (ADR 0122): `lens={false}` is the
 * RESTING plate — 0119's frosted regular glass, behind the marks, swapped
 * out while the lens is up; `lens` is the TOUCH state — 0121's clear
 * interactive lens over the marks, invisible until a finger lands on it.
 * Both track the same shared values. Separate component so the shared-value reads stay in
 * one small scope beside no writers — the deck's `DeckLayer` React Compiler
 * split; the parent owns the values and every write.
 */
function SelectionPlate({
  crown,
  tx,
  w,
  shown,
  lensUp,
  lensScale,
  slots,
  lens,
}: {
  crown: boolean;
  tx: SharedValue<number>;
  w: SharedValue<number>;
  shown: SharedValue<number>;
  lensUp: SharedValue<number>;
  lensScale: SharedValue<number>;
  slots: Slot[] | null;
  lens: boolean;
}) {
  // ⚠ Opacity here only ever lands on 0 or 1 — `shown` and `lensUp` are both
  // assigned, never animated: a fractional alpha on the wrapper DISABLES the
  // UIVisualEffectView inside it (ADR 0122). The swell is BOUNDS growth,
  // recentered — a transform scale rasterizes the glass's sampled backdrop
  // and the lens dies to a murky smear; real bounds re-render it crisp.
  const slotH = crown ? Size.leagueChipHCrown : Size.leagueChipH;
  const slide = useAnimatedStyle(() => {
    const grow = lens ? lensScale.value : 1;
    return {
      opacity: lens ? 1 : shown.value * (1 - lensUp.value),
      width: w.value * grow,
      height: slotH * grow,
      transform: [
        { translateX: tx.value - (w.value * (grow - 1)) / 2 },
        { translateY: -(slotH * (grow - 1)) / 2 },
      ],
    };
  });

  // The MAGNIFIER (ADR 0122): the public glass material BLURS close content
  // whatever its flags, so the crisp magnification is composed — sharp mark
  // copies at `Glide.magnify` scale ride INSIDE the lens, counter-translated
  // so the bubble is a true viewport onto the rail: content point p renders
  // at p·MAG + T where T keeps the lens's centre looking at itself.
  const slotH2 = crown ? Size.leagueChipHCrown : Size.leagueChipH;
  const markW = crown ? Size.leagueChipMarkWCrown : Size.leagueChipMarkW;
  const markH = crown ? Size.leagueChipMarkHCrown : Size.leagueChipMarkH;
  const magStyle = useAnimatedStyle(() => {
    const grow = lens ? lensScale.value : 1;
    return {
      transform: [
        { translateX: (w.value * grow) / 2 - Glide.magnify * (tx.value + w.value / 2) },
        { translateY: (slotH2 * grow) / 2 - (markH * Glide.magnify) / 2 },
      ],
    };
  });

  // Without liquid glass there is no lens state at all — the resting plate
  // (flat fallback) is the whole selection, and the lens is never mounted.
  if (lens && !LIQUID) return null;

  // ⚠ Neither plate takes touches (ADR 0122): the native interactive touch
  // response vanished the glass under a held finger, so the swell is ours —
  // raised by the rail pan's onTouchesDown, drawn as a scale spring.
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      style={[styles.plate, crown ? styles.plateCrown : styles.plateGround, slide]}>
      {lens ? (
        // ⚠ The LENS (ADR 0121/0122): clear interactive glass for the rim
        // and ambience, with the sharp magnifier viewport composed on top.
        // Untinted and scheme-free — it has no appearance of its own.
        <>
          <GlassView style={styles.plateBody} glassEffectStyle="clear" isInteractive />
          {slots ? (
            <View style={styles.lensViewport}>
              <Animated.View style={magStyle}>
                {slots.map((slot) =>
                  slot.logoUrl ? (
                    <Image
                      key={slot.slug}
                      source={{ uri: slot.logoUrl }}
                      style={{
                        position: 'absolute',
                        left:
                          Glide.magnify * (slot.x + slot.width / 2) -
                          (markW * Glide.magnify) / 2,
                        width: markW * Glide.magnify,
                        height: markH * Glide.magnify,
                      }}
                      contentFit="contain"
                      accessible={false}
                    />
                  ) : null,
                )}
              </Animated.View>
            </View>
          ) : null}
        </>
      ) : LIQUID ? (
        <GlassView style={styles.plateBody} glassEffectStyle="regular" colorScheme="dark" />
      ) : (
        <View style={[styles.plateBody, styles.plateFlat]} />
      )}
    </Animated.View>
  );
}

function Chip({
  league,
  selected,
  crown,
  onPress,
  onBox,
}: {
  league: LeagueOption;
  selected: boolean;
  crown: boolean;
  onPress: () => void;
  onBox: (box: ChipBox) => void;
}) {
  const reduceMotion = useReducedMotion();
  const sel = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    const t = selected ? 1 : 0;
    sel.value = reduceMotion ? t : withTiming(t, { duration: Motion.quick });
  }, [selected, reduceMotion, sel]);

  // The idle dim lights to full as the plate arrives.
  const chipFade = useAnimatedStyle(() => ({
    opacity: IDLE_CHIP_OPACITY + (1 - IDLE_CHIP_OPACITY) * sel.value,
  }));

  // The crown row wears the larger cut (ADR 0116, resized by 0118); the
  // ground row keeps 0089's.
  const markSize = crown ? styles.markCrown : styles.mark;

  return (
    <Pressable
      onLayout={(e: LayoutChangeEvent) =>
        onBox({ x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })
      }
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={league.name}
      style={({ pressed }) => [styles.slot, pressed && styles.pressed]}>
      <Animated.View style={[styles.chip, crown && styles.chipCrown, chipFade]}>
        {league.logoUrl ? (
          // Full colour at rest (ADR 0123) — one Image, no grayscale layer,
          // no SVG fork: both existed only to serve 0089's desaturation.
          <Image
            source={{ uri: league.logoUrl }}
            style={markSize}
            contentFit="contain"
            accessible={false}
          />
        ) : (
          // The rail is ink on BOTH tones now, so idle text is light on both;
          // the crown keeps its lit selected ink (recorded divergence: this
          // branch swaps colour instantly, no crossfade).
          <Text
            variant="eyebrow"
            color={selected ? (crown ? 'crownChipInk' : 'text') : 'textFaint'}>
            {league.name}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The rail's LAYOUT box (ADR 0117/0118/0124): no scroll, every league an
  // equal flexed slot. The visible capsule lives on `railBack` so the hover
  // can inflate it without the layout moving.
  rail: {
    flexDirection: 'row',
    padding: Size.leagueRailPad,
  },
  /** The capsule backdrop — grown past its bounds by the hover (ADR 0124). */
  railBack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  railBackFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.pill,
  },
  /** Only where liquid glass is missing does the capsule become flat paint. */
  railBackFlat: { backgroundColor: Colors.dark.tabBar },
  slot: { flex: 1 },
  pressed: { opacity: 0.7 },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    height: Size.leagueChipH,
    borderRadius: Radius.pill,
  },
  chipCrown: { height: Size.leagueChipHCrown },
  // The sliding plate — selection's ground lives HERE now, not on the chip.
  // ⚠ NO `overflow: 'hidden'` (ADR 0122): the interactive swell scales the
  // glass past its bounds, and a clipping wrapper would crop the magnified
  // rim. The pill lives on the glass itself.
  plate: {
    position: 'absolute',
    left: 0,
    top: Size.leagueRailPad,
  },
  plateCrown: { height: Size.leagueChipHCrown },
  plateGround: { height: Size.leagueChipH },
  plateBody: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.pill,
  },
  // Clips the magnifier's mark copies to the lens bubble. Clipping a plain
  // View is safe — only the GLASS must never sit under overflow: 'hidden'.
  lensViewport: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  // Where liquid glass is missing the plate is the segmented thumb's flat
  // lozenge with the accent ring (0090/0096's degrade pattern).
  plateFlat: {
    backgroundColor: Colors.dark.segThumb,
    borderWidth: 1,
    borderColor: Colors.dark.accentRing,
    borderRadius: Radius.pill,
  },
  mark: { width: Size.leagueChipMarkW, height: Size.leagueChipMarkH },
  markCrown: { width: Size.leagueChipMarkWCrown, height: Size.leagueChipMarkHCrown },
});
