/**
 * The molecule gallery — every state, side by side, on fabricated data.
 *
 * The point is the states that production rarely shows: `--:--`, a null score, a
 * cancelled fixture, an empty form strip, a scoreboard row with no `lastUpdateAt`.
 * Those are exactly the ones that ship broken, because nobody sees them until a
 * Tuesday in October.
 */
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, ChipButton, Hairline, Switch, Text } from '@/components/atoms';
import {
  Countdown,
  FeedAge,
  FixtureTiming,
  FormStrip,
  HomeAwayTag,
  ListRow,
  ScoreLine,
  SectionHeader,
  StatRow,
} from '@/components/molecules';
import { Colors, Spacing } from '@/constants/theme';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useState } from 'react';

const ZONE = 'Europe/Madrid';
const SOON = new Date(Date.now() + 1000 * 60 * 60 * 28).toISOString();

function Case({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.case}>
      <Text variant="eyebrowSm" color="textFaint">
        {label}
      </Text>
      <View style={styles.body}>{children}</View>
      <Hairline />
    </View>
  );
}

export default function GalleryScreen() {
  const { phrases } = useI18n();
  const [on, setOn] = useState(true);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="title">Molecules</Text>

      <SectionHeader title="Score line" meta="3 states" />
      <Case label="played · away side muted">
        <ScoreLine
          home={{ name: 'Athletic', abbr: 'ATH', goals: 1, crest: null }}
          away={{ name: 'Getafe', abbr: 'GET', goals: 0, crest: null, muted: true }}
          noScoreLabel="No score yet"
        />
      </Case>
      <Case label="null score → en dash, NEVER 0–0">
        <ScoreLine
          home={{ name: 'Valencia', abbr: 'VAL', goals: null, crest: null }}
          away={{ name: 'Real Madrid', abbr: 'RMA', goals: null, crest: null }}
          noScoreLabel="No score yet"
        />
      </Case>
      <Case label="draw · both full strength">
        <ScoreLine
          size="row"
          home={{ name: 'Osasuna', abbr: 'OSA', goals: 1, crest: null }}
          away={{ name: 'Espanyol', abbr: 'ESP', goals: 1, crest: null }}
          noScoreLabel="No score yet"
        />
      </Case>

      <SectionHeader title="Fixture timing" meta="4 branches" />
      <View style={styles.rowOfCells}>
        {[
          { k: 'finished', p: { status: 'finished' as const, goalsHome: 2, goalsAway: 0, kickoffTbd: false, caption: 'FT' } },
          { k: 'scheduled', p: { status: 'scheduled' as const, goalsHome: null, goalsAway: null, kickoffTbd: false, caption: null } },
          { k: 'TBD --:--', p: { status: 'scheduled' as const, goalsHome: null, goalsAway: null, kickoffTbd: true, caption: null } },
          { k: 'cancelled', p: { status: 'cancelled' as const, goalsHome: null, goalsAway: null, kickoffTbd: false, caption: null } },
        ].map(({ k, p }) => (
          <View key={k} style={styles.cell}>
            <Text variant="eyebrowSm" color="textFaint">{k}</Text>
            <FixtureTiming
              kickoffUtc="2026-09-06T19:00:00Z"
              zone={ZONE}
              clock="24"
              tbdLabel={phrases.kickoffTbd}
              {...p}
            />
          </View>
        ))}
      </View>
      <Case label="live → falls through to the kickoff. No LIVE caption, by design.">
        <FixtureTiming
          kickoffUtc="2026-09-06T19:00:00Z"
          kickoffTbd={false}
          status="live"
          goalsHome={1}
          goalsAway={0}
          zone={ZONE}
          clock="24"
          tbdLabel={phrases.kickoffTbd}
        />
      </Case>

      <SectionHeader title="Form strip" meta="reversed to oldest-first" />
      <Case label="wire ['W','W','L','D'] → renders D L W W">
        <FormStrip form={['W', 'W', 'L', 'D']} letters={phrases.formLetters} />
      </Case>
      <Case label="empty → renders nothing (normal pre-season)">
        <FormStrip form={[]} letters={phrases.formLetters} />
      </Case>

      <SectionHeader title="Stat row" />
      <Case label="expanded standings row">
        <StatRow
          row={{ won: 3, drawn: 0, lost: 1, goalsFor: 7, goalsAgainst: 3, goalDifference: 4 }}
          labels={['W', 'D', 'L', 'GF', 'GA', 'GD']}
        />
      </Case>

      <SectionHeader title="Countdown · feed age" />
      <Case label="ticks per minute, never per second">
        <Countdown kickoffUtc={SOON} />
      </Case>
      <Case label="score age — required wherever a score appears">
        <FeedAge
          lastUpdateAt={new Date(Date.now() - 2 * 3600_000).toISOString()}
          render={(h) =>
            h === null
              ? 'Score age unknown · updates roughly every 4h'
              : `Score last checked ${h}h ago · updates roughly every 4h`
          }
        />
      </Case>
      <Case label="null lastUpdateAt">
        <FeedAge lastUpdateAt={null} render={(h) => (h === null ? 'Score age unknown' : `${h}h`)} />
      </Case>

      <SectionHeader title="Home/away · list row" />
      <Case label="venue with no city (LaLiga: city is always null)">
        <HomeAwayTag tag={phrases.home} venue="San Mamés" city={null} />
      </Case>
      <Case label="venue and city (Serie A only)">
        <HomeAwayTag tag={phrases.away} venue="Giuseppe Meazza" city="Milano" />
      </Case>
      <Case label="list row · active + trailing switch">
        <ListRow
          title="FC Barcelona"
          subtitle={`LaLiga · ${phrases.matches(38)}`}
          abbr="BAR"
          active
          trailing={<Switch value={on} onValueChange={setOn} />}
        />
      </Case>
      <Case label="list row · follow chip">
        <ListRow
          title="Real Madrid"
          subtitle="Madrid"
          abbr="RMA"
          trailing={<ChipButton label="+ FOLLOW" onPress={() => {}} />}
        />
      </Case>

      <SectionHeader title="Buttons" />
      <View style={styles.buttons}>
        <Button label="Confirm and subscribe" onPress={() => {}} />
        <Button label="Calendar" tone="secondary" onPress={() => {}} />
        <Button label="Turn off alerts on this device" tone="danger" onPress={() => {}} />
        <Button label="Disabled" onPress={() => {}} disabled />
      </View>

      <SectionHeader title="Disabled switch" meta="always with its reason" />
      <Case label="Goals & final score — needs a live feed">
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" color="textDim">Goals &amp; final score</Text>
            <Text variant="footnote" color="textFaint">Needs a live feed — not yet available</Text>
          </View>
          <Switch value={false} onValueChange={() => {}} disabled />
        </View>
      </Case>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.five, paddingTop: Spacing.eight * 2, gap: Spacing.four },
  case: { gap: Spacing.two },
  body: { paddingVertical: Spacing.two },
  rowOfCells: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  cell: { gap: Spacing.one },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  buttons: { gap: Spacing.two },
});
