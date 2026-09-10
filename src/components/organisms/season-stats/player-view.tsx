/**
 * The Players half of Season stats (ADR 0141): one player's season.
 *
 * ⚠⚠ **There is no "Assisted by" card and there is no endpoint behind one**
 * (ADR 0145). The mock's partnership chart is the one panel in the handoff with
 * nothing serving it: scorer–assister pairs are not a grain the backend builds,
 * and it is not one query away. Its slot carries goals by matchweek instead —
 * ⚠ which is SPARSE and covers only fixtures with a matchweek, so it must never
 * carry a percentage or a total.
 *
 * ⚠ The split is the same as the Club view's: goals, assists, involvements and
 * the penalty count survive a thin sweep; bands, moments and cards do not. A
 * null is never drawn as a zero (ADR 0143).
 *
 * ⚠ **`quickestBooking: null` is ambiguous** — never booked, or below the
 * coverage floor — and the two are not distinguishable on the wire. The card is
 * only reachable inside the `events` branch, so an absent one there means "not
 * booked"; outside it, nothing is claimed either way.
 *
 * ⚠ The identity strip (portrait, shirt, position) comes from the SQUAD, not
 * from this payload — the stats route carries a name and nothing else.
 *
 * ⚠⚠ **The card and moment counts are gated on `coverage.sufficient` even
 * though they arrive as NUMBERS, not nulls.** The club payload nulls its event
 * fields as a group; the player payload does not — a block the backend itself
 * marks insufficient still answers `yellows: 0, reds: 0, braces: 0` (verified
 * on Raphinha's 2026 Champions League block, 2026-09-10). Those zeroes are
 * "we did not look", wearing the costume of "it did not happen", which is the
 * exact failure the nulls contract exists to prevent — so they are hidden
 * behind the same gate rather than printed because the type permits it.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { type SharedValue } from 'react-native-reanimated';

import { AnimatedNumber, MeterBar, PlayerPhoto, RingGauge, Text } from '@/components/atoms';
import { BarSeries, StatCard, Tray } from '@/components/molecules';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import {
  bandSeries,
  halfSplit,
  hasEvents,
  lateShare,
  openPlayGoals,
} from '@/lib/cronogol/stats';
import type { Copy } from '@/lib/i18n/copy';
import type { PlayerSeasonStatsView, SquadPlayerView } from '@/lib/cronogol/types';
import { CoverageNote } from './coverage-note';
import { Rise } from './rise';

const RING = 118;
/** "cutout 74%". */
const RING_STROKE = (RING * (1 - 0.74)) / 2;
const TIMING_H = 96;

export interface PlayerViewProps {
  name: string;
  /** The squad row, for the portrait and the `#9 · FORWARD` line. Nullable. */
  squad: SquadPlayerView | null;
  season: PlayerSeasonStatsView;
  /** The club whose matches the streak counts — see `copy.stats.streak`. */
  clubName: string;
  positionLabel: string | null;
  copy: Copy['stats'];
  progress: SharedValue<number>;
  wash?: string | null;
  onChangePlayer: () => void;
}

export function PlayerView({
  name,
  squad,
  season,
  clubName,
  positionLabel,
  copy,
  progress,
  wash = null,
  onChangePlayer,
}: PlayerViewProps) {
  const events = hasEvents(season.coverage);
  const openPlay = openPlayGoals(season);
  const bands = bandSeries(season.goalsByBand);
  const halves = halfSplit(season.goalsByBand);
  const late = lateShare(season.goalsByBand);
  const byMatchweek = season.goalsByMatchweek;

  return (
    <>
      {/* 1 · Identity, and the three headline numbers. */}
      <Rise step={0}>
        <Tray>
          <View style={styles.identity}>
            {wash ? <View style={[styles.wash, { backgroundColor: wash }]} /> : null}
            <View style={styles.identityRow}>
              <PlayerPhoto src={squad?.photoUrl ?? null} variant="hero" />
              <View style={styles.names}>
                {/* ⚠ Both halves are nullable and the line drops what it does
                    not have — a squad with no shirt number must not print
                    "#null · FORWARD". */}
                {squad?.shirt !== undefined || positionLabel ? (
                  <Text variant="eyebrowSm" color="textDim" numberOfLines={1}>
                    {[
                      squad?.shirt !== null && squad?.shirt !== undefined
                        ? `#${squad.shirt}`
                        : null,
                      positionLabel,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
                <Text variant="title3" numberOfLines={2}>
                  {name}
                </Text>
              </View>
              <ChangeChip label={copy.change} onPress={onChangePlayer} />
            </View>
            <View style={styles.triple}>
              <Figure
                value={season.goals}
                label={copy.goals}
                color="accent"
                progress={progress}
              />
              <Figure value={season.assists} label={copy.assists} progress={progress} divider />
              <Figure
                value={season.goalInvolvements}
                label={copy.involvements}
                progress={progress}
                divider
              />
            </View>
          </View>
        </Tray>
      </Rise>

      {/* 2 · The penalty split. Penalty GOALS are always known; the conversion
          rate is not — it is null on the Premier League and Serie A, where a
          miss is not observable at all. */}
      <Rise step={1}>
        <StatCard label={copy.penaltySplit}>
          <View style={styles.penRow}>
            <RingGauge
              size={RING}
              thickness={RING_STROKE}
              segments={[
                { share: season.goals > 0 ? openPlay / season.goals : 0,
                  color: Colors.dark.accent },
                { share: season.goals > 0 ? season.penaltyGoals / season.goals : 0,
                  color: Colors.dark.chartSeriesAlt },
              ]}>
              <View style={styles.ringCentre}>
                <AnimatedNumber
                  value={openPlay}
                  progress={progress}
                  variant="statMd"
                  align="center"
                />
                <Text variant="xiRailBadge" color="textFaint">
                  {copy.nonPen}
                </Text>
              </View>
            </RingGauge>
            <View style={styles.penLegend}>
              <LegendRow
                color={Colors.dark.accent}
                label={copy.openPlay}
                value={openPlay}
              />
              <LegendRow
                color={Colors.dark.chartSeriesAlt}
                label={copy.fromTheSpot}
                value={season.penaltyGoals}
              />
              {season.penaltyConversion !== null && season.penaltiesMissed !== null ? (
                <View style={styles.conversion}>
                  <View style={styles.conversionHead}>
                    <Text variant="eyebrowSm" color="textFaint">
                      {copy.conversion}
                    </Text>
                    <Text variant="micro" color="accent" tabular>
                      {`${Math.round(season.penaltyConversion * 100)}% · ${copy.conversionOf(
                        season.penaltyGoals,
                        season.penaltyGoals + season.penaltiesMissed,
                      )}`}
                    </Text>
                  </View>
                  <MeterBar share={season.penaltyConversion} />
                </View>
              ) : null}
            </View>
          </View>
        </StatCard>
      </Rise>

      {!events ? (
        <Rise step={2}>
          <CoverageNote
            text={copy.noEvents(season.coverage.fixturesCounted, season.coverage.fixturesTotal)}
          />
        </Rise>
      ) : (
        <>
          {/* 3 · Goal timing, and the half split under it. */}
          {bands ? (
            <Rise step={2}>
              <StatCard
                label={copy.goalTiming}
                accessory={
                  <View style={styles.stoppage}>
                    <Text variant="title3" color="text" tabular>
                      {`${bands[bands.length - 1].goals}`}
                    </Text>
                    <Text variant="micro" color="textMuted">
                      {copy.inStoppageTime}
                    </Text>
                  </View>
                }>
                {late !== null ? (
                  <View style={styles.runHead}>
                    <AnimatedNumber
                      value={late * 100}
                      progress={progress}
                      variant="statLg"
                      color="accent"
                      suffix="%"
                    />
                    <Text variant="bodyStrong" color="text" style={styles.runLabel}>
                      {copy.afterSeventyFive}
                    </Text>
                  </View>
                ) : null}
                <BarSeries
                  entries={bands.map((band, index) => ({
                    value: band.goals,
                    label: band.band,
                    // The stoppage band is the one the eye should find.
                    color: index === bands.length - 1 ? Colors.dark.text : undefined,
                  }))}
                  height={TIMING_H}
                />
                {halves ? (
                  <View style={styles.halves}>
                    <View style={styles.halfHead}>
                      <Text variant="xiRailBadge" color="textDim" tabular>
                        {`${copy.firstHalf.toUpperCase()} · ${halves.first}`}
                      </Text>
                      <Text variant="xiRailBadge" color="textDim" tabular>
                        {`${halves.second} · ${copy.secondHalf.toUpperCase()}`}
                      </Text>
                    </View>
                    <View style={styles.halfBar}>
                      <View
                        style={[
                          styles.halfFill,
                          {
                            flex: Math.max(halves.first, 0.001),
                            backgroundColor: Colors.dark.chartSeriesAlt,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.halfFill,
                          {
                            flex: Math.max(halves.second, 0.001),
                            backgroundColor: Colors.dark.accent,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ) : null}
              </StatCard>
            </Rise>
          ) : null}

          {/* 4 · Goals by matchweek — the slot the mock gave to partnerships.
              ⚠ Sparse and matchweek-only: no total, no percentage. */}
          {byMatchweek && Object.keys(byMatchweek).length > 0 ? (
            <Rise step={3}>
              <StatCard label={copy.byMatchweek}>
                <BarSeries
                  entries={Object.entries(byMatchweek)
                    .map(([mw, goals]) => ({ mw: Number(mw), goals }))
                    .sort((a, b) => a.mw - b.mw)
                    .map(({ mw, goals }) => ({ value: goals, label: `${mw}` }))}
                  height={TIMING_H}
                />
              </StatCard>
            </Rise>
          ) : null}

          {/* 5 · The four moment tiles. */}
          <Rise step={4}>
            <View style={styles.pair}>
              <View style={styles.half}>
                <StatCard label={copy.braces}>
                  <AnimatedNumber value={season.braces} progress={progress} variant="statMd" />
                  <Text variant="micro" color="textDim">
                    {copy.bracesNote}
                  </Text>
                </StatCard>
              </View>
              <View style={styles.half}>
                <StatCard label={copy.hatTricks}>
                  <AnimatedNumber
                    value={season.hatTricks}
                    progress={progress}
                    variant="statMd"
                    color="accent"
                  />
                  <Text variant="micro" color="textDim" numberOfLines={1}>
                    {hatTrickNote(season, copy)}
                  </Text>
                </StatCard>
              </View>
            </View>
          </Rise>
          <Rise step={5}>
            <View style={styles.pair}>
              <View style={styles.half}>
                <StatCard label={copy.longestRun}>
                  <AnimatedNumber
                    value={season.longestScoringStreak}
                    progress={progress}
                    variant="statMd"
                  />
                  {/* ⚠ Names the club: this counts club MATCHES, not
                      appearances, so a benched match breaks it and a bare
                      number would sometimes read lower than every broadcaster's
                      and look like a bug. */}
                  <Text variant="micro" color="textDim">
                    {copy.streak(clubName)}
                  </Text>
                </StatCard>
              </View>
              <View style={styles.half}>
                <StatCard label={copy.superSub}>
                  <AnimatedNumber
                    value={season.superSubGoals}
                    progress={progress}
                    variant="statMd"
                  />
                  <Text variant="micro" color="textDim">
                    {copy.superSubNote}
                  </Text>
                </StatCard>
              </View>
            </View>
          </Rise>

          {/* 6 · Discipline, and the quickest booking beside it. */}
          <Rise step={6}>
            <StatCard label={copy.discipline}>
              <View style={styles.disciplineRow}>
                <View style={styles.disciplineLeft}>
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
                    <AnimatedNumber value={season.reds} progress={progress} variant="statMd" />
                  </View>
                </View>
                {season.quickestBooking?.minute !== undefined ? (
                  <View style={styles.booking}>
                    <Text variant="eyebrowSm" color="textFaint">
                      {copy.quickestBooking}
                    </Text>
                    <Text variant="statMd" color="text" tabular>
                      {copy.minute(season.quickestBooking.minute)}
                    </Text>
                    <Text variant="micro" color="textDim" numberOfLines={1}>
                      {[
                        season.quickestBooking.opponent
                          ? copy.versus(season.quickestBooking.opponent.name)
                          : null,
                        season.quickestBooking.matchweek !== null
                          ? `MD${season.quickestBooking.matchweek}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                ) : null}
              </View>
            </StatCard>
          </Rise>
        </>
      )}

      <Rise step={7}>
        <Text variant="micro" color="textFaint" style={styles.footnote}>
          {copy.playerFootnote}
        </Text>
      </Rise>
    </>
  );
}

/**
 * The hat-trick tile's note — the fixture it happened in, when we hold one.
 *
 * ⚠ `hatTrickFixtures` is `null` below the coverage floor and `[]` when there
 * genuinely were none, and this tile is only reachable when coverage is
 * sufficient — so an empty list here means "none", which is what an empty note
 * says.
 */
function hatTrickNote(season: PlayerSeasonStatsView, copy: Copy['stats']): string {
  const first = season.hatTrickFixtures?.[0];
  if (!first) return '';
  return [
    first.opponent ? copy.versus(first.opponent.name) : null,
    first.matchweek !== null ? `MD${first.matchweek}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function Figure({
  value,
  label,
  color = 'text',
  progress,
  divider = false,
}: {
  value: number;
  label: string;
  color?: 'text' | 'accent';
  progress: SharedValue<number>;
  divider?: boolean;
}) {
  return (
    <View style={[styles.figure, divider && styles.figureDivider]}>
      <AnimatedNumber value={value} progress={progress} variant="statLg" color={color} />
      <Text variant="xiRailBadge" color="textDim">
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text variant="micro" color="text" style={styles.legendLabel}>
        {label}
      </Text>
      <Text variant="micro" color="text" tabular>
        {`${value}`}
      </Text>
    </View>
  );
}

/**
 * ⚠ A chip, not a `Button`: the accent button is one per screen and this screen
 * spends that on the segmented control's lime thumb.
 *
 * ⚠ 30pt tall, so it carries `hitSlop` to reach the 44pt minimum — the trade
 * `EventTabs` and the hero's back pill both make.
 */
function ChangeChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 7, bottom: 7, left: 8, right: 8 }}
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
      <Text variant="eyebrowSm" color="accent">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: { padding: Spacing.four, gap: Spacing.four, position: 'relative' },
  // ⚠ An opaque-over-tinted fill rather than a `WashGradient`: this tray
  // changes height when the player changes, and a gradient that does not
  // repaint on growth is trap 65. A flat tint cannot go stale.
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.16,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  names: { flex: 1, minWidth: 0, gap: Spacing.half },
  chip: {
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.seg,
    backgroundColor: Colors.dark.accentWash,
  },
  chipPressed: { opacity: 0.7 },
  triple: { flexDirection: 'row' },
  figure: { flex: 1, gap: Spacing.half, paddingHorizontal: Spacing.two },
  figureDivider: { borderLeftWidth: 1, borderLeftColor: Colors.dark.trayLine },
  penRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  ringCentre: { alignItems: 'center' },
  penLegend: { flex: 1, gap: Spacing.two },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  legendLabel: { flex: 1 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  conversion: { gap: Spacing.one, marginTop: Spacing.one },
  conversionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  stoppage: { alignItems: 'flex-end' },
  runHead: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.three },
  runLabel: { flex: 1 },
  halves: { gap: Spacing.one },
  halfHead: { flexDirection: 'row', justifyContent: 'space-between' },
  halfBar: { flexDirection: 'row', height: 8, gap: 2 },
  halfFill: { height: '100%', borderRadius: Radius.rail },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  disciplineRow: { flexDirection: 'row', gap: Spacing.four },
  disciplineLeft: { flex: 1, gap: Spacing.two },
  cards: { flexDirection: 'row', gap: Spacing.two },
  cardGlyph: { width: 13, height: 18, borderRadius: 3 },
  yellow: { backgroundColor: Colors.dark.cardYellow },
  red: { backgroundColor: Colors.dark.cardRed },
  cardCounts: { flexDirection: 'row', gap: Spacing.four },
  booking: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: Colors.dark.trayLine,
    paddingLeft: Spacing.three,
    gap: Spacing.half,
  },
  footnote: { fontWeight: '400', maxWidth: Size.footnoteWidth },
});
