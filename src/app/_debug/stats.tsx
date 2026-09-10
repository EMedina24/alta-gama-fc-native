/**
 * Season stats state previews — dev-only (ADR 0141/0143).
 *
 * ⚠ **It exists because the states that matter most cannot be reached from the
 * app.** Three of the Club view's six cards vanish when `coverage.sufficient`
 * is false, and the honest rendering of that — the cards gone, one line saying
 * why, and NOT a screen of zeroes — is the single most damaging thing this
 * feature could get wrong. Waiting for a league to break is not a review
 * process, and the Bundesliga case is permanent but needs a Bundesliga club.
 *
 * ⚠ Every payload here is real production data, generated into
 * `stats-fixtures.ts` from checked-in captures (trap 48). The ONE synthetic
 * case is `?only=cap`, and it is labelled: it stretches a real timeline to 42
 * entries to draw the layout cap once (trap 56), because the strip and the
 * matchweek chart are the two places on this screen that a short season hides.
 *
 * `?only=` takes `full`, `thin`, `bundesliga`, `cap`, `player`, `player-thin`.
 */
import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/atoms';
import { ClubView, PlayerView } from '@/components/organisms/season-stats';
import { Colors, SeasonStats, Spacing } from '@/constants/theme';
import { useI18n } from '@/lib/i18n/use-i18n';
import type { StatsTimelineEntryView, TeamSeasonStatsView } from '@/lib/cronogol/types';
import {
  CLUB_FULL,
  CLUB_SCORELINES_ONLY,
  CLUB_THIN,
  PLAYER_FULL,
  PLAYER_THIN,
} from './stats-fixtures';

/**
 * A full-length season, for the layout cap alone.
 *
 * ⚠ SYNTHETIC, and the only synthetic thing in this file. It repeats a real
 * four-match timeline out to 42 — Segunda's length, which is longer than the
 * mock's 38 — so the squares strip and the matchweek bars can be seen at the
 * width they will actually have to survive. Read it for LAYOUT and never for
 * numbers; the totals below deliberately do not add up to the timeline.
 */
const CAPPED: TeamSeasonStatsView = {
  ...CLUB_FULL,
  timeline: Array.from({ length: 42 }, (_, i): StatsTimelineEntryView => {
    const source = CLUB_FULL.timeline[i % CLUB_FULL.timeline.length];
    return { ...source, id: `cap-${i}`, mw: i + 1, gf: i % 5 === 0 ? 0 : source.gf };
  }),
  scoringRun: CLUB_FULL.scoringRun
    ? { ...CLUB_FULL.scoringRun, length: 9, startIndex: 21, endIndex: 29 }
    : null,
  coverage: { ...CLUB_FULL.coverage, fixturesCounted: 42, fixturesTotal: 42 },
};

type Case = 'full' | 'thin' | 'bundesliga' | 'cap' | 'player' | 'player-thin';

const LABELS: Record<Case, string> = {
  full: 'Club · LaLiga, full coverage — every card draws',
  thin: 'Club · UCL, sufficient=false at ratio 1 — events null as a group',
  bundesliga: 'Club · Bundesliga, scorelines only — 2 matches played, no events ever',
  cap: 'Club · SYNTHETIC 42-match season — the layout cap (trap 56)',
  player: 'Player · Raphinha LaLiga, full coverage',
  'player-thin': 'Player · Raphinha UCL — counts arrive as 0, not null; gated anyway',
};

export default function StatsDebugScreen() {
  const { only } = useLocalSearchParams<{ only?: Case }>();
  const insets = useSafeAreaInsets();
  const { copy } = useI18n();
  const stats = copy.stats;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: SeasonStats.count,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(progress);
  }, [progress, only]);

  const cases: Case[] = only
    ? [only]
    : ['full', 'thin', 'bundesliga', 'cap', 'player', 'player-thin'];

  const club: Partial<Record<Case, TeamSeasonStatsView>> = {
    full: CLUB_FULL,
    thin: CLUB_THIN,
    bundesliga: CLUB_SCORELINES_ONLY,
    cap: CAPPED,
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top }]}>
      {cases.map((key) => (
        <View key={key} style={styles.case}>
          <Text variant="eyebrowSm" color="accent">
            {LABELS[key]}
          </Text>
          {club[key] ? (
            <ClubView
              season={club[key]}
              copy={stats}
              progress={progress}
              formatDate={(iso) => iso.slice(0, 10)}
              seasonLength={key === 'bundesliga' ? 34 : 38}
            />
          ) : (
            <PlayerView
              name="Raphael Dias Belloli"
              squad={null}
              season={key === 'player' ? PLAYER_FULL : PLAYER_THIN}
              clubName="Barcelona"
              positionLabel={copy.player.positionNames.FWD}
              copy={stats}
              progress={progress}
              wash="#a50044"
              onChangePlayer={() => {}}
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.five,
    gap: Spacing.six,
    backgroundColor: Colors.dark.background,
  },
  case: { gap: Spacing.two },
});
