/**
 * One line of a match timeline: minute · glyph · name block · side crest.
 *
 * ⚠ Takes PRIMITIVES, not a `MatchEventView`. The mapping from the wire — the
 * six types, the composed minute, the two meanings of `related` — lives in
 * `lib/cronogol/events.ts` and is applied by the organism, the same way
 * `MatchBoard` takes flat scalars. This component knows nothing about football.
 *
 * ⚠ The minute column and the glyph slot are FIXED widths. That is the whole
 * point of the layout: names align down the timeline whatever the mix of goals,
 * cards and subs. A `flex` on either would ragged them.
 *
 * ⚠ `minute` and `side` are both legitimately null — a source that did not give
 * a minute, and a VAR decision belonging to neither club. Their columns keep
 * their width and render empty; the row never guesses and never collapses.
 */
import { StyleSheet, View } from 'react-native';

import { Crest, EventGlyph, Text } from '@/components/atoms';
import { Size, Spacing } from '@/constants/theme';
import type { EventKind } from '@/lib/cronogol/events';

export interface EventRowProps {
  /** `"63"` · `"45+2"` · null. ⚠ Already composed — never `minute + minuteExtra`. */
  minute: string | null;
  kind: EventKind;
  /** Scorer · booked player · the player coming ON. */
  name: string;
  /** `Assist · …` / `Off · …` / `Penalty` / `Second yellow`. */
  detail: string | null;
  /** The side's crest, or null for its abbreviation tile. */
  crest: string | null;
  /** The 3-letter code. Null when the event belongs to neither club. */
  abbr: string | null;
}

export function EventRow({ minute, kind, name, detail, crest, abbr }: EventRowProps) {
  return (
    /* One VoiceOver stop for the whole line — otherwise it reads as four:
       minute, glyph, name, club. */
    <View
      style={styles.row}
      accessible
      accessibilityLabel={[minute, name, detail, abbr].filter(Boolean).join(', ')}>
      {/**
       * ⚠ `adjustsFontSizeToFit` is the Dynamic Type safety valve, the same one
       * `Crest` uses to guarantee a three-letter code fits its tile. The column
       * is fixed by design, so at the largest text sizes something has to give
       * — and a slightly smaller `90+4′` is better than `90…`, which names a
       * minute that did not happen.
       */}
      <Text
        variant="eventMinute"
        tabular
        color="textMuted"
        style={styles.minute}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}>
        {minute ? `${minute}′` : ''}
      </Text>

      <View style={styles.glyph}>
        <EventGlyph kind={kind} />
      </View>

      <View style={styles.names}>
        <Text variant="eventName" numberOfLines={1}>
          {name}
        </Text>
        {detail ? (
          <Text variant="micro" color="textMuted" numberOfLines={1} style={styles.detail}>
            {detail}
          </Text>
        ) : null}
      </View>

      <View style={styles.side}>
        {abbr ? <Crest src={crest} fallback={abbr} size={Size.crestEvent} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // `flex-start`, not `center`: a two-line row must keep its minute and glyph
  // level with the NAME, not floating against the middle of the pair.
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  minute: { width: Size.eventMinuteColumn, textAlign: 'right', paddingTop: Spacing.half },
  glyph: {
    width: Size.eventGlyphW,
    height: Size.eventGlyphH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  names: { flex: 1, minWidth: 0 },
  detail: { marginTop: Spacing.half },
  // Keeps its width with no crest in it, so every name column ends level.
  side: { width: Size.crestEvent, alignItems: 'flex-end' },
});
