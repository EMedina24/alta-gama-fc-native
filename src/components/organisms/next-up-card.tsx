/**
 * NEXT UP — the soonest kickoff of a followed club, and the Today crown's
 * payload whenever no match is in play (ADR 0095).
 *
 * ⚠ It sits INSIDE the crown, so the gradient runs over it: the card is the
 * bottom of the head, not the top of the body. A live match replaces it with
 * `LivePlate` (ADR 0088) — the two are never on screen together, and the
 * screen enforces that at the call site.
 *
 * ⚠ **STACKED, not a row.** Names sit UNDER their crest so each gets half the
 * card's width — a row layout truncated both sides of Real Madrid v Real
 * Sociedad to "Real…" against "Real…", which names neither club.
 *
 * ⚠ The card is LIQUID GLASS (ADR 0096, the bubbles' 0090 treatment at card
 * size): a `GlassView` where liquid glass exists, a flat translucent fill
 * where not, both under the same overlays — so the crown's gradient shows
 * THROUGH the card rather than stopping at a dark slab. The club-colour pair
 * survives only as a WHISPER (`ClubWash2.edgeOnGlass`): a translucent tint
 * over a translucent shell double-blends with whatever is behind it, so the
 * full-alpha wash and the opaque base it needed are both gone.
 */
import { StyleSheet, View } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

import { Crest, Text, VersusBadge, WashGradient } from '@/components/atoms';
import { Countdown, type ScoreSide } from '@/components/molecules';
import { ClubWash2, Colors, DeckGround, Radius, Size, Spacing } from '@/constants/theme';
import type { PairWash } from '@/lib/cronogol/club-wash';

/** Decided once at module scope — the gate must pick a path BEFORE mount (0090). */
const LIQUID = isLiquidGlassAvailable();

export interface NextUpCardProps {
  home: ScoreSide;
  away: ScoreSide;
  kickoffUtc: string;
  kickoffTbd: boolean;
  /** The card's own label — `copy.today.nextUp`. */
  meta: string;
  /** Already formatted in the reader's zone and clock. `--:--` when TBD. */
  kickoffLabel: string;
  /** "SAT 5 SEP" — the reader's own day. */
  dateLabel: string;
  /** "CEST · YOUR TIME" — states WHOSE clock this is. */
  zoneLabel: string;
  venue: string | null;
  /**
   * The two-club colour wash behind the card (ADR 0068): home top-left, away
   * bottom-right, already TAMED by `lib/cronogol/club-wash.ts` — the screen
   * resolves, this organism only paints (ADR 0013).
   *
   * ⚠ `null` / absent is a real state, not a degradation: neither club has a
   * usable colour (every Premier League and Serie A club today) and the card
   * renders exactly as it did before the wash existed — lime ring and all.
   */
  wash?: PairWash | null;
  /**
   * The card's body (ADR 0113). `glass` is the single card's liquid-glass
   * shell (ADR 0096); `opaque` is the DECK's variant — a solid `card` base,
   * no glass, no recess dim. ⚠ Stacked layers must be opaque: anything behind
   * a glass card shows through it — text ghosts and even featureless fills
   * glow (trap 59) — and Ed called the resulting near-black peeks off. On the
   * opaque base the club wash returns to its full 0087 alphas; the whisper
   * exists only because a tint over a translucent shell double-blends.
   */
  surface?: 'glass' | 'opaque';
  /**
   * Kickoff, announced by this card's own countdown (ADR 0052).
   *
   * ⚠ **Nothing else on the screen can detect it.** The fixture windows behind
   * the board were fetched before the match started, so the timer already
   * counting to the instant is the only thing that knows. The caller refetches
   * on it.
   *
   * ⚠ Whatever it refetches must not change `kickoffUtc`: a new target re-arms
   * the countdown's once-per-kickoff guard, and the pair would loop.
   */
  onKickoff?: () => void;
  copy: { kickoffIn: string; tbd: string };
}

export function NextUpCard({
  home,
  away,
  kickoffUtc,
  kickoffTbd,
  meta,
  kickoffLabel,
  dateLabel,
  zoneLabel,
  venue,
  wash = null,
  surface = 'glass',
  onKickoff,
  copy,
}: NextUpCardProps) {
  const glass = surface === 'glass';
  return (
    <View style={styles.card}>
      {/* The body, then the overlays — all decorative, all clipped. */}
      {!glass ? (
        <View style={[styles.body, styles.bodyOpaque]} />
      ) : LIQUID ? (
        <GlassView style={styles.body} glassEffectStyle="clear" />
      ) : (
        <View style={[styles.body, styles.bodyFlat]} />
      )}
      {/* A dark scrim over the glass — the card must sit a step BELOW the
          crown it refracts, or the ink loses its ground ("a bit darker",
          ADR 0096). `recess` is the translucent black that works on any
          ground, which is exactly the job. ⚠ Glass only — the opaque base
          IS its own ground. */}
      {glass ? <View pointerEvents="none" style={[styles.body, styles.dim]} /> : null}
      {/* A gentle top sheen — the card's one lit surface, not a colour. */}
      <View pointerEvents="none" style={styles.body}>
        {/* ⚠ Opaque only: the crown, baked (ADR 0113). The glass card SHOWS
            the gradient behind it; the opaque card must paint the same light
            itself or read as a black slab on the bright band. */}
        {!glass ? <WashGradient angle="vertical" stops={DeckGround} /> : null}
        <WashGradient
          angle="vertical"
          stops={[
            { offset: 0, color: '#ffffff', opacity: 0.08 },
            { offset: 0.4, color: '#ffffff', opacity: 0 },
          ]}
        />
        {/* ⚠ The club pair at WHISPER strength on glass (ADR 0096) — a tint
            over a translucent shell double-blends — and at the FULL 0087
            alphas on the opaque base, where the whisper's reason is gone
            (ADR 0113). The dead-transparent middle still keeps the two
            colours from mixing. */}
        {wash ? (
          <WashGradient
            angle="pair"
            stops={[
              { offset: 0, color: wash.home, opacity: glass ? ClubWash2.edgeOnGlass : ClubWash2.edge },
              { offset: ClubWash2.midAt, color: wash.home, opacity: glass ? ClubWash2.midOnGlass : ClubWash2.mid },
              { offset: ClubWash2.gapStart, color: wash.home, opacity: 0 },
              { offset: ClubWash2.gapEnd, color: wash.away, opacity: 0 },
              { offset: 1 - ClubWash2.midAt, color: wash.away, opacity: glass ? ClubWash2.midOnGlass : ClubWash2.mid },
              { offset: 1, color: wash.away, opacity: glass ? ClubWash2.edgeOnGlass : ClubWash2.edge },
            ]}
          />
        ) : null}
      </View>
      {/* The lit top edge, over the washes — the tray/plate idiom. */}
      <View pointerEvents="none" style={styles.topEdge} />

      <View style={styles.headRow}>
        <Text variant="eyebrowSm" color="accent">
          {meta}
        </Text>
        {venue ? (
          // ⚠ One ink on GLASS (ADR 0096): `washInk` existed for legibility on
          // the full-alpha wash, and the whisper does not move the ground
          // enough to need it. The OPAQUE deck card brings the full wash and
          // a lively baked top back (ADR 0113) — `textFaint` died on it, so
          // `washInk`'s reason returns with it.
          <Text
            variant="eyebrowSm"
            color={glass ? 'textFaint' : 'washInk'}
            numberOfLines={1}
            style={styles.venue}>
            {venue}
          </Text>
        ) : null}
      </View>

      {/* One VoiceOver stop for the whole pairing, as UpcomingCard already
          does — otherwise it reads as four: crest, name, "V", name. */}
      <View style={styles.pair} accessible accessibilityLabel={`${home.name} v ${away.name}`}>
        <View style={styles.pairSide}>
          <Crest src={home.crest} fallback={home.abbr} size={Size.crestNext} filled={!home.crest} />
          <Text variant="bodyStrong" center numberOfLines={1}>
            {home.name}
          </Text>
        </View>
        <View style={styles.versus}>
          {/* ⚠ Accent on both variants (ADR 0096) — `onWash` was the full-alpha
              wash's white chrome, and that wash is gone. */}
          <VersusBadge tone="accent" />
        </View>
        <View style={styles.pairSide}>
          <Crest src={away.crest} fallback={away.abbr} size={Size.crestNext} filled={!away.crest} />
          <Text variant="bodyStrong" center numberOfLines={1}>
            {away.name}
          </Text>
        </View>
      </View>

      <View style={styles.kickoffRow}>
        <Text variant="kickoff" tabular>
          {kickoffLabel}
        </Text>
        <View style={styles.kickoffMeta}>
          <Text variant="eyebrowLg" color="textSecondary">
            {dateLabel}
          </Text>
          {/* ⚠ States whose clock this is. Every time on screen is the reader's
              own zone, and saying so is what stops "9:00 PM" being read as the
              stadium's local time — which is why it is set to be read rather
              than skimmed. ⚠ `textSecondary`, not `textFaint`: on the frosted
              glass the faint ink vanished, and this is an honesty line
              (ADR 0034/0096). */}
          <Text variant="eyebrowLg" color="textSecondary">
            {zoneLabel}
          </Text>
        </View>
      </View>

      <View style={styles.rule} />
      {kickoffTbd ? (
        <Text variant="footnote" color="textSecondary">
          {copy.tbd}
        </Text>
      ) : (
        <View style={styles.countdownRow}>
          <Text variant="eyebrowSm" color="textSecondary">
            {copy.kickoffIn}
          </Text>
          <Countdown kickoffUtc={kickoffUtc} onElapsed={onKickoff} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * The liquid-glass shell (ADR 0096). ⚠ `overflow: 'hidden'` clips the glass
   * body and both washes to the corners — the `flush` trap — and the lime ring
   * is back on BOTH variants: 0068 swapped it for white ON a wash, and the
   * whisper is no longer a wash to defer to.
   */
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.three,
    // ⚠ 1pt, not `Size.glassBorder`: at 0.5 the ring stops reading as one.
    borderWidth: 1,
    borderColor: Colors.dark.accentRing,
  },
  body: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  /** The floor where liquid glass is not available — the spec's own fallback. */
  bodyFlat: { backgroundColor: Colors.dark.glassFill },
  /**
   * The deck variant's base (ADR 0113): the `DeckGround` ramp's own floor,
   * under the gradient — never `card`, whose charcoal read as a black slab
   * on the bright band.
   */
  bodyOpaque: { backgroundColor: DeckGround[DeckGround.length - 1].color },
  dim: { backgroundColor: Colors.dark.recess },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.card,
    // ⚠ All four sides at 1pt, three transparent — the straight-chord trap.
    borderWidth: 1,
    borderColor: 'transparent',
    borderTopColor: Colors.dark.plateTop,
  },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  venue: { flexShrink: 1, textAlign: 'right' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.dark.hairlineMid },
  pair: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  pairSide: { flex: 1, alignItems: 'center', gap: Spacing.two },
  /** Centres the ring on the crest line — derived, so a crest resize follows. */
  versus: { marginTop: (Size.crestNext - Size.versusBadge) / 2 },
  kickoffRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
  kickoffMeta: { flex: 1, gap: Spacing.one, paddingBottom: Spacing.one },
  /**
   * ⚠ WRAPS rather than shrinks. `1d 18h 04m 12s` is four rigid groups, and at
   * the largest Dynamic Type sizes squeezing them slid every digit over its own
   * unit letter. Given the room it drops to its own line instead, which is the
   * one failure mode here that stays readable.
   */
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
    rowGap: Spacing.two,
  },
});
