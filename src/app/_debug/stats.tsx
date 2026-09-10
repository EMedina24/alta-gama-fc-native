/**
 * Season stats state previews — dev-only (ADR 0141/0143/0149).
 *
 * ⚠ **It exists because the states that matter most cannot be reached from the
 * app.** Three of the Club view's six cards vanish when `coverage.sufficient`
 * is false, and the honest rendering of that — the cards gone, one line saying
 * why, and NOT a screen of zeroes — is the single most damaging thing this
 * feature could get wrong. Waiting for a league to break is not a review
 * process, and the Bundesliga case is permanent but needs a Bundesliga club.
 *
 * ⚠⚠ **`?only=player-goalless` is the ACCEPTANCE CASE for ADR 0149** — Valverde's
 * real 2026 blocks side by side: the merged one reads `1 GOAL` in the headline
 * while the LaLiga one the charts read is genuinely goalless, so every
 * goal-derived panel stays suppressed. That pairing is the whole of 0149 on one
 * screen, and it is the exact screen Ed reported from TestFlight. If the headline
 * reads `0`, the merge is not wired; if the charts come BACK, the `scored` gate
 * has been pointed at the headline instead of at the block that feeds them.
 *
 * ⚠ `?only=bundesliga` is the other half of that check: a single-competition
 * merged block. It must show NO "all competitions" marker and NO scope lines —
 * Bayern's merged block IS its Bundesliga block, and a caveat there is a caveat
 * about a discrepancy that does not exist.
 *
 * ⚠ `?only=no-totals` renders `totals={null}` — a payload captured before
 * `senpai-backend` §120.15 shipped. It must fall back to the per-competition
 * figures rather than blanking or crashing.
 *
 * ⚠ Every payload here is real production data, generated into
 * `stats-fixtures.ts` from checked-in captures by
 * `scripts/gen-stats-fixtures.mjs` (trap 48). The ONE synthetic case is
 * `?only=cap`, and it is labelled: it stretches real timelines to 42 entries to
 * draw the layout cap once (trap 56), because the strip and the matchweek chart
 * are the two places on this screen that a short season hides.
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
import type {
  PlayerSeasonStatsView,
  PlayerSeasonTotalsView,
  StatsMergedTimelineEntryView,
  StatsTimelineEntryView,
  TeamSeasonStatsView,
  TeamSeasonTotalsView,
} from '@/lib/cronogol/types';
import {
  CLUB_FULL,
  CLUB_SCORELINES_ONLY,
  CLUB_THIN,
  CLUB_TOTALS,
  CLUB_TOTALS_SINGLE,
  PLAYER_FULL,
  PLAYER_GOALLESS,
  PLAYER_THIN,
  PLAYER_TOTALS,
  PLAYER_TOTALS_GOALLESS,
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

/**
 * The MERGED twin of `CAPPED`, equally synthetic.
 *
 * ⚠⚠ **It has to exist, and forgetting it would have silently broken the cap
 * case.** Since 0149 the strip and the cumulative line read the merged timeline,
 * so stretching only the per-competition block would have drawn a 5-cell strip
 * under a 42-bar chart and the layout cap would have gone unchecked.
 *
 * ⚠ Every seventh fixture is tagged `champions-league` so the merged axis is
 * exercised too: with more than one competition in the array, `axisLabels` must
 * fall back to POSITIONS, because "MD1" would otherwise name two different nights.
 */
const CAPPED_TOTALS: TeamSeasonTotalsView = {
  ...CLUB_TOTALS,
  timeline: Array.from({ length: 42 }, (_, i): StatsMergedTimelineEntryView => {
    const source = CLUB_TOTALS.timeline[i % CLUB_TOTALS.timeline.length];
    return {
      ...source,
      id: `cap-${i}`,
      mw: i + 1,
      gf: i % 5 === 0 ? 0 : source.gf,
      competition: i % 7 === 0 ? 'champions-league' : 'laliga',
    };
  }),
  scoringRun: CLUB_TOTALS.scoringRun
    ? { ...CLUB_TOTALS.scoringRun, length: 9, startIndex: 21, endIndex: 29 }
    : null,
  coverage: { ...CLUB_TOTALS.coverage, fixturesCounted: 42, fixturesTotal: 42 },
};

type Case =
  | 'full'
  | 'thin'
  | 'bundesliga'
  | 'cap'
  | 'no-totals'
  | 'player'
  | 'player-thin'
  | 'player-goalless';

const LABELS: Record<Case, string> = {
  full: 'Club · LaLiga charts under a MERGED headline — 22 all-comps v 17 league',
  thin: 'Club · UCL, sufficient=false at ratio 1 — events null as a group',
  bundesliga: 'Club · Bundesliga, ONE competition — no marker, no scope lines',
  cap: 'Club · SYNTHETIC 42-match season — the layout cap (trap 56)',
  'no-totals': 'Club · totals=null — a pre-§120.15 payload falls back to the block',
  player: 'Player · Raphinha — merged 8 goals over LaLiga charts summing to 6',
  'player-thin': 'Player · Raphinha UCL — counts arrive as 0, not null; gated anyway',
  'player-goalless':
    "Player · ⚠ ACCEPTANCE: Valverde reads 1 GOAL, charts stay off (Ed's screen)",
};

/** The per-competition block and the merged block that pair with each case. */
const CLUB: Partial<
  Record<Case, { season: TeamSeasonStatsView; totals: TeamSeasonTotalsView | null }>
> = {
  full: { season: CLUB_FULL, totals: CLUB_TOTALS },
  thin: { season: CLUB_THIN, totals: CLUB_TOTALS },
  bundesliga: { season: CLUB_SCORELINES_ONLY, totals: CLUB_TOTALS_SINGLE },
  cap: { season: CAPPED, totals: CAPPED_TOTALS },
  'no-totals': { season: CLUB_FULL, totals: null },
};

const PLAYER: Partial<
  Record<
    Case,
    {
      name: string;
      season: PlayerSeasonStatsView;
      totals: PlayerSeasonTotalsView | null;
    }
  >
> = {
  player: { name: 'Raphael Dias Belloli', season: PLAYER_FULL, totals: PLAYER_TOTALS },
  'player-thin': {
    name: 'Raphael Dias Belloli',
    season: PLAYER_THIN,
    totals: PLAYER_TOTALS,
  },
  'player-goalless': {
    name: 'Federico Valverde',
    season: PLAYER_GOALLESS,
    totals: PLAYER_TOTALS_GOALLESS,
  },
};

/**
 * What each case's charts leave out, for the scope lines.
 *
 * ⚠ Derived from the merged block's own `competitions`, exactly as the screen
 * does it — hard-coding a slug here would let the debug route disagree with the
 * app about when a caveat is drawn, which is the one thing it exists to check.
 * ⚠ Bundesliga's single-competition block therefore yields `[]`.
 */
function excludedFor(totals: { competitions: readonly string[] } | null): string[] {
  if (!totals) return [];
  return totals.competitions.filter((slug) => slug !== 'laliga' && slug !== 'bundesliga');
}

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
    : [
        'full',
        'thin',
        'bundesliga',
        'cap',
        'no-totals',
        'player',
        'player-thin',
        'player-goalless',
      ];

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top }]}>
      {cases.map((key) => {
        const club = CLUB[key];
        const player = PLAYER[key];
        return (
          <View key={key} style={styles.case}>
            <Text variant="eyebrowSm" color="accent">
              {LABELS[key]}
            </Text>
            {club ? (
              <ClubView
                season={club.season}
                totals={club.totals}
                copy={stats}
                progress={progress}
                competitionName={key === 'bundesliga' ? 'Bundesliga' : 'LaLiga'}
                chartsExcluded={excludedFor(club.totals)}
                formatDate={(iso) => iso.slice(0, 10)}
                seasonLength={key === 'bundesliga' ? 34 : 38}
              />
            ) : player ? (
              <PlayerView
                name={player.name}
                squad={null}
                season={player.season}
                totals={player.totals}
                competitionName="LaLiga"
                chartsExcluded={excludedFor(player.totals)}
                positionLabel={copy.player.positionNames.FWD}
                copy={stats}
                progress={progress}
                wash="#a50044"
                onChangePlayer={() => {}}
              />
            ) : null}
          </View>
        );
      })}
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
