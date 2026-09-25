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
 * ⚠ The card is NEUTRAL LIQUID GLASS (ADR 0184): a `GlassView` where liquid
 * glass exists, a flat translucent fill where not, both under the light
 * `recess` scrim — 0096's see-through treatment stands (Ed judged LivePlate's
 * `plateDark` "too dark"), so the crown still shows through. What went is the
 * COLOUR the card added itself: the club wash (0068) and the lime ring. The
 * only lime left is content (label, seconds, Vs badge).
 *
 * ⚠ Glass is the ONLY surface now (ADR 0176): the deck's `opaque` variant —
 * a baked BRAND crown under the full-alpha wash — retired with the stack.
 * Cards ride a carousel, nothing sits behind a card, and a baked brand
 * ground would paint the wrong crown over a league/club background (0175).
 */
import { StyleSheet, View } from 'react-native';

import {
  CompetitionMark,
  Crest,
  GlassSurface,
  Text,
  VersusBadge,
  WashGradient,
  type CompetitionMarkKind,
} from '@/components/atoms';
import { Countdown, type ScoreSide } from '@/components/molecules';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface NextUpCardProps {
  home: ScoreSide;
  away: ScoreSide;
  kickoffUtc: string;
  kickoffTbd: boolean;
  /** The card's own label — `copy.today.nextUp`. */
  meta: string;
  /**
   * A competition lockup on the kickoff row's empty right end, in the ink's
   * white (ADR 0133 — placement iterated twice on Ed's screenshots: head-row
   * accent, then under the Vs, then here and bigger) — the mark for a cup
   * tie whose name we hold artwork for. The screen resolves it
   * (`competitionMarkKind`); a competition without a mark keeps its name IN
   * `meta` instead, so this is never the only carrier.
   */
  mark?: CompetitionMarkKind | null;
  /** Already formatted in the reader's zone and clock. `--:--` when TBD. */
  kickoffLabel: string;
  /** "SAT 5 SEP" — the reader's own day. */
  dateLabel: string;
  /** "CEST · YOUR TIME" — states WHOSE clock this is. */
  zoneLabel: string;
  venue: string | null;
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
  mark = null,
  kickoffLabel,
  dateLabel,
  zoneLabel,
  venue,
  onKickoff,
  copy,
}: NextUpCardProps) {
  return (
    <View style={styles.card}>
      {/* The body, then the overlays — all decorative, all clipped. */}
      <GlassSurface style={styles.body} flatStyle={styles.bodyFlat} />
      {/* A dark scrim over the glass — the card must sit a step BELOW the
          crown it refracts, or the ink loses its ground ("a bit darker",
          ADR 0096). `recess`, NOT LivePlate's `plateDark`: Ed judged the
          plate "too dark", the card stays see-through (ADR 0184). */}
      <View pointerEvents="none" style={[styles.body, styles.dim]} />
      {/* A gentle top sheen — the card's one lit surface, not a colour. */}
      <View pointerEvents="none" style={styles.body}>
        <WashGradient
          angle="vertical"
          stops={[
            { offset: 0, color: '#ffffff', opacity: 0.08 },
            { offset: 0.4, color: '#ffffff', opacity: 0 },
          ]}
        />
      </View>
      {/* The lit top edge, over the washes — the tray/plate idiom. */}
      <View pointerEvents="none" style={styles.topEdge} />

      <View style={styles.headRow}>
        <Text variant="eyebrowSm" color="accent">
          {meta}
        </Text>
        {venue ? (
          // ⚠ One ink (ADR 0096): `washInk` existed for legibility on the
          // full-alpha wash, which retired with the opaque deck card
          // (ADR 0176); the neutral plate needs no special ink.
          <Text
            variant="eyebrowSm"
            color="textFaint"
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
        {/* The competition's lockup on the row's empty right end, white and
            sized against the kickoff time — Ed's spot (ADR 0133). The meta
            block's `flex: 1` is what pushes it to the edge. */}
        {mark ? (
          <CompetitionMark kind={mark} height={Size.competitionMarkLg} color="text" />
        ) : null}
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
   * The liquid-glass shell (ADR 0096/0184). ⚠ `overflow: 'hidden'` clips the
   * glass body and the sheen to the corners — the `flush` trap. The ring is
   * LivePlate's neutral `plateLine` at `glassBorder`, not the lime
   * `accentRing`: the two crown-slot cards share one plate idiom (0184).
   */
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.plateLine,
  },
  body: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  /** The floor where liquid glass is not available — the spec's own fallback. */
  bodyFlat: { backgroundColor: Colors.dark.glassFill },
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
