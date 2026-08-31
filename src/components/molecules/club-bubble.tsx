/**
 * One club on the Clubs screen's subscribed rail (ADR 0082).
 *
 * An 88pt disc: the club's colour as a hairline ring and a glow beneath it, that
 * colour again lit from the top inside, the crest floating on it, a lime check
 * at the shoulder and — where the league publishes a table — the club's position
 * at the foot.
 *
 * ⚠⚠ **The bubble has exactly ONE action: open the club.** The lime check is an
 * indicator with `pointerEvents: 'none'` — it is NOT an unfollow button. An
 * unfollow target inside an 88pt disc lands within a thumb's width of the
 * open-club tap, and unfollowing drops a whole season of calendar entries.
 * Unfollow lives on the club page, behind `Match alerts`, which confirms.
 *
 * ⚠ **The glow is the one shadow in app chrome**, and it is deliberate.
 * ADR 0015 says the app has no shadows — depth is surface lightness — and
 * ADR 0081 refused the account mock's glows on exactly that rule. ADR 0082
 * narrows it to name this: the rail is the screen's hero, the glow is what
 * separates a club you follow from one you are browsing, and it is the club's
 * own colour rather than an invented light. Nothing else may take a shadow on
 * the strength of this one.
 *
 * ⚠ **A colourless club draws the neutral bubble, not a grey one.** `clubTint`
 * falls to graphite only for a club in none of the four leagues; when it does,
 * the ring goes white-at-10 % and the glow is dropped entirely. A graphite glow
 * is a grey smudge that reads as a rendering fault.
 *
 * ⚠ **The rank is absent, not zero and not a dash.** See `ClubRail` for which
 * tables may produce one at all.
 *
 * ⚠ **This is the app's only DOUBLE BEZEL.** A shell (`bezelFill`, 4pt, closed
 * by the club-colour hairline) around a core one concentric radius smaller, with
 * a lit top edge (`bezelHighlight`) tracing the core's arc. ADR 0081 refused
 * nested shells on CARDS and that still holds — the search field and the browse
 * tray on this very screen are one flat `card` each. A bubble is not a card: it
 * is a physical object with a rim, and without the lit edge the shell reads as a
 * flat band rather than a bezel.
 *
 * ⚠ The highlight is a `borderTopColor` on an absolutely-positioned overlay, not
 * an inset shadow — React Native has none. It must stay an OVERLAY rather than a
 * border on `core` itself: a real border insets the core's content by its width
 * and would shift the crest off centre by a pixel.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Check, Crest, Text, WashRadial } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { isGraphite, withAlpha } from '@/lib/cronogol/club-wash';

export interface ClubBubbleProps {
  /** Already shortened by the organism — `pickerName`, not the raw name. */
  name: string;
  crest: string | null;
  abbr: string;
  /** From `clubTint`. Never null; graphite means "no colour anywhere". */
  tint: string;
  /** League position, or null where no table may be quoted. */
  rank: number | null;
  /** The qualification band's ink, or null for mid-table and unbanded tables. */
  rankColor: string | null;
  onPress: () => void;
  /** Names the club AND its position — the badge is not readable on its own. */
  accessibilityLabel: string;
}

const RING = Size.clubBubble / 2;
const CORE = RING - Size.clubBubbleRing;

export function ClubBubble({
  name,
  crest,
  abbr,
  tint,
  rank,
  rankColor,
  onPress,
  accessibilityLabel,
}: ClubBubbleProps) {
  const plain = isGraphite(tint);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.press, pressed && styles.pressed]}>
      <View style={styles.disc}>
        <View
          style={[
            styles.ring,
            { borderColor: plain ? Colors.dark.hairlineStrong : withAlpha(tint, 0.38) },
            // ⚠ The exception, and only here. See the header.
            !plain && { shadowColor: tint },
            !plain && styles.glow,
          ]}>
          <View style={styles.core}>
            <WashRadial
              cx={0.5}
              cy={0.12}
              r={0.88}
              stops={
                plain
                  ? [
                      { offset: 0, color: Colors.dark.text, opacity: 0.1 },
                      { offset: 1, color: Colors.dark.card, opacity: 1 },
                    ]
                  : [
                      { offset: 0, color: tint, opacity: 0.46 },
                      { offset: 0.58, color: tint, opacity: 0.1 },
                      { offset: 1, color: Colors.dark.card, opacity: 1 },
                    ]
              }
            />
            {/* The bezel's lit inner edge. Decorative, and never below the
                wash — it is the top of the core, not a layer under it. */}
            <View pointerEvents="none" style={styles.coreEdge} />
            <Crest src={crest} fallback={abbr} size={Size.crestBubble} />
          </View>
        </View>

        {/* Indicator only. See the ⚠⚠ in the header before adding an onPress. */}
        <View pointerEvents="none" style={styles.check}>
          <Check color="onAccent" size={Size.bubbleCheck - 14} />
        </View>

        {rank !== null ? (
          <View pointerEvents="none" style={styles.rank}>
            <Text
              variant="rankBadge"
              tabular
              color="text"
              style={rankColor ? { color: rankColor } : undefined}>
              {`#${rank}`}
            </Text>
          </View>
        ) : null}
      </View>

      <Text variant="railName" center numberOfLines={1} style={styles.name}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { width: Size.clubBubble, alignItems: 'center' },
  /** ⚠ Scale, not opacity: a fading crest reads as the club going offline. */
  pressed: { transform: [{ scale: 0.945 }] },
  disc: { width: Size.clubBubble, height: Size.clubBubble },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RING,
    padding: Size.clubBubbleRing,
    backgroundColor: Colors.dark.bezelFill,
    borderWidth: 1,
  },
  /**
   * ⚠ `shadowRadius` is 10, not the 13 that halving the design's 26px CSS blur
   * gives. The design's shadow also carries a **-8px spread**, which pulls the
   * blur back in, and React Native has no spread to express it with — so the
   * radius absorbs it. At 13 the glow read as a halo around the bubble rather
   * than light under it. Measured on the simulator.
   */
  glow: { shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 10 } },
  core: {
    flex: 1,
    borderRadius: CORE,
    alignItems: 'center',
    justifyContent: 'center',
    // ⚠ Required: `WashRadial` fills the box absolutely and would square the
    // corners off without it — the fault `match-board`'s `flush` documents.
    overflow: 'hidden',
    backgroundColor: Colors.dark.card,
  },
  coreEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: CORE,
    // ⚠ All four sides at 1pt so the radius traces correctly; only the top is
    // inked. Dropping the other three to 0 leaves RN drawing the top edge as a
    // straight chord across the curve.
    borderWidth: 1,
    borderColor: 'transparent',
    borderTopColor: Colors.dark.bezelHighlight,
  },
  check: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: Size.bubbleCheck,
    height: Size.bubbleCheck,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.accent,
    // Cut out of the page ground, so it reads as sitting on top of the ring.
    borderWidth: 2.5,
    borderColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: {
    position: 'absolute',
    bottom: -2,
    left: 2,
    height: Size.bubbleRank,
    paddingHorizontal: Spacing.two - 1,
    borderRadius: Radius.chipSm + 1,
    backgroundColor: Colors.dark.sunken,
    borderWidth: 1,
    borderColor: Colors.dark.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginTop: Spacing.three + 1, width: '100%' },
});
