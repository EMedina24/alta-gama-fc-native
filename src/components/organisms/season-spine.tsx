/**
 * A club's season as a vertical rail: past results behind, the next fixture
 * accented, everything after it hollow.
 *
 * ⚠ "Next" comes from `nextUpIndex` — the first fixture whose status is
 * `scheduled` or `live` — **not from a clock comparison**. The API tier has
 * shipped a finished season before, and a clock test then renders a spine with
 * no next node forever.
 *
 * ⚠ Scores here are `goalsFor`/`goalsAgainst`, the REQUESTED club's perspective.
 * The jornada routes use `goalsHome`/`goalsAway`. Mixing them silently inverts
 * every away result — and now the emphasis too: the `Score` atom dims whichever
 * DIGIT is lower, so a swap dims the wrong side of an away loss (ADR 0044).
 */
import { StyleSheet, View } from 'react-native';

import { Crest, Score, Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName, matchday, nextUpIndex, outcome } from '@/lib/cronogol/derive';
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
}

function outcomeStyle(result: 'W' | 'D' | 'L' | null) {
  if (result === 'W') return { backgroundColor: Colors.dark.formWin, color: 'onAccent' as const };
  if (result === 'D') return { backgroundColor: Colors.dark.formDraw, color: 'text' as const };
  if (result === 'L') return { backgroundColor: 'transparent', color: 'textDim' as const };
  return null;
}

export function SeasonSpine({ data, zone, clock, phrases, roundPrefix }: SeasonSpineProps) {
  const next = nextUpIndex(data.fixtures);

  return (
    <View>
      {data.fixtures.map((fixture: FixtureView, index) => {
        const isNext = index === next;
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
              <View style={styles.line} />
              <View
                style={[
                  styles.node,
                  isNext && styles.nodeNext,
                  !isNext && past && styles.nodePast,
                ]}
              />
            </View>

            <View style={[styles.card, isNext && styles.cardNext, past && styles.cardPast]}>
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
                <Text variant="numeral" tabular color={fixture.kickoffTbd ? 'textFaint' : 'text'}>
                  {/* ⚠ `--:--` means published-but-unscheduled, not missing. */}
                  {fixture.kickoffTbd ? '--:--' : formatKickoffTime(fixture.kickoffUtc, zone, clock)}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.two, minHeight: 72 },
  railColumn: { width: 46, justifyContent: 'center' },
  date: { lineHeight: 13 },
  nodeColumn: { width: 16, alignItems: 'center', justifyContent: 'center' },
  line: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: Colors.dark.hairlineStrong },
  node: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.dark.background,
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
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.tile,
    padding: Spacing.three,
    marginVertical: Spacing.one,
    borderWidth: 1,
    borderColor: 'transparent',
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
