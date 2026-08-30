/**
 * Full-time scores from every tracked league, grouped by league.
 *
 * ⚠ Built from `GET /cronogol/fixtures`, NOT the scoreboard — see
 * `queries/use-today.ts` for why. That is what makes the league group header
 * correct and the crests ours.
 *
 * ⚠ **Each match is a STACKED pair** (ADR 0069): home over away, one crest and
 * one name per line, the goals in a fixed right-aligned column, the chevron in
 * its own. There is no `FT` word — the section is titled "Finished today" and
 * the row used to say it again, at the cost of the names: the trailing cell
 * truncated `Nottingham Forest`, `Brighton & Hove Albion` and `Real Sociedad`.
 * Nothing on this row may be added to the right of the goals without
 * re-measuring the longest club name at 393pt.
 *
 * ⚠ The losing side's name AND goal drop to `textDim`; **a draw leaves both at
 * full ink.** Score-driven, not status-driven — `scoreEmphasis`, the same rule
 * the `Score` chip applies on the other cards (ADR 0044). The chip itself is
 * not used here: a per-line digit is a different shape from a split pair.
 *
 * ⚠ Every row here expands into its match timeline (ADR 0045). Every row is
 * finished by construction, so every row discloses — the chevron is gated on
 * STATUS, not on whether events exist, because knowing that in advance would
 * mean pre-fetching the whole section. **One row open at a time.**
 *
 * ⚠ Each league header sits on that league's brand band — `LeagueBand`, keyed by
 * API slug (ADR 0062). Serie A's is a gradient drawn with `react-native-svg`
 * rather than `expo-linear-gradient`, which would cost a native rebuild. A slug
 * with no band keeps the neutral header and grey label — that is the fallback.
 */
import { Image } from 'expo-image';
import { Fragment, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Chevron, Crest, Hairline, Text } from '@/components/atoms';
import { Colors, LeagueBand, Radius, Size, Spacing } from '@/constants/theme';
import type { LeagueBandSpec } from '@/constants/theme';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import { scoreEmphasis } from '@/lib/cronogol/scores';
import type { FixtureWindowView, LeagueRef, WindowFixtureView } from '@/lib/cronogol/types';
import type { Copy } from '@/lib/i18n/copy';
import { MatchEvents } from './match-events';

/** Leagues with no artwork of their own that draw a sister league's mark. */
const SISTER_MARK = { segunda: 'laliga' } as const;

export interface FinishedTodayProps {
  window: FixtureWindowView;
  eventsCopy: Copy['events'];
}

export function FinishedToday({ window: data, eventsCopy }: FinishedTodayProps) {
  /** ⚠ One row open at a time — a single id, not a set (ADR 0045). */
  const [openId, setOpenId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byLeague = new Map<string, { league: LeagueRef | null; fixtures: WindowFixtureView[] }>();
    for (const fixture of data.fixtures) {
      if (fixture.status !== 'finished') continue;
      if (fixture.goalsHome === null || fixture.goalsAway === null) continue;
      const key = fixture.leagueSlug;
      const found = byLeague.get(key);
      if (found) found.fixtures.push(fixture);
      else {
        byLeague.set(key, {
          league: data.leagues.find((l) => l.slug === key) ?? null,
          fixtures: [fixture],
        });
      }
    }
    return [...byLeague.values()];
  }, [data]);

  if (groups.length === 0) return null;

  const bandFor = (slug: string): LeagueBandSpec | undefined =>
    LeagueBand[slug as keyof typeof LeagueBand];
  /**
   * The artwork to draw for a group. `segunda` ships no logo from the API and is
   * LaLiga's own competition, so it borrows LaLiga's mark (ADR 0062) — from the
   * same payload, so it is there whenever LaLiga played today; otherwise no mark.
   */
  const markFor = (league: LeagueRef | null): LeagueRef | null => {
    if (league?.logoUrl) return league;
    const sister = league ? SISTER_MARK[league.slug as keyof typeof SISTER_MARK] : undefined;
    return sister ? (data.leagues.find((l) => l.slug === sister) ?? null) : null;
  };

  return (
    <View style={styles.card}>
      {groups.map((group, index) => {
        const band = bandFor(group.league?.slug ?? group.fixtures[0].leagueSlug);
        const mark = markFor(group.league);
        return (
          <Fragment key={group.league?.slug ?? index}>
            <View style={[styles.leagueHeader, band && 'solid' in band && { backgroundColor: band.solid }]}>
              {band && 'gradient' in band ? (
                <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                  <Defs>
                    <LinearGradient id="band" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor={band.gradient[0]} />
                      <Stop offset="1" stopColor={band.gradient[1]} />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#band)" />
                </Svg>
              ) : null}
              {mark?.logoUrl ? (
                <Image
                  source={{ uri: mark.logoUrls?.icon ?? mark.logoUrl }}
                  style={styles.mark}
                  contentFit="contain"
                  accessible={false}
                />
              ) : null}
              <Text variant="eyebrow" color={band ? 'text' : 'textSecondary'}>
                {group.league?.name ?? group.fixtures[0].leagueSlug}
              </Text>
            </View>

            {group.fixtures.map((fixture) => {
              const dim = scoreEmphasis({ home: fixture.goalsHome, away: fixture.goalsAway });
              const expanded = openId === fixture.id;
              const homeName = fixture.homeTeam ? displayName(fixture.homeTeam.name) : '—';
              const awayName = fixture.awayTeam ? displayName(fixture.awayTeam.name) : '—';
              return (
                <View key={fixture.id}>
                  <Pressable
                    onPress={() => setOpenId(expanded ? null : fixture.id)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    // One stop for the whole row: without this VoiceOver reads
                    // crest, name, goal, crest, name, goal as six.
                    accessibilityLabel={`${homeName} ${fixture.goalsHome}, ${awayName} ${fixture.goalsAway}`}
                    accessibilityHint={expanded ? eventsCopy.collapse : eventsCopy.expand}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
                    <View style={styles.pair}>
                      {(
                        [
                          { team: fixture.homeTeam, name: homeName, muted: dim.home === 'muted' },
                          { team: fixture.awayTeam, name: awayName, muted: dim.away === 'muted' },
                        ] as const
                      ).map(({ team, name, muted }, i) => (
                        <View key={i} style={styles.line}>
                          <Crest
                            src={crestSrc(team?.logoUrls ?? null, team?.logoUrl ?? null, 'xsmall')}
                            fallback={team ? abbreviate(team.name, team.slug, team.shortName) : '?'}
                            size={Size.crestRow}
                          />
                          <Text
                            variant="bodyStrong"
                            color={muted ? 'textDim' : 'text'}
                            numberOfLines={1}
                            style={styles.name}>
                            {name}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* ⚠ Both digits `tabular` and in a FIXED column: three
                        matches in a group are read down, like a table. */}
                    <View style={styles.goals}>
                      <Text variant="numeral" tabular color={dim.home === 'muted' ? 'textDim' : 'text'} style={styles.goal}>
                        {fixture.goalsHome}
                      </Text>
                      <Text variant="numeral" tabular color={dim.away === 'muted' ? 'textDim' : 'text'} style={styles.goal}>
                        {fixture.goalsAway}
                      </Text>
                    </View>

                    <View style={styles.disclosure}>
                      <Chevron expanded={expanded} />
                    </View>
                  </Pressable>

                  {expanded ? (
                    <MatchEvents
                      fixtureId={fixture.id}
                      home={fixture.homeTeam}
                      away={fixture.awayTeam}
                      copy={eventsCopy}
                    />
                  ) : null}
                </View>
              );
            })}
            <Hairline />
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.dark.card, borderRadius: Radius.group, overflow: 'hidden' },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    // The gradient band is an absolutely-filled Svg behind the children.
    position: 'relative',
    overflow: 'hidden',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    // ⚠ A divider, so it must always read THINNER than the match rows below:
    // `two` padding + an 18pt mark = 34pt against the rows' `three` + 26pt
    // crest = 50pt. Do not let either side grow past the row's (ADR 0062).
    paddingVertical: Spacing.two,
  },
  mark: { width: Size.leagueBandMark, height: Size.leagueBandMark },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.hairline,
  },
  /** The two club lines. `two` between them so the crests read as a pair. */
  pair: { flex: 1, minWidth: 0, gap: Spacing.two },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { flex: 1, minWidth: 0 },
  /**
   * The goal column: a hairline on its left running the pair's full height, so
   * the digits sit in a column of their own and not at the end of a name. The
   * same `two` gap as the pair keeps each digit on its club's baseline.
   */
  goals: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Colors.dark.hairlineMid,
  },
  goal: { width: Size.goalColumn, textAlign: 'right' },
  /** ⚠ Not a hit target — the row is. Its own column so it never crowds a digit. */
  disclosure: { paddingLeft: Spacing.half },
});
