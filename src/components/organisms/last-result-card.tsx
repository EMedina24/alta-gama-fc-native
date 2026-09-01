/**
 * LAST RESULT — the most recent finished match of a followed club, and the
 * first card of the Today BODY (ADR 0095: NEXT UP left for the crown, so this
 * organism is no longer a stack of two).
 *
 * ⚠ Fed from `/cronogol/fixtures`, not the scoreboard — the scoreboard cannot
 * say which match is yours (ADR 0027).
 *
 * ⚠⚠ **It expands into its timeline** (ADR 0050), and it can open on nothing:
 * `/cronogol/fixtures/{id}/events` serves `count: 0` for any match the
 * 3-hourly, finished-only sweep has not reached. The panel says "aren't
 * published yet", which is true in both worlds and must never be tidied into
 * "no goals" (ADR 0045).
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Pill, Text } from '@/components/atoms';
import { EventsDisclosure, ScoreLine, type ScoreSide } from '@/components/molecules';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { TeamRef } from '@/lib/cronogol/types';
import type { Copy } from '@/lib/i18n/copy';
import { MatchEvents } from './match-events';

export interface LastResultCardProps {
  /**
   * ⚠ The fixture's own id and its two `TeamRef`s, for the events panel.
   * `home`/`away` are `ScoreSide` — a name, a crest and a monogram — which is
   * everything the SCORE line needs and nothing the panel does: it derives
   * each event's side by comparing `teamSlug`, and a `ScoreSide` has none.
   */
  id: string;
  homeTeam: TeamRef | null;
  awayTeam: TeamRef | null;
  home: ScoreSide;
  away: ScoreSide;
  /** "MD 3 · SAT 29 AUG" */
  meta: string;
  /** Already mapped through `phrases.formLetters` — never a raw `W`/`D`/`L`. */
  outcome: string | null;
  copy: { lastResult: string; noScore: string };
  events: Copy['events'];
}

export function LastResultCard({
  id,
  homeTeam,
  awayTeam,
  home,
  away,
  meta,
  outcome,
  copy,
  events,
}: LastResultCardProps) {
  const [showEvents, setShowEvents] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.pad}>
        <View style={styles.headRow}>
          <Text variant="eyebrowSm" color="textFaint">
            {copy.lastResult} · {meta}
          </Text>
          {outcome ? <Pill label={outcome} /> : null}
        </View>
        <ScoreLine home={home} away={away} noScoreLabel={copy.noScore} />
      </View>

      <EventsDisclosure
        open={showEvents}
        onToggle={() => setShowEvents((open) => !open)}
        copy={events}
      />

      {showEvents ? (
        <MatchEvents
          fixtureId={id}
          home={homeTeam}
          away={awayTeam}
          copy={events}
          // ⚠ The footer row above already reads `MATCH EVENTS`. Left on, the
          // panel printed its own eyebrow directly beneath it — the same words
          // twice, one line apart.
          showTitle={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Glass over the mesh (ADR 0087), and FLUSH: the events panel must run edge
   * to edge inside the rounded corners, so the padding lives on `pad`.
   *
   * ⚠ `overflow: 'hidden'` is load-bearing. Without it the panel's ground
   * squares off the two bottom corners the card just rounded, which reads as a
   * rendering fault rather than a style choice.
   */
  card: {
    backgroundColor: Colors.dark.glassFill,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.dark.glassLine,
    overflow: 'hidden',
  },
  pad: { padding: Spacing.four, gap: Spacing.three },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
