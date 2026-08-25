/**
 * Full-time scores from every tracked league, grouped by league.
 *
 * ⚠ Built from `GET /cronogol/fixtures`, NOT the scoreboard — see
 * `queries/use-today.ts` for why. That is what makes the league group header
 * correct and the crests ours.
 *
 * ⚠ The losing side's name drops to `textDim`; **a draw leaves both at full
 * ink.** Score-driven, not status-driven.
 */
import { Image } from 'expo-image';
import { Fragment, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Crest, Hairline, Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc, displayName } from '@/lib/cronogol/derive';
import type { FixtureWindowView, LeagueRef, WindowFixtureView } from '@/lib/cronogol/types';

export interface FinishedTodayProps {
  window: FixtureWindowView;
  finishedLabel: string;
}

function emphasis(home: number | null, away: number | null) {
  if (home === null || away === null || home === away) return { home: false, away: false };
  return { home: home < away, away: away < home };
}

export function FinishedToday({ window: data, finishedLabel }: FinishedTodayProps) {
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

  return (
    <View style={styles.card}>
      {groups.map((group, index) => (
        <Fragment key={group.league?.slug ?? index}>
          <View style={styles.leagueHeader}>
            {group.league?.logoUrl ? (
              <Image
                source={{ uri: group.league.logoUrls?.icon ?? group.league.logoUrl }}
                style={styles.mark}
                contentFit="contain"
                accessible={false}
              />
            ) : null}
            <Text variant="eyebrow" color="textSecondary">
              {group.league?.name ?? group.fixtures[0].leagueSlug}
            </Text>
          </View>

          {group.fixtures.map((fixture) => {
            const dim = emphasis(fixture.goalsHome, fixture.goalsAway);
            return (
              <View key={fixture.id} style={styles.row}>
                <Crest
                  src={crestSrc(fixture.homeTeam?.logoUrls ?? null, fixture.homeTeam?.logoUrl ?? null, 'xsmall')}
                  fallback={fixture.homeTeam ? abbreviate(fixture.homeTeam.name, fixture.homeTeam.slug, fixture.homeTeam.shortName) : '?'}
                  size={Size.crestRow}
                />
                <Text variant="bodyStrong" color={dim.home ? 'textDim' : 'text'} numberOfLines={1} style={styles.name}>
                  {fixture.homeTeam ? displayName(fixture.homeTeam.name) : '—'}
                </Text>

                <Text variant="numeral" tabular>
                  {`${fixture.goalsHome}–${fixture.goalsAway}`}
                </Text>

                <Text
                  variant="bodyStrong"
                  color={dim.away ? 'textDim' : 'text'}
                  numberOfLines={1}
                  style={[styles.name, styles.awayName]}>
                  {fixture.awayTeam ? displayName(fixture.awayTeam.name) : '—'}
                </Text>
                <Crest
                  src={crestSrc(fixture.awayTeam?.logoUrls ?? null, fixture.awayTeam?.logoUrl ?? null, 'xsmall')}
                  fallback={fixture.awayTeam ? abbreviate(fixture.awayTeam.name, fixture.awayTeam.slug, fixture.awayTeam.shortName) : '?'}
                  size={Size.crestRow}
                />

                <Text variant="eyebrowSm" color="textFaint" style={styles.ft}>
                  {finishedLabel}
                </Text>
              </View>
            );
          })}
          <Hairline />
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.dark.card, borderRadius: Radius.group, overflow: 'hidden' },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  mark: { width: 22, height: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.hairline,
  },
  name: { flex: 1, minWidth: 0 },
  awayName: { textAlign: 'right' },
  ft: { width: 22, textAlign: 'right' },
});
