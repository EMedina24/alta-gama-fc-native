/**
 * The molecule gallery — every state, side by side, on fabricated data.
 *
 * The point is the states that production rarely shows: `--:--`, a null score, a
 * cancelled fixture, an empty form strip, a scoreboard row with no `lastUpdateAt`.
 * Those are exactly the ones that ship broken, because nobody sees them until a
 * Tuesday in October.
 */
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, ChipButton, Hairline, Score, Switch, Text } from '@/components/atoms';
import {
  Countdown,
  EventRow,
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
import { detailLine, eventKind, eventSide, minuteLabel } from '@/lib/cronogol/events';
import type { MatchEventView, TeamRef } from '@/lib/cronogol/types';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useState } from 'react';

const ZONE = 'Europe/Madrid';
const SOON = new Date(Date.now() + 1000 * 60 * 60 * 28).toISOString();

/**
 * A fabricated timeline covering every branch of `lib/cronogol/events.ts` —
 * including the ones production shows about once a month.
 *
 * ⚠ This case is also the **native-module check for `react-native-svg`**
 * (ADR 0045). The package autolinks from `package.json`, but a dev client built
 * before it was declared throws here rather than degrading. If this screen
 * crashes, the fix is a new dev build, not a code change.
 *
 * ⚠ It renders `EventRow` through the real mappers rather than `MatchEvents`,
 * which would fire a network request off a fake fixture id.
 */
const EV_HOME: TeamRef = {
  slug: 'arsenal', name: 'Arsenal', shortName: 'ARS', logoUrl: null, logoUrls: null,
};
const EV_AWAY: TeamRef = {
  slug: 'brighton', name: 'Brighton', shortName: 'BHA', logoUrl: null, logoUrls: null,
};

const person = (name: string) => ({ name, slug: null });

const EVENTS: MatchEventView[] = [
  { id: 'e1', type: 'goal', subtype: 'normal', minute: 9, minuteExtra: null, period: 'FirstHalf',
    teamSlug: 'arsenal', player: person('Bukayo Saka'), related: person('Martin Ødegaard') },
  // ⚠ Unassisted — a third of goals are, and `related: null` is not missing data.
  { id: 'e2', type: 'goal', subtype: 'normal', minute: 22, minuteExtra: null, period: 'FirstHalf',
    teamSlug: 'brighton', player: person('João Pedro'), related: null },
  { id: 'e3', type: 'goal', subtype: 'penalty', minute: 31, minuteExtra: null, period: 'FirstHalf',
    teamSlug: 'arsenal', player: person('Kai Havertz'), related: null },
  { id: 'e4', type: 'goal', subtype: 'own', minute: 38, minuteExtra: null, period: 'FirstHalf',
    teamSlug: 'brighton', player: person('Lewis Dunk'), related: null },
  // ⚠ Serie A's shape: 45+2, NEVER rendered as 47.
  { id: 'e5', type: 'card', subtype: 'yellow', minute: 45, minuteExtra: 2, period: 'FirstHalf',
    teamSlug: 'brighton', player: person('Joël Veltman'), related: null },
  { id: 'e6', type: 'card', subtype: 'second-yellow', minute: 62, minuteExtra: null,
    period: 'SecondHalf', teamSlug: 'brighton', player: person('Jan Paul van Hecke'), related: null },
  // ⚠ Premier League substitutions carry a null subtype. No caption is derived from it.
  { id: 'e7', type: 'substitution', subtype: null, minute: 66, minuteExtra: null,
    period: 'SecondHalf', teamSlug: 'arsenal', player: person('Leandro Trossard'),
    related: person('Gabriel Martinelli') },
  // ⚠ A VAR decision can belong to NEITHER club — null `teamSlug`, blank crest column.
  { id: 'e8', type: 'var', subtype: 'goal-not-awarded', minute: 73, minuteExtra: null,
    period: 'SecondHalf', teamSlug: null, player: person('Kai Havertz'), related: null },
  { id: 'e9', type: 'missed-penalty', subtype: 'saved', minute: 81, minuteExtra: null,
    period: 'SecondHalf', teamSlug: 'brighton', player: person('Danny Welbeck'), related: null },
  // ⚠ An OPEN subtype the copy map has never heard of → the bare mark, no detail
  // line, and certainly not the raw slug.
  { id: 'e10', type: 'var', subtype: 'offside-overturned-on-review', minute: 86,
    minuteExtra: null, period: 'SecondHalf', teamSlug: 'arsenal', player: person('Gabriel Jesus'),
    related: null },
  // ⚠⚠ The row that must never be dropped, and the one with no minute.
  { id: 'e11', type: 'unknown', subtype: 'something-new', minute: null, minuteExtra: null,
    period: null, teamSlug: 'arsenal', player: person('Declan Rice'), related: null },
];

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
  const { copy, phrases } = useI18n();
  const [on, setOn] = useState(true);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="title">Molecules</Text>

      <SectionHeader title="Score" meta="3 sizes × 3 states (ADR 0044)" />
      {([
        { size: 'board' as const, chip: false, label: 'board · bare — the Today hero' },
        { size: 'rowLg' as const, chip: true, label: 'rowLg · chip — the jornada column' },
        { size: 'row' as const, chip: true, label: 'row · chip — a list line' },
      ]).map(({ size, chip, label }) => (
        <Case key={size} label={label}>
          <View style={styles.rowOfCells}>
            <Score home={1} away={0} size={size} chip={chip} noScoreLabel={copy.today.noScore} />
            <Score home={1} away={1} size={size} chip={chip} noScoreLabel={copy.today.noScore} />
            <Score home={0} away={2} size={size} chip={chip} noScoreLabel={copy.today.noScore} />
            <Score home={null} away={null} size={size} chip={chip} noScoreLabel={copy.today.noScore} />
          </View>
        </Case>
      ))}
      <Case label="win · draw · loss · null — the losing DIGIT dims, a draw does not.">
        <View style={styles.rowOfCells}>
          <Score home={10} away={0} size="rowLg" chip noScoreLabel={copy.today.noScore} />
          <Score home={1} away={0} size="rowLg" noScoreLabel={copy.today.noScore} />
        </View>
      </Case>

      <SectionHeader title="Score line" meta="3 states" />
      <Case label="played · away side muted">
        <ScoreLine
          home={{ name: 'Athletic', abbr: 'ATH', goals: 1, crest: null }}
          away={{ name: 'Getafe', abbr: 'GET', goals: 0, crest: null, muted: true }}
          noScoreLabel="No score yet"
        />
      </Case>
      <Case label="null score → – │ –, NEVER 0 │ 0">
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
      <Case label="live → the score under IN PLAY in `live`. Never the word LIVE (ADR 0035).">
        <FixtureTiming
          kickoffUtc="2026-09-06T19:00:00Z"
          kickoffTbd={false}
          status="live"
          goalsHome={1}
          goalsAway={0}
          zone={ZONE}
          clock="24"
          tbdLabel={phrases.kickoffTbd}
          caption={copy.matchdays.inProgress}
          captionTone="live"
        />
      </Case>
      <Case label="live with no goals yet → still falls through to the kickoff.">
        <FixtureTiming
          kickoffUtc="2026-09-06T19:00:00Z"
          kickoffTbd={false}
          status="live"
          goalsHome={null}
          goalsAway={null}
          zone={ZONE}
          clock="24"
          tbdLabel={phrases.kickoffTbd}
          caption={copy.matchdays.inProgress}
          captionTone="live"
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
      <Case label="ticks per second, paused while backgrounded">
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
      <SectionHeader title="Match events" meta="every glyph · every null" />
      <Case label="the expanded panel's timeline, on fabricated data">
        <View style={styles.eventPanel}>
          {EVENTS.map((event) => {
            const side = eventSide(event, EV_HOME, EV_AWAY);
            const team = side === 'home' ? EV_HOME : side === 'away' ? EV_AWAY : null;
            return (
              <EventRow
                key={event.id}
                minute={minuteLabel(event)}
                kind={eventKind(event)}
                name={event.player.name}
                detail={detailLine(event, copy.events)}
                crest={null}
                abbr={team?.shortName ?? null}
              />
            );
          })}
        </View>
      </Case>
      <Case label="nothing stored yet — ⚠ NOT the same as a goalless match">
        <View style={styles.eventPanel}>
          <Text variant="micro" color="textMuted">
            {copy.events.notPublished}
          </Text>
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
  eventPanel: {
    backgroundColor: Colors.dark.sunken,
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
