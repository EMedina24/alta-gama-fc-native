/**
 * The Club half of Season stats (ADR 0141): a season's shape in six cards.
 *
 * ⚠⚠ **The cards split into two halves that fail independently, and the split
 * is the whole design of this file.** Goals, the rings, the run and the
 * matchweek bars are SCORELINE-derived — always present, every competition,
 * including the Bundesliga where they are the only thing that works. Conceded
 * bands, comebacks and discipline are EVENT-derived and go null as a group when
 * `coverage.sufficient` is false. The second half is not rendered with zeroes
 * and not rendered with dashes: it is not rendered, and `CoverageNote` says why
 * (ADR 0143).
 *
 * ⚠ Every number is a count-up sharing ONE clock, passed down from the screen.
 * Nothing here owns an animation.
 *
 * ⚠ This organism fetches nothing. It takes the block the screen already
 * picked, because picking it needs the league and the league needs standings.
 */
import { StyleSheet, View } from 'react-native';
import { type SharedValue } from 'react-native-reanimated';

import { AnimatedNumber, MeterBar, RingGauge, Text } from '@/components/atoms';
import { BandBars, BarSeries, GoalsLine, RunStrip, StatCard } from '@/components/molecules';
import { Colors, Size, Spacing } from '@/constants/theme';
import {
  bandSeries,
  cumulativeGoals,
  goalsByMatchweek,
  hasEvents,
  lateShare,
  perMatch,
  runLabel,
  scoredStrip,
} from '@/lib/cronogol/stats';
import type { Copy } from '@/lib/i18n/copy';
import type { StatsTimelineEntryView, TeamSeasonStatsView } from '@/lib/cronogol/types';
import { CoverageNote } from './coverage-note';
import { Rise } from './rise';

/** The design's chart heights. */
const AREA_H = 124;
const BARS_H = 110;
const RING = 104;
/** "cutout 78%" — the ring's stroke is the remaining 22%, halved. */
const RING_STROKE = (RING * (1 - 0.78)) / 2;

export interface ClubViewProps {
  season: TeamSeasonStatsView;
  copy: Copy['stats'];
  progress: SharedValue<number>;
  /** How a kickoff is written, for a cup run with no matchweeks. */
  formatDate: (iso: string) => string;
  /**
   * The league's full season length, for the charts that are SEASON-shaped
   * rather than played-shaped (ADR 0141).
   *
   * ⚠ Without it, a club four matches in draws four half-card-wide cells and
   * two enormous bars — the shapes read as "the season is over and this is all
   * of it". Sized to the season, the same data reads as a season beginning,
   * which is what it is. Optional because the league is not always resolvable;
   * the charts then fall back to what has been played.
   */
  seasonLength?: number | null;
}

export function ClubView({
  season,
  copy,
  progress,
  formatDate,
  seasonLength = null,
}: ClubViewProps) {
  const events = hasEvents(season.coverage);
  const played = season.coverage.fixturesTotal;
  /**
   * ⚠ A leading `0` — the season before a ball is kicked.
   *
   * Without it a club two matches in draws a FLAT line across the whole card
   * (both cumulative values equal the maximum, so both sit on the top edge) and
   * the area fill becomes a solid slab. Starting at the origin is also what the
   * quantity means: cumulative goals begin at nothing. The last value still
   * equals `goalsFor` exactly, which is the property the chart is read for.
   */
  const cumulative = [0, ...cumulativeGoals(season.timeline)];
  const matchweeks = goalsByMatchweek(season.timeline);
  const strip = scoredStrip(season.timeline, season.scoringRun);
  const rate = perMatch(season.goalsFor, season.coverage);
  const run = runLabel(season.scoringRun);
  const late = lateShare(season.goalsForByBand);
  const concededLate = lateShare(season.goalsAgainstByBand);
  const againstBands = bandSeries(season.goalsAgainstByBand);

  const runWindow =
    run === null
      ? undefined
      : run.kind === 'matchweeks'
        ? copy.runWindow(`MD${run.from}`, `MD${run.to}`)
        : copy.runWindow(formatDate(run.fromKickoffUtc), formatDate(run.toKickoffUtc));

  return (
    <>
      {/* 1 · Goals scored — the season's headline and its cumulative shape. */}
      <Rise step={0}>
        <StatCard label={copy.goalsScored}>
          <View style={styles.headline}>
            <View style={styles.headlineLeft}>
              <AnimatedNumber value={season.goalsFor} progress={progress} color="accent" />
              {rate !== null ? (
                <Text variant="caption" color="textDim">
                  {copy.perMatch(rate.toFixed(1))}
                </Text>
              ) : null}
            </View>
            {season.biggestWin ? (
              <View style={styles.headlineRight}>
                <Text variant="eyebrowSm" color="textFaint">
                  {copy.biggestWin}
                </Text>
                <Text variant="title3" color="text" tabular>
                  {`${season.biggestWin.goalsFor}–${season.biggestWin.goalsAgainst}`}
                </Text>
                <Text variant="micro" color="textMuted" numberOfLines={1}>
                  {[
                    // ⚠ `opponent` is nullable and `matchweek` is null for cups
                    // — the meta line drops the part it does not have rather
                    // than printing "v null · MDnull".
                    season.biggestWin.opponent
                      ? copy.versus(season.biggestWin.opponent.name)
                      : null,
                    season.biggestWin.matchweek !== null
                      ? `MD${season.biggestWin.matchweek}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            ) : null}
          </View>
          <GoalsLine
            values={cumulative}
            height={AREA_H}
            ticks={axisTicks(cumulative[cumulative.length - 1] ?? 0)}
            xLabels={axisLabels(season.timeline)}
          />
        </StatCard>
      </Rise>

      {/* 2 · Clean sheets and failed to score. Scoreline-derived, so these
          survive every competition — including the ones with no events. */}
      <Rise step={1}>
        <View style={styles.pair}>
          <View style={styles.half}>
            <StatCard label={copy.cleanSheets}>
              <View style={styles.ringWrap}>
                <RingGauge
                  size={RING}
                  thickness={RING_STROKE}
                  rounded
                  segments={[
                    { share: played > 0 ? season.cleanSheets / played : 0,
                      color: Colors.dark.accent },
                  ]}>
                  <RingCentre
                    value={season.cleanSheets}
                    total={played}
                    copy={copy}
                    progress={progress}
                  />
                </RingGauge>
              </View>
            </StatCard>
          </View>
          <View style={styles.half}>
            <StatCard label={copy.failedToScore}>
              <View style={styles.ringWrap}>
                <RingGauge
                  size={RING}
                  thickness={RING_STROKE}
                  rounded
                  segments={[
                    { share: played > 0 ? season.failedToScore / played : 0,
                      color: Colors.dark.danger },
                  ]}>
                  <RingCentre
                    value={season.failedToScore}
                    total={played}
                    copy={copy}
                    progress={progress}
                  />
                </RingGauge>
              </View>
            </StatCard>
          </View>
        </View>
      </Rise>

      {/* 3 · The scoring run, and the strip it sits inside. */}
      <Rise step={2}>
        <StatCard label={copy.scoringRun} meta={runWindow}>
          <View style={styles.runHead}>
            <AnimatedNumber
              value={season.longestScoringRun}
              progress={progress}
              color="accent"
            />
            <Text variant="bodyStrong" color="text" style={styles.runLabel}>
              {copy.runValue}
            </Text>
          </View>
          <RunStrip
            cells={strip}
            seasonLength={seasonLength}
            accessibilityLabel={`${season.longestScoringRun} ${copy.runValue}`}
          />
        </StatCard>
      </Rise>

      {/* 4 · Goals per matchweek, and the venue split under it. */}
      <Rise step={3}>
        <StatCard
          label={copy.goalsPerMatchweek}
          accessory={
            <View style={styles.legend}>
              <Swatch color={Colors.dark.accent} label={copy.home} />
              <Swatch color={Colors.dark.chartSeriesAlt} label={copy.away} />
            </View>
          }>
          <BarSeries
            entries={matchweeks.map((week) => ({
              value: week.home + week.away,
              split: week.away,
              label: `${week.mw}`,
            }))}
            // ⚠ A label every 7th column, so 42 matchweeks do not overlap into
            // a grey smear. At four matchweeks that is one label, which is
            // right: the axis is the bars, not the numbers.
            labelEvery={Math.max(
              1,
              Math.ceil(Math.max(matchweeks.length, seasonLength ?? 0) / 6),
            )}
            columns={seasonLength}
            height={BARS_H}
          />
          <View style={styles.splits}>
            <VenueSplit
              label={copy.home}
              split={season.home}
              color={Colors.dark.accent}
              total={season.goalsFor}
            />
            <VenueSplit
              label={copy.away}
              split={season.away}
              color={Colors.dark.chartSeriesAlt}
              total={season.goalsFor}
            />
          </View>
        </StatCard>
      </Rise>

      {/* ── Everything below needs EVENTS. ────────────────────────────────── */}
      {!events ? (
        <Rise step={4}>
          <CoverageNote
            text={copy.noEvents(season.coverage.fixturesCounted, season.coverage.fixturesTotal)}
          />
        </Rise>
      ) : (
        <>
          {/* 5 · Conceded by minute, with the two late-goal rails. */}
          {againstBands ? (
            <Rise step={4}>
              <StatCard label={copy.conceded}>
                <View style={styles.concededRow}>
                  <View style={styles.concededBars}>
                    <BandBars
                      entries={againstBands.map((band, index) => ({
                        label: band.band,
                        value: band.goals,
                        // The last band is the one the card is about.
                        color:
                          index === againstBands.length - 1
                            ? Colors.dark.danger
                            : undefined,
                      }))}
                    />
                  </View>
                  <View style={styles.rail}>
                    {late !== null ? (
                      <View style={styles.railItem}>
                        <Text variant="eyebrowSm" color="textFaint">
                          {copy.lateGoals}
                        </Text>
                        <AnimatedNumber
                          value={late * 100}
                          progress={progress}
                          variant="statMd"
                          color="accent"
                          suffix="%"
                        />
                        <Text variant="micro" color="textMuted">
                          {copy.afterSeventyFive}
                        </Text>
                      </View>
                    ) : null}
                    {concededLate !== null ? (
                      <View style={styles.railItem}>
                        <Text variant="eyebrowSm" color="textFaint">
                          {copy.concededLate}
                        </Text>
                        <AnimatedNumber
                          value={concededLate * 100}
                          progress={progress}
                          variant="statMd"
                          color="danger"
                          suffix="%"
                        />
                        <Text variant="micro" color="textMuted">
                          {copy.afterSeventyFive}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </StatCard>
            </Rise>
          ) : null}

          {/* 6 · Comebacks and discipline. */}
          <Rise step={5}>
            <View style={styles.pair}>
              {season.comebackPoints !== null && season.comebackWins !== null ? (
                <View style={styles.half}>
                  <StatCard label={copy.comebacks}>
                    <AnimatedNumber
                      value={season.comebackPoints}
                      progress={progress}
                      variant="statLg"
                    />
                    <Text variant="micro" color="textDim">
                      {copy.comebackNote(season.comebackWins)}
                    </Text>
                  </StatCard>
                </View>
              ) : null}
              {season.yellows !== null && season.reds !== null ? (
                <View style={styles.half}>
                  <StatCard label={copy.discipline}>
                    <View style={styles.cards}>
                      <View style={[styles.cardGlyph, styles.yellow]} />
                      <View style={[styles.cardGlyph, styles.red]} />
                    </View>
                    <View style={styles.cardCounts}>
                      <AnimatedNumber
                        value={season.yellows}
                        progress={progress}
                        variant="statMd"
                      />
                      <AnimatedNumber
                        value={season.reds}
                        progress={progress}
                        variant="statMd"
                      />
                    </View>
                  </StatCard>
                </View>
              ) : null}
            </View>
          </Rise>
        </>
      )}

      <Rise step={6}>
        <Text variant="micro" color="textFaint" style={styles.footnote}>
          {copy.footnote}
        </Text>
      </Rise>
    </>
  );
}

/**
 * Two or three round numbers to rule the goals axis at.
 *
 * ⚠ Round, not evenly-spaced fractions of the total: `0 / 8.5 / 17` on an axis
 * of goals reads as a bug, because half a goal is not a thing. A season with
 * fewer than four goals gets no gridlines at all rather than a rule at 1.
 */
function axisTicks(max: number): number[] {
  if (max < 4) return [];
  const step = max <= 20 ? 5 : max <= 60 ? 25 : 50;
  const ticks: number[] = [];
  for (let value = 0; value <= max; value += step) ticks.push(value);
  return ticks;
}

/**
 * Up to five labels along the bottom of the cumulative line, each with the
 * fraction of the plot it belongs at.
 *
 * ⚠⚠ They name MATCHWEEKS but they mark KICKOFF POSITIONS, and the two are not
 * the same order — a postponement puts matchweek 2 before matchweek 1, live on
 * Barcelona today. Each label is therefore read off the fixture actually AT
 * that position and never computed from a matchweek number; a fixture with no
 * matchweek (a Champions League knockout) shows its position instead of an
 * invented one.
 *
 * ⚠ The line starts at the origin, so it has `timeline.length + 1` points and
 * fixture `j` sits at `(j + 1) / length`. Placing labels at `i / (count - 1)`
 * instead — evenly across the axis — put each one a slot to the left of the
 * point it named, and duplicated a label whenever two slots rounded together.
 */
function axisLabels(
  timeline: readonly StatsTimelineEntryView[],
): { label: string; at: number }[] {
  const n = timeline.length;
  if (n < 2) return [];
  const count = Math.min(5, n);
  return Array.from({ length: count }, (_, i) => {
    const j = Math.round((i * (n - 1)) / (count - 1));
    const entry = timeline[j];
    return {
      label: entry.mw != null ? `MD${entry.mw}` : `${j + 1}`,
      at: (j + 1) / n,
    };
  });
}

/** The value over its denominator, inside a ring. */
function RingCentre({
  value,
  total,
  copy,
  progress,
}: {
  value: number;
  total: number;
  copy: Copy['stats'];
  progress: SharedValue<number>;
}) {
  return (
    <View style={styles.ringCentre}>
      <AnimatedNumber
        value={value}
        progress={progress}
        variant="statMd"
        align="center"
      />
      <Text variant="xiRailBadge" color="textFaint" tabular>
        {copy.outOf(total)}
      </Text>
    </View>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.swatchRow}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text variant="xiRailBadge" color="textDim">
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

/**
 * One venue's record and its share of the season's goals.
 *
 * ⚠ W-D-L comes from the venue split, which the stats route DOES serve — it is
 * the one place W/D/L appears here, because a home/away split is a fact the
 * standings cannot answer. The league table's own record still comes from
 * `/cronogol/standings`; nothing on this screen may restate it.
 */
function VenueSplit({
  label,
  split,
  color,
  total,
}: {
  label: string;
  split: { won: number; drawn: number; lost: number; goalsFor: number };
  color: string;
  total: number;
}) {
  return (
    <View style={styles.split}>
      <View style={styles.splitHead}>
        <Text variant="xiRailBadge" color="textDim">
          {label.toUpperCase()}
        </Text>
        <Text variant="micro" color="text" tabular>
          {`${split.won}-${split.drawn}-${split.lost} · ${split.goalsFor}`}
        </Text>
      </View>
      <MeterBar share={total > 0 ? split.goalsFor / total : 0} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headlineLeft: { flex: 1, gap: Spacing.one },
  headlineRight: { alignItems: 'flex-end', gap: Spacing.half },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  ringWrap: { alignItems: 'center', paddingVertical: Spacing.one },
  ringCentre: { alignItems: 'center' },
  runHead: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.three },
  runLabel: { flex: 1 },
  legend: { flexDirection: 'row', gap: Spacing.three },
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  splits: { flexDirection: 'row', gap: Spacing.three },
  split: { flex: 1, gap: Spacing.one },
  splitHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  concededRow: { flexDirection: 'row', gap: Spacing.three },
  concededBars: { flex: 1 },
  rail: {
    width: 108,
    borderLeftWidth: 1,
    borderLeftColor: Colors.dark.trayLine,
    paddingLeft: Spacing.three,
    gap: Spacing.three,
  },
  railItem: { gap: Spacing.half },
  cards: { flexDirection: 'row', gap: Spacing.two },
  cardGlyph: { width: 13, height: 18, borderRadius: 3 },
  yellow: { backgroundColor: Colors.dark.cardYellow },
  red: { backgroundColor: Colors.dark.cardRed },
  cardCounts: { flexDirection: 'row', gap: Spacing.four },
  footnote: { fontWeight: '400', maxWidth: Size.footnoteWidth },
});
