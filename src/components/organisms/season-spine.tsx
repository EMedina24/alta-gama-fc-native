/**
 * A club's season as a vertical rail: past results behind, the next fixture
 * accented, everything after it hollow.
 *
 * ⚠ "Next" comes from `nextUpIndex` — the first fixture whose status is
 * `scheduled` or `live` — **not from a clock comparison**. The API tier has
 * shipped a finished season before, and a clock test then renders a spine with
 * no next node forever.
 *
 * ⚠ The ACCENT on that node is a different question from which row it is, and
 * takes `nextUp`'s answer (ADR 0106): a pick whose kickoff is long past is
 * still LISTED, in its place, but is not lit as the match to come. Lighting it
 * would make the same claim the NEXT UP card declines to make, one screen down.
 *
 * ⚠ Scores here are `goalsFor`/`goalsAgainst`, the REQUESTED club's perspective.
 * The jornada routes use `goalsHome`/`goalsAway`. Mixing them silently inverts
 * every away result — and now the emphasis too: the `Score` atom dims whichever
 * DIGIT is lower, so a swap dims the wrong side of an away loss (ADR 0044).
 */
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Crest, Score, Text, WashGradient } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import {
  abbreviate,
  crestSrc,
  displayName,
  matchday,
  nextUp,
  nextUpIndex,
  outcome,
} from '@/lib/cronogol/derive';
import type { FixtureView, TeamFixturesView } from '@/lib/cronogol/types';
import { fixtureDateParts, formatKickoffTime } from '@/lib/format';
import type { Phrases } from '@/lib/i18n/phrases';
import type { ClockFormat } from '@/store/preferences';

export interface SeasonSpineProps {
  data: TeamFixturesView;
  zone: string;
  clock: ClockFormat;
  phrases: Phrases;
  /** `J{n}` / `Jornada {n}` prefix for the meta line. */
  roundPrefix: string;
  /**
   * The club's colour, for the rail's own top stop (ADR 0091). Null — every
   * Premier League and Serie A club today — falls to a white hairline, which
   * is a real state and not a degradation.
   */
  tint?: string | null;
  /**
   * Opens a PLAYED row's match-stats sheet (ADR 0190). Absent keeps every row
   * inert, as before.
   *
   * ⚠ Only a played row becomes a `Pressable`. Wrapping an upcoming one would
   * give VoiceOver a button that does nothing — worse than no affordance,
   * because it is one a reader goes looking for (`fixture-list.tsx`'s rule).
   */
  onOpen?: (fixture: FixtureView) => void;
  /** The VoiceOver hint on a played row — what the tap does. */
  openHint?: string;
}

function outcomeStyle(result: 'W' | 'D' | 'L' | null) {
  if (result === 'W') return { backgroundColor: Colors.dark.formWin, color: 'onAccent' as const };
  if (result === 'D') return { backgroundColor: Colors.dark.formDraw, color: 'text' as const };
  if (result === 'L') return { backgroundColor: 'transparent', color: 'textDim' as const };
  return null;
}

export function SeasonSpine({
  data,
  zone,
  clock,
  phrases,
  roundPrefix,
  tint = null,
  onOpen,
  openHint,
}: SeasonSpineProps) {
  const next = nextUpIndex(data.fixtures);
  /**
   * ⚠ Read ONCE at mount, not per render — `Date.now()` in a render body is
   * impure and the lint rule rejects it. A 48-hour threshold does not need a
   * ticking clock, and the screen remounts whenever it is opened.
   */
  const [now] = useState(() => Date.now());
  /** The same row, lit only while it is still a claim about the future. */
  const accented = nextUp(data.fixtures, now) === null ? -1 : next;

  return (
    <View>
      {data.fixtures.map((fixture: FixtureView, index) => {
        const isNext = index === accented;
        const past = index < next;
        const played = fixture.status === 'finished' && fixture.goalsFor !== null;
        const result = outcome(fixture);
        const chip = outcomeStyle(result);
        const date = fixtureDateParts(fixture.kickoffUtc, zone, phrases);
        const round = matchday(fixture.round);

        return (
          <View key={fixture.id} style={styles.item}>
            <View style={styles.railColumn}>
              <Text
                variant="eyebrowSm"
                color={isNext ? 'accent' : 'textFaint'}
                center
                style={styles.date}>
                {`${date.weekday}\n${date.day}\n${date.month}`}
              </Text>
            </View>

            <View style={styles.nodeColumn}>
              {/* The rail. ⚠ A gradient in a 1pt-wide box, not a tinted fill:
                  the mock's rail starts in the club's colour and falls to the
                  ordinary hairline, and only the FIRST row shows the top of
                  that fall (ADR 0091). */}
              <View style={styles.line}>
                <WashGradient
                  angle="vertical"
                  stops={
                    index === 0 && tint
                      ? [
                          { offset: 0, color: tint, opacity: 0.5 },
                          { offset: 0.34, color: '#ffffff', opacity: 0.07 },
                          { offset: 1, color: '#ffffff', opacity: 0.05 },
                        ]
                      : [
                          { offset: 0, color: '#ffffff', opacity: 0.07 },
                          { offset: 1, color: '#ffffff', opacity: 0.05 },
                        ]
                  }
                />
              </View>
              <View
                style={[
                  styles.node,
                  isNext && styles.nodeNext,
                  !isNext && past && styles.nodePast,
                ]}
              />
            </View>

            <CardShell
              style={[styles.card, isNext && styles.cardNext, past && styles.cardPast]}
              onPress={played && onOpen ? () => onOpen(fixture) : undefined}
              label={
                played
                  ? `${fixture.homeAway === 'A' ? `${phrases.at} ` : ''}${
                      fixture.opponent ? displayName(fixture.opponent) : phrases.unknownOpponent
                    }, ${fixture.goalsFor}–${fixture.goalsAgainst}`
                  : undefined
              }
              hint={openHint}>
              <Crest
                src={crestSrc(fixture.opponentLogoUrls, fixture.opponentLogoUrl, 'xsmall')}
                fallback={
                  fixture.opponent ? abbreviate(fixture.opponent) : phrases.unknownOpponent
                }
                size={Size.crestList}
              />
              <View style={styles.body}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {/* An away fixture reads "at {opponent}". An opponent the API
                      sends as null gets a placeholder, never an invented name. */}
                  {fixture.homeAway === 'A' ? `${phrases.at} ` : ''}
                  {fixture.opponent ? displayName(fixture.opponent) : phrases.unknownOpponent}
                </Text>
                <Text variant="footnote" color="textFaint" numberOfLines={1}>
                  {[round ? `${roundPrefix}${round}` : null, fixture.venue]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>

              {played ? (
                <View style={styles.result}>
                  <Score
                    home={fixture.goalsFor}
                    away={fixture.goalsAgainst}
                    size="row"
                    chip
                  />
                  {chip ? (
                    <View
                      style={[
                        styles.chip,
                        { backgroundColor: chip.backgroundColor },
                        result === 'L' && styles.chipLoss,
                      ]}>
                      <Text variant="eyebrowSm" color={chip.color}>
                        {phrases.formLetters[result as 'W' | 'D' | 'L']}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text variant="numeral" tabular opticalCentre color={fixture.kickoffTbd ? 'textFaint' : 'text'}>
                  {/* ⚠ `--:--` means published-but-unscheduled, not missing. */}
                  {fixture.kickoffTbd ? '--:--' : formatKickoffTime(fixture.kickoffUtc, zone, clock)}
                </Text>
              )}
            </CardShell>
          </View>
        );
      })}
    </View>
  );
}

/**
 * The card's shell: a `Pressable` when there is something to open, a plain
 * `View` otherwise — see `onOpen`. ⚠ Pressed state is SCALE, not opacity: a
 * past card already sits at `cardPast`'s 0.62, and a fade on top of that reads
 * as the row disabling itself.
 */
function CardShell({
  style,
  onPress,
  label,
  hint,
  children,
}: {
  style: StyleProp<ViewStyle>;
  onPress?: () => void;
  label?: string;
  hint?: string;
  children: ReactNode;
}) {
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // One stop for the whole card: "at Girona, 4–1".
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [style, pressed && styles.cardPressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardPressed: { transform: [{ scale: 0.98 }] },
  item: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.two, minHeight: 72 },
  railColumn: { width: 46, justifyContent: 'center' },
  date: { lineHeight: 13 },
  nodeColumn: { width: 16, alignItems: 'center', justifyContent: 'center' },
  line: { position: 'absolute', top: 0, bottom: 0, width: 1, overflow: 'hidden' },
  node: {
    width: 9,
    height: 9,
    borderRadius: 5,
    // ⚠ Translucent, not the ground's hex: the mesh varies down the screen and
    // a fixed `background` fill stopped matching it (ADR 0091).
    backgroundColor: Colors.dark.recess,
    borderWidth: 1,
    borderColor: Colors.dark.hairlineStrong,
  },
  nodePast: { backgroundColor: Colors.dark.textFaint, borderColor: Colors.dark.textFaint },
  nodeNext: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    // Glass (ADR 0087). ⚠ 1pt border kept: `cardNext`'s accent ring overrides
    // only the colour, as `match-board` does.
    backgroundColor: Colors.dark.glassFill,
    borderRadius: Radius.tile,
    padding: Spacing.three,
    marginVertical: Spacing.one,
    borderWidth: 1,
    borderColor: Colors.dark.glassLine,
  },
  cardNext: { borderColor: Colors.dark.accentRing },
  cardPast: { opacity: 0.62 },
  body: { flex: 1, gap: Spacing.half, minWidth: 0 },
  result: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chip: {
    width: 24,
    height: 24,
    borderRadius: Radius.chipSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLoss: { borderWidth: 1, borderColor: Colors.dark.formLossBorder },
});
