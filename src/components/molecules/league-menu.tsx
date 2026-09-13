/**
 * The league selector, as a DROPDOWN (ADR 0162) — a liquid-glass trigger
 * capsule naming the competition in view, and a panel that blooms out of it
 * carrying every one. Supersedes `LeagueSwitch`'s rail (0117–0124), which had
 * run out of room: seven equal slots on a 375pt device gave each mark 46.14pt
 * and 0160 spent its last lever shrinking the artwork to 38×19 to fit.
 *
 * ⚠ **The slot arithmetic is GONE, and that is the point.** A dropdown's cost
 * does not scale with the catalogue — an eighth league is one more row on a
 * panel, not another division of a fixed gutter. `Size.leagueChipMarkWCrown`
 * (54×27) is back at rest on the crown, bigger than the rail has drawn since
 * five leagues.
 *
 * ⚠ **The name is BACK** (ADR 0162 amends 0031). 0031 kept labels off the rail
 * because a row of tiles is a filter, not a legend, and seven names at 46pt
 * became the mid-word smudge 0160 documents. A trigger names ONE thing and a
 * panel row is a menu item — both can afford words, and the text branch that
 * had to stand in for missing artwork is deleted: a league with no logo still
 * reads, because every row says its name.
 *
 * ⚠⚠ **The panel's body is OPAQUE, and it must stay so — trap 59.** A glass
 * surface refracts only the screen's OWN ground; anything layered behind it
 * ghosts through, text and featureless slabs alike (the NEXT UP deck hit this
 * twice, ADR 0113). This panel hangs over a standings table. So it is built as
 * the double-bezel TRAY (ADR 0090/0091): a glass SHELL, and an opaque inner
 * surface `Size.trayPad` inside it that the rows sit on. The glass you can see
 * is the rim.
 *
 * ⚠ Where liquid glass IS load-bearing, it sits on a legal ground: the TRIGGER
 * and the panel's SHELL refract the crown gradient / the mesh, and nothing else.
 *
 * ⚠⚠ **The selection lozenge is NOT glass, and trying it was the lesson.** The
 * first build gave it the rail plate's `GlassView`, reasoning that it would ride
 * the panel's own inner the way the plate rode the rail's capsule. It rendered
 * as NOTHING (simulator, 2026-09-13): the rail's capsule is itself glass over
 * the live screen, so the plate had a real backdrop to bend, while this inner is
 * an opaque flat slab and there is nothing behind it to refract. ⚠ The general
 * form — **glass over an opaque fill is a no-op, not a subtle effect** — is the
 * other half of trap 59, and the two together fully constrain this panel: it may
 * not be transparent (the table would ghost through it) and glass on top of it
 * cannot be seen. So the lozenge is paint.
 *
 * ⚠⚠ **Never put a fractional opacity, or a scale, on an ancestor of a
 * `GlassView`** (ADR 0122, learned three times). A fractional alpha DISABLES
 * the UIVisualEffectView; a transform scale rasterizes its sampled backdrop
 * into a smear. So: the panel opens by animating its HEIGHT (bounds) and its
 * `translateY` (a translate is what the rail's plate already rides on); the
 * press dim lands on the trigger's CONTENT row, which is the shell's sibling,
 * never on the box that holds it; and the panel is MOUNTED only while open —
 * a glass view set up inside an alpha-0 ancestor stays blank when the alpha
 * returns.
 *
 * ⚠ The whole control is wrapped in a `GlassContainer` so the trigger and the
 * panel MERGE while they overlap and pull apart as the panel travels down —
 * the liquid in liquid glass. `Glide.merge` is the distance at which they stop
 * being one blob, and it is **device-judged**: if they read as separate from
 * the first frame, that number is the lever, not the geometry.
 *
 * ⚠⚠ **The panel is PLACED, not assumed.** It measures the trigger in the
 * window at open time and drops downward only if the rows actually fit between
 * it and the tab bar; otherwise it opens UPWARD, and if neither side can hold
 * the whole catalogue it takes the roomier one and scrolls. The first build
 * always dropped down, and on Clubs — where the control sits halfway down the
 * body rather than in the crown — the last league landed UNDER the tab bar and
 * could not be tapped (simulator, 2026-09-13). ⚠ This is the part that has to
 * keep working as leagues are added, because it is the reason a dropdown was
 * the answer to a crowded rail in the first place.
 *
 * ⚠ Artwork comes from the API (`league.logoUrls`), not a bundled asset, and a
 * drawn `mark` OUTRANKS a `logoUrl` (ADR 0153): a lockup is an editorial
 * choice, a URL is whatever the wire happened to have. Chosen in ONE place,
 * `LeagueArtwork`, used by the trigger and the rows alike — 0153's rule, kept
 * for 0153's reason.
 *
 * ⚠ Marks are FULL COLOUR at rest (ADR 0123). An idle row recedes by the 0.72
 * dim alone; selection is the lozenge, the brightened ink and the check.
 */
import { Image } from 'expo-image';
import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {
  Check,
  Chevron,
  COMPETITION_MARK_RATIO,
  CompetitionMark,
  Text,
  type CompetitionMarkKind,
} from '@/components/atoms';
import { BottomTabInset, Colors, Glide, Motion, Radius, Size, Spacing } from '@/constants/theme';
import { useCrownLift } from '@/hooks/use-crown-lift';
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
}

const LIQUID = isLiquidGlassAvailable();

/** An idle row recedes a step, exactly as an idle chip did (ADR 0117/0123). */
const IDLE_ROW_OPACITY = 0.72;

/** The press dim, the app's `pressed` value. ⚠ Lands on CONTENT, never on glass. */
const PRESSED_OPACITY = 0.7;

export function LeagueMenu({ leagues, active, onSelect, copy, tone = 'ground' }: LeagueMenuProps) {
  const crown = tone === 'crown';
  const reduceMotion = useReducedMotion();

  /**
   * Two states, not one. `open` is the LOGICAL state — the chevron, the
   * a11y expansion, whether a tap commits. `mounted` is whether the panel
   * EXISTS, and it outlives `open` by one collapse so the close animates.
   *
   * ⚠ The panel is never parked invisible between opens (ADR 0122): a
   * `GlassView` set up inside a hidden ancestor comes back blank. Mount
   * fresh, born visible.
   */
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  /**
   * ⚠⚠ On the crown the panel has a PARENT to escape, and a z-index on this
   * control cannot raise it past the crown's own sibling — the screen body. So
   * the crown itself rises, and only while the panel is up: a crown left lifted
   * paints its overflowing gradient layer ON the body and hazes the top of the
   * screen (see `useCrownLift`). On the body tone this is the default no-op, which
   * is correct — the body already paints after the crown.
   */
  const lift = useCrownLift();

  const triggerH = crown ? Size.leagueChipHCrown : Size.leagueMenuTriggerH;
  const panelH = panelHeight(leagues.length);

  /**
   * Where the panel goes, decided at OPEN time from a real measurement — see
   * the header. `height` is what it may actually use, which is `panelH` unless
   * neither side of the trigger can hold it.
   */
  const hostRef = useRef<View>(null);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [place, setPlace] = useState({ up: false, height: panelH });
  /** Rows outnumber the room. The list scrolls rather than being cut short. */
  const capped = place.height < panelH;
  /** The active row's index, or 0 — the lozenge always has somewhere to be. */
  const activeIndex = Math.max(
    0,
    leagues.findIndex((league) => league.slug === active),
  );
  const activeLeague = leagues[activeIndex];

  /**
   * 0 = shut (a capsule tucked under the trigger), 1 = open. ⚠ The scrim's dim
   * reads this SAME value rather than one of its own: the veil the crown lift
   * introduces is only hidden while the scrim is up, so the two must end on the
   * same frame. A second, faster fade left ~140ms of haze on the way out.
   */
  const grow = useSharedValue(0);
  /** Which row the lozenge sits on, in rows. Springs; never a layout write. */
  const row = useSharedValue(activeIndex);

  // ⚠ Every shared-value write happens at EVENT time, never in an effect —
  // the rail's rule, for the React Compiler's reason.
  const raise = (up: boolean, height: number) => {
    setPlace({ up, height });
    row.value = activeIndex;
    grow.value = 0;
    lift(true);
    setMounted(true);
    setOpen(true);
    grow.value = reduceMotion ? 1 : withSpring(1, Glide.spring);
  };

  const openMenu = () => {
    void hapticToggle();
    const host = hostRef.current;
    // ⚠ No ref yet (the very first frame): drop downward at full height rather
    // than not opening. One tap on an unmeasured control is the only cost.
    if (!host) {
      raise(false, panelH);
      return;
    }
    // ⚠ `measureInWindow` is a CALLBACK, so the open lands a frame late. That
    // is deliberate and invisible: the alternative is guessing at a position
    // from `onLayout`, which reports a box relative to a parent that is itself
    // halfway down a scroll view.
    host.measureInWindow((_x, y, _w, h) => {
      // The tab bar is drawn natively and cannot be measured from JS, so the
      // floor is the design token that stands in for it (see `BottomTabInset`).
      const floor = window.height - BottomTabInset;
      const ceiling = insets.top + Spacing.two;
      const below = floor - (y + h) - Size.leagueMenuGap;
      const above = y - ceiling - Size.leagueMenuGap;
      const up = panelH > below && above > below;
      const room = Math.max(Size.leagueMenuShutH, up ? above : below);
      raise(up, Math.min(panelH, room));
    });
  };

  /** The panel is gone: unmount it and give the crown back. One place, so the
   *  lift can never outlive the scrim that hides what it does. */
  const shut = () => {
    setMounted(false);
    lift(false);
  };

  const closeMenu = () => {
    setOpen(false);
    if (reduceMotion) {
      grow.value = 0;
      shut();
      return;
    }
    grow.value = withSpring(0, Glide.spring, (finished) => {
      // ⚠ Guarded: an interrupting re-open restarts this spring, and an
      // unguarded callback would unmount the panel the reader just asked for.
      if (finished) runOnJS(shut)();
    });
  };

  /**
   * ⚠⚠ **A PICK dismisses at once. Only a CANCEL animates.** The collapse
   * animates the panel's HEIGHT, which is a layout prop — and choosing a league
   * is the exact moment the screen does its heaviest work: new query, new
   * standings, a whole list re-rendered. The two compete, and the panel STALLS
   * part-collapsed: a black bar left hanging under the trigger for ~760ms,
   * measured on the simulator and caught by Ed on a screenshot (2026-09-13).
   *
   * Unmounting in the same commit that switches the league leaves nothing to
   * stall. The trigger's new artwork and name are the receipt; the animation
   * was never what confirmed the choice.
   *
   * ⚠ Re-picking what is ALREADY selected changes nothing and does no work, so
   * that path keeps the animated close — it is a cancel wearing a row's clothes.
   */
  const pick = (league: LeagueOption, index: number) => {
    if (league.slug === active) {
      closeMenu();
      return;
    }
    void hapticToggle();
    row.value = index;
    grow.value = 0;
    setOpen(false);
    shut();
    onSelect(league.slug);
  };

  // Height is a layout prop, animated knowingly — bounds growth is the ONE
  // way to animate a glass surface without killing it (ADR 0122, finding 3).
  // The translate carries the merge: the panel starts overlapping the trigger
  // and pulls away to its resting gap.
  const panelGrow = useAnimatedStyle(() => ({
    height: Size.leagueMenuShutH + (place.height - Size.leagueMenuShutH) * grow.value,
    // ⚠ The tuck points AT the trigger, so its sign follows the direction: a
    // panel opening upward that still started 16pt lower would slide away from
    // the capsule it is supposed to be pulling out of.
    transform: [
      { translateY: (place.up ? Size.leagueMenuTuck : -Size.leagueMenuTuck) * (1 - grow.value) },
    ],
  }));

  // ⚠ CLAMPED: `Glide.spring` is underdamped (zeta ≈ 0.70) and undershoots past
  // zero on the way out, which is a negative opacity.
  const scrimFade = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, grow.value)),
  }));

  const lozengeSlide = useAnimatedStyle(() => ({
    transform: [{ translateY: row.value * Size.leagueMenuRowH }],
  }));

  const many = leagues.length > 1;

  /**
   * The glass container's box. It must CONTAIN both the trigger and the panel:
   * a `UIVisualEffectView` masks its own bounds, so a panel hanging outside it
   * would be cropped. Opening upward therefore starts the box above the host
   * and pushes the trigger back down to its real place with a margin — the
   * layout never moves, only what the container encloses.
   */
  const stack = !mounted
    ? { top: 0, height: triggerH }
    : place.up
      ? {
          top: -(Size.leagueMenuGap + place.height),
          height: Size.leagueMenuGap + place.height + triggerH,
        }
      : { top: 0, height: triggerH + Size.leagueMenuGap + place.height };

  return (
    <View ref={hostRef} style={[styles.host, { height: triggerH }]}>
      {/* The dismiss catcher, reaching past every edge of the phone. It is the
          FIRST child, so the trigger and the panel paint over it and a tap on
          the trigger still closes the menu it opened. */}
      {mounted ? (
        <Animated.View style={[styles.scrim, scrimFade]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeMenu}
            accessibilityRole="button"
            accessibilityLabel={copy.close}
          />
        </Animated.View>
      ) : null}

      <Merge style={[styles.stack, stack]}>
        <Trigger
          league={activeLeague}
          crown={crown}
          height={triggerH}
          open={open}
          disclosed={many}
          label={copy.label(activeLeague?.name ?? '')}
          hint={copy.hint}
          // Pushed back down to the host's own top when the box starts above it.
          offset={mounted && place.up ? Size.leagueMenuGap + place.height : 0}
          onPress={open ? closeMenu : openMenu}
        />

        {mounted ? (
          <Animated.View
            style={[
              styles.panel,
              // ⚠ Anchored by the edge it grows FROM: pinning the bottom is
              // what makes an upward panel expand toward the trigger instead of
              // away from it.
              place.up
                ? { bottom: triggerH + Size.leagueMenuGap }
                : { top: triggerH + Size.leagueMenuGap },
              panelGrow,
            ]}
            accessibilityViewIsModal>
            {LIQUID ? (
              <GlassView
                style={styles.panelShell}
                glassEffectStyle="regular"
                colorScheme="dark"
              />
            ) : (
              <View style={[styles.panelShell, styles.panelShellFlat]} />
            )}
            {/* ⚠⚠ OPAQUE, and clipping. Opaque because the rows below this
                panel would otherwise ghost straight through it (trap 59);
                clipping because the rows are drawn at full height while the
                box is still growing. Clipping a plain View is safe — it is
                GLASS that must not be scaled, and this crops nothing that
                swells. */}
            <View style={styles.panelInner}>
              {/* ⚠ A `ScrollView` ALWAYS, scrolling only when the rows outgrow
                  the room the measurement found. The alternative — clipping the
                  overflow — is a silent truncation: the reader is shown a menu
                  that looks complete and is missing its last leagues. Nothing
                  else changes, because with room to spare it never scrolls. */}
              <ScrollView
                scrollEnabled={capped}
                showsVerticalScrollIndicator={capped}
                contentContainerStyle={styles.rows}>
                {/* ⚠ Paint, not glass, and the same on both paths — see the
                    header. There is no `LIQUID` branch here because there is
                    nothing liquid glass could add over an opaque slab. ⚠ INSIDE
                    the scroll content, so it travels with the row it marks. */}
                <Animated.View
                  style={[styles.lozenge, lozengeSlide]}
                  pointerEvents="none"
                />
                {leagues.map((league, index) => (
                  <Row
                    key={league.slug}
                    league={league}
                    index={index}
                    selected={league.slug === active}
                    onPress={() => pick(league, index)}
                  />
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        ) : null}
      </Merge>
    </View>
  );
}

/**
 * The liquid-glass CONTAINER, or a plain box where there is none.
 *
 * ⚠ One line to revert. `UIGlassContainerEffect` is what lets the trigger and
 * the panel read as one body of glass while they overlap; if it ever misbehaves
 * under RN's compositing — the way the interactive touch response did in 0122 —
 * dropping to the `View` branch costs the merge and nothing else.
 *
 * ⚠ `box-none`: the container is bigger than what it holds while the panel is
 * open, and the empty strip between them must let a tap through to the scrim.
 */
function Merge({ children, style }: { children: ReactNode; style: StyleProp<ViewStyle> }) {
  return LIQUID ? (
    <GlassContainer spacing={Glide.merge} style={style} pointerEvents="box-none">
      {children}
    </GlassContainer>
  ) : (
    <View style={style} pointerEvents="box-none">
      {children}
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
  offset,
  onPress,
}: {
  league: LeagueOption | undefined;
  crown: boolean;
  height: number;
  open: boolean;
  disclosed: boolean;
  label: string;
  hint: string;
  /** Top margin holding the capsule at the host's own top — see the call site. */
  offset: number;
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
      accessibilityHint={disclosed ? hint : undefined}
      style={{ marginTop: offset }}>
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
 * ⚠ The entrance is a Reanimated `entering`, not a hand-rolled fade: under
 * Reduce Motion the whole layout animation is skipped and the row lands final,
 * which for an arrival IS the accommodation (trap 63's other half).
 *
 * ⚠ `Motion.quick`, not `base`: the cascade has to finish about when the panel's
 * own spring settles (~300ms). At `base` the last of seven rows was still
 * fading in ~190ms after the box had stopped growing, which reads as the panel
 * waiting for its own contents.
 */
function Row({
  league,
  index,
  selected,
  onPress,
}: {
  league: LeagueOption;
  index: number;
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
        <Animated.View
          entering={FadeIn.duration(Motion.base).delay(index * Motion.stagger)}
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
        </Animated.View>
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
 * The open panel's height — the ONLY place the catalogue's length shows up in
 * a number, and it grows by one row rather than dividing a fixed gutter. That
 * difference is the whole decision (ADR 0162).
 */
function panelHeight(count: number): number {
  return Size.trayPad * 2 + Spacing.one * 2 + count * Size.leagueMenuRowH;
}

const styles = StyleSheet.create({
  /**
   * The control's LAYOUT box: the trigger's height and nothing more. The panel
   * is absolute inside it, so opening the menu never reflows the crown.
   *
   * ⚠ `zIndex` — the panel hangs over whatever follows this control in its
   * parent. On the crown it needs `Crown`'s own lift as well (see `crown.tsx`);
   * one alone is not enough, because a child's z-index cannot raise it past
   * its parent's sibling.
   */
  host: { position: 'relative', zIndex: 2 },
  /** Reaches past every edge of any phone — see `Size.leagueMenuScrimReach`. */
  scrim: {
    position: 'absolute',
    top: -Size.leagueMenuScrimReach,
    bottom: -Size.leagueMenuScrimReach,
    left: -Size.leagueMenuScrimReach,
    right: -Size.leagueMenuScrimReach,
    backgroundColor: Colors.dark.recess,
  },
  /**
   * The glass container. Its height covers the trigger AND the open panel, so
   * nothing it holds reaches outside its bounds — a `UIVisualEffectView`'s
   * content view is not a place to overflow from.
   */
  stack: { position: 'absolute', top: 0, left: 0, right: 0 },
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
  panel: { position: 'absolute', left: 0, right: 0 },
  panelShell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.tray,
  },
  panelShellFlat: {
    backgroundColor: Colors.dark.trayFill,
    borderWidth: 1,
    borderColor: Colors.dark.trayLine,
  },
  /**
   * The rows' ground. ⚠⚠ OPAQUE — trap 59. Inset `Size.trayPad` inside the
   * shell with the concentric radius the tray rule asks for (ADR 0090/0091).
   */
  panelInner: {
    position: 'absolute',
    top: Size.trayPad,
    left: Size.trayPad,
    right: Size.trayPad,
    bottom: Size.trayPad,
    borderRadius: Radius.tray - Size.trayPad,
    backgroundColor: Colors.dark.trayInner,
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
    top: Spacing.one,
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
