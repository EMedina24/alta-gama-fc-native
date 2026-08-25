/**
 * Phase 1 gate. Dev-only — never linked from the app.
 *
 * ⚠ The leading underscore does NOT keep this out of the production route tree:
 * expo-router only treats `_layout` specially, and `.expo/types/router.d.ts`
 * lists `/_debug` as a real, navigable href. So the guard below is what stops a
 * release build serving an internal diagnostics screen at a guessable URL —
 * removing it ships one.
 *
 * Proves three things at once: the ported client reaches production and parses,
 * the derivations run on Hermes, and `Intl.formatToParts` honours a named IANA
 * zone across a DST boundary (the single assumption the whole date layer rests
 * on — see `lib/format.ts`).
 */
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Crest, FormChip, Pill, Skeleton, Text as T } from '@/components/atoms';
import { Colors, Size, Spacing, Type } from '@/constants/theme';
import {
  getFixtureWindow,
  getJornada,
  getScores,
  getSeasonJornadas,
  getStandings,
  getTeams,
} from '@/lib/cronogol/client';
import { abbreviate, crestSrc, sortClubs } from '@/lib/cronogol/derive';
import { DEFAULT_LEAGUE, SEASON, roundCount } from '@/lib/cronogol/leagues';
import { bandsApply, completedMatchweek, signedGoalDifference } from '@/lib/cronogol/standings';
import { formatKickoffTime, zonedDayKey } from '@/lib/format';
import { es } from '@/lib/i18n/phrases';

type Line = { label: string; value: string; ok: boolean };
type Club = { name: string; logo: string | null; abbr: string };

/**
 * Madrid is CEST (UTC+2) in August and CET (UTC+1) in January. If Hermes ignored
 * the `timeZone` these two would agree, and both would read as UTC.
 */
function intlSpike(): Line[] {
  const summer = '2026-08-15T19:00:00Z';
  const winter = '2026-01-15T19:00:00Z';
  const sHour = formatKickoffTime(summer, 'Europe/Madrid');
  const wHour = formatKickoffTime(winter, 'Europe/Madrid');
  const tokyo = zonedDayKey('2026-08-15T19:00:00Z', 'Asia/Tokyo'); // next calendar day
  return [
    { label: 'Madrid Aug (want 21:00)', value: sHour, ok: sHour === '21:00' },
    { label: 'Madrid Jan (want 20:00)', value: wHour, ok: wHour === '20:00' },
    { label: 'DST shift observed', value: `${sHour} vs ${wHour}`, ok: sHour !== wHour },
    { label: '12h form (want 9:00 pm)', value: formatKickoffTime(summer, 'Europe/Madrid', '12'), ok: formatKickoffTime(summer, 'Europe/Madrid', '12') === '9:00 pm' },
    { label: 'Tokyo dayKey (want 08-16)', value: tokyo, ok: tokyo === '2026-08-16' },
  ];
}

export default function DebugRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DebugScreen />;
}

function DebugScreen() {
  const [lines, setLines] = useState<Line[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const league = DEFAULT_LEAGUE;
        const now = new Date();
        const from = new Date(now.getTime() - 36 * 3600_000).toISOString();

        const [teams, standings, index, scores, window] = await Promise.all([
          getTeams({ league: league.apiSlug }),
          getStandings(),
          getSeasonJornadas(league.apiSlug, SEASON),
          getScores({ days: 2 }),
          getFixtureWindow({ from, to: now.toISOString() }),
        ]);

        const table = standings.tables.find((t) => t.league.slug === league.apiSlug);
        const sorted = sortClubs(teams);
        const first = sorted[0];
        const mw = index.matchweeks.length
          ? await getJornada(league.apiSlug, SEASON, index.matchweeks[0].matchweek)
          : null;

        setClubs(
          sorted.slice(0, 4).map((t) => ({
            name: t.name,
            logo: crestSrc(t.logoUrls, t.logoUrl, 'small'),
            abbr: abbreviate(t.name, t.slug, t.shortName),
          })),
        );

        setLines([
          ...intlSpike(),
          { label: '— API —', value: '', ok: true },
          { label: 'teams (laliga)', value: String(teams.length), ok: teams.length > 0 },
          { label: 'sortClubs first', value: first ? `${first.name} → ${abbreviate(first.name, first.slug, first.shortName)}` : '—', ok: !!first },
          { label: 'crestSrc resolves', value: first ? String(!!crestSrc(first.logoUrls, first.logoUrl, 'small')) : '—', ok: !!first && !!crestSrc(first.logoUrls, first.logoUrl, 'small') },
          { label: 'standings tables', value: String(standings.tables.length), ok: standings.tables.length > 0 },
          { label: 'table clubs / league clubCount', value: table ? `${table.clubs} / ${league.clubCount}` : '—', ok: !!table },
          { label: 'bandsApply', value: table ? String(bandsApply(table, league)) : '—', ok: !!table },
          { label: 'form newest-first sample', value: table?.rows[0]?.form.join('') || '(empty is normal)', ok: true },
          { label: 'GD signed', value: table ? signedGoalDifference(table.rows[0]?.goalDifference ?? 0) : '—', ok: !!table },
          { label: 'completedMatchweek / roundCount', value: table ? `${completedMatchweek(index.matchweeks, table.lastMatchUtc)} / ${roundCount(league)}` : '—', ok: !!table },
          { label: 'totalMatchweeks (never 38 hardcoded)', value: String(index.totalMatchweeks), ok: !!index.totalMatchweeks },
          { label: 'jornada 1 fixtures', value: mw ? `${mw.fixtures.length} (confirmed: ${mw.kickoffsConfirmed})` : '—', ok: !!mw },
          { label: 'scores?days=2 events', value: String(scores.count), ok: true },
          { label: 'fixtures window (FINISHED TODAY src)', value: `${window.count} · leagues ${window.leagues.length}`, ok: true },
        ]);
      } catch (e) {
        setError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
      }
    })();
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Phase 1 gate</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {lines.map((l) => (
        <View key={l.label} style={styles.row}>
          <Text style={[styles.label, l.ok ? null : styles.bad]}>{l.ok ? '✓' : '✗'} {l.label}</Text>
          <Text style={styles.value}>{l.value}</Text>
        </View>
      ))}
      {!lines.length && !error && (
        <View style={{ gap: Spacing.two }}>
          <Skeleton height={18} />
          <Skeleton height={18} width="70%" />
        </View>
      )}

      {clubs.length > 0 && (
        <View style={styles.atoms}>
          <Text style={styles.label}>atoms — real crest, then forced monogram</Text>
          <View style={styles.crests}>
            {clubs.map((c) => (
              <Crest key={c.name} src={c.logo} fallback={c.abbr} size={Size.crestCard} />
            ))}
            {clubs.map((c) => (
              <Crest key={`m-${c.name}`} src={null} fallback={c.abbr} size={Size.crestCard} filled />
            ))}
          </View>
          <View style={styles.crests}>
            <FormChip result="W" letter="W" />
            <FormChip result="D" letter="D" />
            <FormChip result="L" letter="L" />
            <Pill label="LIVE" tone="live" />
            <Pill label="FOLLOWING" tone="accent" />
            <T variant="numeral" tabular>0123456789</T>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.five, paddingTop: Spacing.eight * 2, gap: Spacing.two },
  title: { ...Type.title, color: Colors.dark.text, marginBottom: Spacing.four },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  label: { ...Type.footnote, color: Colors.dark.textSecondary, flexShrink: 1 },
  bad: { color: Colors.dark.live },
  value: { ...Type.footnote, color: Colors.dark.accent, fontVariant: ['tabular-nums'] },
  error: { ...Type.footnote, color: Colors.dark.live, marginBottom: Spacing.four },
  atoms: { marginTop: Spacing.five, gap: Spacing.three },
  crests: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', flexWrap: 'wrap' },
});
