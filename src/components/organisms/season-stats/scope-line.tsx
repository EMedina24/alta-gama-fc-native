/**
 * The two scope markers Season stats needs once the figures merge and the charts
 * do not (ADR 0149).
 *
 * ⚠⚠ **This file is ADR 0148's `ElsewhereLine`, inverted.** 0148 put a line
 * under the FIGURES naming what they left out, because the screen read one
 * competition's block and Valverde showed `0 GOALS` two days after scoring in
 * the Champions League. `seasonTotals` closed that: the figures now count every
 * competition, so they leave nothing to name and that line is gone.
 *
 * What did NOT merge is the CHARTS — matchweek numbers are per-competition
 * namespaces, and every merged event-derived field is refused while any one
 * contributing competition sits below the coverage floor. So the same failure is
 * now available pointing the other way: **a league-only chart sitting under an
 * all-competitions headline, with nothing saying so.** That is the error 0148 was
 * written about, and these two markers are what stop it.
 *
 * - `AllCompetitions` goes on the FIGURES. Without it the eyebrow four rows up
 *   (`LALIGA · 2026/27`) actively misdescribes the numbers below it.
 * - `ScopeOnly` goes under a chart that is still one competition's.
 *
 * ⚠ Both keep 0148's rules that still apply: directly under the thing they
 * qualify and never in a footnote, and a competition with no display name
 * renders NO NAME rather than a raw `champions-league` slug — the same call
 * `competition-mark` makes for artwork it does not hold.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms';
import { Spacing } from '@/constants/theme';
import type { Copy } from '@/lib/i18n/copy';

export interface AllCompetitionsProps {
  /**
   * Every competition the figures count — `TeamSeasonTotalsView.competitions`.
   *
   * ⚠ API slugs. ⚠ A block of length 1 renders NOTHING: a single-competition
   * merged block IS that competition's block (Bayern's is its Bundesliga block),
   * and "all competitions" over one competition is noise the eyebrow already
   * covers.
   */
  competitions: readonly string[];
  copy: Copy['stats'];
}

export function AllCompetitions({ competitions, copy }: AllCompetitionsProps) {
  if (competitions.length < 2) return null;

  /**
   * ⚠ All-or-nothing on the NAMES, not per-name: dropping one unnameable slug
   * from the list would print a shorter list that reads as complete — "All
   * competitions: LaLiga" under a figure counting two. The list is either every
   * competition named or no list at all.
   */
  const named = competitions.map((slug) => copy.competitionNames[slug]);
  const list = named.every(Boolean) ? named.join(', ') : null;

  return (
    <Text variant="micro" color="textDim">
      {copy.allCompetitions(list)}
    </Text>
  );
}

export interface ScopeOnlyProps {
  /**
   * How to name the competition the chart above IS — `League.name` (`LaLiga`).
   *
   * ⚠ The league's own name, not `copy.competitionNames`: the shown competition
   * is always one this app tracks, so it has a `League` and does not need the
   * slug map.
   */
  competitionName: string;
  /**
   * The competitions the FIGURES count and this chart does not —
   * `chartsExclude(totals, league)`.
   *
   * ⚠⚠ **Empty means render nothing, and that is the common case.** Outside
   * Europe the merged block holds one competition, so no chart is narrower than
   * the figures and there is nothing to disclaim. A scope line drawn there would
   * be a caveat about a discrepancy that does not exist.
   */
  excluded: readonly string[];
  copy: Copy['stats'];
}

export function ScopeOnly({ competitionName, excluded, copy }: ScopeOnlyProps) {
  if (excluded.length === 0 || !competitionName) return null;

  return (
    <View style={styles.wrap}>
      <Text variant="micro" color="textFaint">
        {copy.scopeOnly(competitionName)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: Spacing.one },
});
