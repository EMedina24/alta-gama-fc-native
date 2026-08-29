/**
 * Full-time scores from every tracked league, grouped by league.
 *
 * ⚠ Built from `GET /cronogol/fixtures`, NOT the scoreboard — see
 * `queries/use-today.ts` for why. That is what makes the league group header
 * correct and the crests ours.
 *
 * ⚠ The losing side's name drops to `textDim`; **a draw leaves both at full
 * ink.** Score-driven, not status-driven — `scoreEmphasis`, which the `Score`
 * atom applies to the digits from the same two numbers (ADR 0044).
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

import { Chevron, Crest, Hairline, Score, Text } from '@/components/atoms';
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
  finishedLabel: string;
  eventsCopy: Copy['events'];
}

export function FinishedToday({ window: data, finishedLabel, eventsCopy }: FinishedTodayProps) {
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
                    // crest, name, score, name, crest, "FT" as six.
                    accessibilityLabel={`${homeName} ${fixture.goalsHome}, ${awayName} ${fixture.goalsAway}`}
                    accessibilityHint={expanded ? eventsCopy.collapse : eventsCopy.expand}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
                    <Crest
                      src={crestSrc(fixture.homeTeam?.logoUrls ?? null, fixture.homeTeam?.logoUrl ?? null, 'xsmall')}
                      fallback={fixture.homeTeam ? abbreviate(fixture.homeTeam.name, fixture.homeTeam.slug, fixture.homeTeam.shortName) : '?'}
                      size={Size.crestRow}
                    />
                    <Text variant="bodyStrong" color={dim.home === 'muted' ? 'textDim' : 'text'} numberOfLines={1} style={styles.name}>
                      {homeName}
                    </Text>

                    <Score home={fixture.goalsHome} away={fixture.goalsAway} size="row" chip />

                    <Text
                      variant="bodyStrong"
                      color={dim.away === 'muted' ? 'textDim' : 'text'}
                      numberOfLines={1}
                      style={[styles.name, styles.awayName]}>
                      {awayName}
                    </Text>
                    <Crest
                      src={crestSrc(fixture.awayTeam?.logoUrls ?? null, fixture.awayTeam?.logoUrl ?? null, 'xsmall')}
                      fallback={fixture.awayTeam ? abbreviate(fixture.awayTeam.name, fixture.awayTeam.slug, fixture.awayTeam.shortName) : '?'}
                      size={Size.crestRow}
                    />

                    <View style={styles.ft}>
                      <Text variant="eyebrowSm" color="textFaint">
                        {finishedLabel}
                      </Text>
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
    // ⚠ `one`, not `two`. The score chip (ADR 0044) is ~24pt wider than the
    // `4–1` string it replaced and the two name columns are what pay for it —
    // 4pt back at each of the five gaps is the difference between `Real Madrid`
    // v `Real Sociedad` fitting and truncating, and a truncated club name is
    // the failure ADR 0029 names.
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.hairline,
  },
  name: { flex: 1, minWidth: 0 },
  awayName: { textAlign: 'right' },
  // ⚠ Was a 22pt text cell; the chevron (ADR 0045) makes it a row and costs the
  // two name columns ~13pt between them. `half`, not `one`, keeps that bill as
  // small as the disclosure can be — see the gap note on `row` above.
  ft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half },
});
