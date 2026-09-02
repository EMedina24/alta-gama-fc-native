/**
 * Dev tool: what the widgets can actually see.
 *
 * ⚠ Dev-only (the `_debug` layout redirects in release). Reach it at
 * `/_debug/widgets` — `_debug/index.tsx` is the Phase 1 gate, not a menu.
 *
 * ⚠⚠ **This is the whole point of the screen: the widget contract is a FILE in
 * another process's container, and nothing else in the app can show you whether
 * it landed.** Everything a widget draws is below — the snapshot exactly as
 * written, and whether the crest PNGs it will look for are on disk. If the
 * container row says `null`, stop: the App Group is not provisioned on this
 * build and no amount of Swift debugging will help.
 */
import { Directory, File } from 'expo-file-system';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { APP_GROUP, groupContainer } from '@/features/app-group';
import { WIDGETS_AVAILABLE, reloadWidgets } from '@/features/push/capability';
import {
  LIVE_NAME,
  LIVE_VERSION,
  type WidgetLiveState,
} from '@/features/widgets/live';
import {
  SNAPSHOT_DIR,
  SNAPSHOT_VERSION,
  buildSnapshot,
  snapshotFile,
  writeGroupJson,
  writeSnapshot,
  type WidgetSnapshot,
} from '@/features/widgets/snapshot';
import { applyWidgetSnapshot, forgetWidgetSnapshot } from '@/features/widgets/sync';
import { newsImageExists } from '@/features/news/images';
import { newsSnapshotFile, type NewsSnapshot } from '@/features/news/snapshot';
import { applyNewsSnapshot, forgetNewsSnapshot } from '@/features/news/sync';
import { useNews } from '@/queries/use-news';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { WindowFixtureView } from '@/lib/cronogol/types';
import { formatWidgetKickoff, formatWidgetKickoffParts } from '@/lib/format';
import { COPY } from '@/lib/i18n/copy';
import { PHRASES, type Locale } from '@/lib/i18n/phrases';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useWidgetWindow } from '@/queries/use-today';
import { usePreferences, useZone } from '@/store/preferences';

export default function DebugWidgets() {
  const prefs = usePreferences();
  const zone = useZone();
  const { copy, locale, phrases } = useI18n();
  const widgetWindow = useWidgetWindow(zone);
  const news = useNews();

  /**
   * ⭐ ADR 0080 — `?sample=live` / `?sample=ft` writes a FABRICATED in-play
   * snapshot + `live.json` and reloads, on mount. The point is scriptability:
   * `xcrun simctl openurl booted "altagamafc://_debug/widgets?sample=live"`
   * puts the ledger on a placed widget with no tap anywhere (taps cannot be
   * scripted on the simulator; deep links can). ⚠ Fabricated data — the next
   * real foreground overwrites the snapshot, and the fake fixture ids draw
   * lettered crest tiles. That is fine: this is a preview, not a state.
   *
   * ⭐ ADR 0086 adds `?sample=week1|week2|week3|week3es` — the medium tile's
   * hero-alone, hero-plus-one and full layouts, in the reader's worst case.
   *
   * ⚠⚠ **These fabricate the WIRE, not the snapshot.** They build
   * `WindowFixtureView`s and run the real `buildSnapshot` over them, so every
   * derived field — `widgetName`, `abbreviate`, the day and time labels, the
   * pluralised club count — comes from the code that runs in production. Trap
   * 48 is exactly what happens when a sample types those by hand instead: the
   * `la-liga`/`laliga` gate passed review AND simulator verification because
   * the fabricated row agreed with the bug.
   */
  const { sample } = useLocalSearchParams<{ sample?: string }>();

  const [onDisk, setOnDisk] = useState<string>('…');
  const [liveOnDisk, setLiveOnDisk] = useState<string>('…');
  const [newsOnDisk, setNewsOnDisk] = useState<string>('…');
  const [newsImages, setNewsImages] = useState<string[]>([]);
  const [written, setWritten] = useState<string>('…');
  const [crests, setCrests] = useState<string[]>([]);
  const [status, setStatus] = useState('idle');

  const container = groupContainer();

  // The snapshot this device WOULD write right now — pure, so it renders even
  // with no container at all.
  const built: WidgetSnapshot | null = widgetWindow.data
    ? buildSnapshot(
        widgetWindow.data.fixtures,
        prefs.followed,
        new Date(),
        copy,
        (iso) => formatWidgetKickoff(iso, zone, prefs.clock, phrases),
        (iso) => formatWidgetKickoffParts(iso, zone, prefs.clock, phrases),
      )
    : null;

  /**
   * ⚠ Every `setState` here happens AFTER an await, and the read itself lives
   * outside the component. A `setState` called synchronously inside an effect is
   * a lint error in this repo (`react-hooks/set-state-in-effect`) because it can
   * cascade renders — and reading a file synchronously on the JS thread is worth
   * avoiding regardless.
   */
  const inspect = useCallback(async () => {
    const next = await readContainer();
    setOnDisk(next.summary);
    setWritten(next.written);
    setCrests(next.crests);
    setLiveOnDisk(await readLive());
    const nextNews = await readNews();
    setNewsOnDisk(nextNews.summary);
    setNewsImages(nextNews.images);
  }, []);

  // The `?sample=` auto-writer — see the param's docblock above.
  useEffect(() => {
    if (!sample) return;
    const week = WEEK_SAMPLES[sample];
    if (sample !== 'live' && sample !== 'ft' && !week) return;
    void (async () => {
      if (week) await writeWeekSample(week.count, week.lang);
      else await writeSample(sample as 'live' | 'ft');
      setStatus(`sample ${sample} written`);
      await inspect();
    })();
  }, [sample, inspect]);

  // ⚠ `react-hooks/set-state-in-effect` fires on any effect that reaches a
  // `setState`, however many awaits deep — and reading another process's
  // container on mount is exactly the "subscribe to an external system" case the
  // rule's own documentation allows. `_debug/push.tsx` has the same shape for
  // the same reason. Disabled here rather than left as a standing error, so the
  // next person running `expo lint` inherits one fewer.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void inspect();
  }, [inspect]);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text variant="title">Widgets</Text>

      <Row label="WIDGETS_AVAILABLE" value={String(WIDGETS_AVAILABLE)} />
      <Row label="app group" value={APP_GROUP} />
      {/* ⚠ The single most important row. `null` here means every other row is
          noise — see the file header. */}
      <Row label="container" value={container ? 'resolved' : 'null'} />
      <Row label="locale · zone · clock" value={`${locale} · ${zone} · ${prefs.clock}h`} />
      <Row label="followed clubs" value={String(prefs.followed.length)} />
      <Row
        label="window (21d)"
        value={
          widgetWindow.data
            ? `${widgetWindow.data.count} fixtures · ${widgetWindow.data.leagues.length} leagues`
            : widgetWindow.isLoading
              ? 'loading…'
              : 'error'
        }
      />
      <Row label="snapshot on disk" value={onDisk} />
      <Row label="written at" value={written} />
      <Row label="status" value={status} />

      <Text variant="eyebrowSm" color="textFaint">
        Crest files in the App Group (✗ is normal for Bundesliga and Serie A)
      </Text>
      <View style={styles.box}>
        <Text variant="micro" color="textSecondary" style={styles.mono}>
          {crests.length ? crests.join('\n') : '(none)'}
        </Text>
      </View>

      <Text variant="eyebrowSm" color="textFaint">
        Snapshot as it would be written now
      </Text>
      <View style={styles.box}>
        <Text variant="micro" color="textSecondary" style={styles.mono}>
          {built ? JSON.stringify(built, null, 1) : '(window not loaded)'}
        </Text>
      </View>

      <Button
        label="Write snapshot + reload widgets"
        tone="secondary"
        onPress={async () => {
          if (!built) return;
          setStatus('writing…');
          // ⚠ Force it: the real path skips an unchanged snapshot, which is
          // exactly what you do NOT want from a button labelled "write".
          forgetWidgetSnapshot();
          await applyWidgetSnapshot(built);
          setStatus('written');
          await inspect();
        }}
      />
      <Button
        label="Reload widgets only"
        tone="quiet"
        onPress={async () => {
          await reloadWidgets();
          setStatus('reload requested');
        }}
      />

      <Text variant="title">Live (ADR 0080)</Text>
      {/* ⚠ Read back from DISK — three processes write this file, and the whole
          question is what the widget will actually see. */}
      <Row label="live.json on disk" value={liveOnDisk} />
      <Button
        label="Write LIVE sample + reload"
        tone="secondary"
        onPress={async () => {
          await writeSample('live');
          setStatus('sample live written');
          await inspect();
        }}
      />
      <Button
        label="Write FT sample + reload"
        tone="secondary"
        onPress={async () => {
          await writeSample('ft');
          setStatus('sample ft written');
          await inspect();
        }}
      />
      <Button
        label="Clear live.json + reload"
        tone="quiet"
        onPress={async () => {
          clearLive();
          await reloadWidgets();
          setStatus('live.json cleared');
          await inspect();
        }}
      />

      {/*
        ⭐ ADR 0086 — the medium tile at each row count, worst-case names. The
        deep links (`?sample=week1` …) are the scriptable path; these are here so
        the same states are reachable by hand while iterating on the layout.
      */}
      {(Object.keys(WEEK_SAMPLES) as (keyof typeof WEEK_SAMPLES)[]).map((key) => (
        <Button
          key={key}
          label={`Write ${key} sample + reload`}
          tone="quiet"
          onPress={async () => {
            const { count, lang } = WEEK_SAMPLES[key];
            await writeWeekSample(count, lang);
            setStatus(`sample ${key} written`);
            await inspect();
          }}
        />
      ))}

      <Text variant="title">News</Text>
      <Row
        label="feed"
        value={
          news.data
            ? `${news.data.count} articles`
            : news.isLoading
              ? 'loading…'
              : 'error'
        }
      />
      {/* ⚠ Read back from DISK, same argument as the fixture snapshot above. */}
      <Row label="news.json on disk" value={newsOnDisk} />

      <Text variant="eyebrowSm" color="textFaint">
        Items as written · ✓ has news/{'{id}'}.jpg (✗ is normal past the fourth)
      </Text>
      <View style={styles.box}>
        <Text variant="micro" color="textSecondary" style={styles.mono}>
          {newsImages.length ? newsImages.join('\n') : '(none)'}
        </Text>
      </View>

      <Button
        label="Write news.json + warm images + reload"
        tone="secondary"
        onPress={async () => {
          if (!news.data) return;
          setStatus('writing news…');
          forgetNewsSnapshot();
          await applyNewsSnapshot(news.data.articles, new Date(), copy);
          setStatus('news written');
          await inspect();
        }}
      />
      <Button label="Re-inspect" tone="quiet" onPress={() => void inspect()} />
    </ScrollView>
  );
}

/**
 * What is actually in the App Group right now.
 *
 * ⚠ Reads back from DISK and never re-serialises the in-memory snapshot. The
 * whole question this screen answers is whether the write landed; printing the
 * object we would have written answers a different one.
 */
async function readContainer(): Promise<{
  summary: string;
  written: string;
  crests: string[];
}> {
  const file = snapshotFile();
  if (!file) return { summary: '(no App Group container)', written: '—', crests: [] };
  if (!file.exists) return { summary: '(not written yet)', written: '—', crests: [] };

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw) as WidgetSnapshot;
    const directory = groupContainer();

    return {
      // ⚠ Two fields, not one string. Joined, this runs off the right edge of
      // the row and the tail is invisible — on a screen whose whole job is to
      // show you the thing you cannot otherwise see.
      summary: `${raw.length} B · v${parsed.v} · ${parsed.entries.length} entries`,
      written: parsed.writtenAt.replace('T', ' ').replace(/\.\d+Z$/, 'Z'),
      crests: parsed.entries.map((entry) => {
        if (!directory) return `${entry.fixtureId} — no container`;
        const folder = new Directory(directory, 'crests', entry.fixtureId);
        const home = new File(folder, 'home.png');
        const away = new File(folder, 'away.png');
        return `${entry.opponentAbbr.padEnd(4)} home:${home.exists ? '✓' : '✗'} away:${away.exists ? '✓' : '✗'}`;
      }),
    };
  } catch (error) {
    return {
      summary: `unreadable: ${error instanceof Error ? error.message : String(error)}`,
      written: '—',
      crests: [],
    };
  }
}

/** `live.json` as it sits on disk — writer, age, and one line per match. */
async function readLive(): Promise<string> {
  const container = groupContainer();
  if (!container) return '(no App Group container)';
  const file = new File(container, SNAPSHOT_DIR, LIVE_NAME);
  if (!file.exists) return '(not written yet)';

  try {
    const parsed = JSON.parse(await file.text()) as WidgetLiveState;
    const lines = parsed.matches.map(
      (match) =>
        `${match.fixtureId.slice(0, 8)} ${match.status} ${match.homeGoals ?? '–'}-${match.awayGoals ?? '–'} ${match.minute ?? ''}′`,
    );
    return `${parsed.source} · ${parsed.writtenAt.replace('T', ' ').replace(/\.\d+Z$/, 'Z')} · ${lines.join(' | ') || '(empty)'}`;
  } catch (error) {
    return `unreadable: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * The fabricated preview pair — a snapshot with one in-play LaLiga fixture (plus
 * its NEXT match, so the FT footer has something to point at) and a matching
 * `live.json`. English copy, fixed clubs, fake fixture ids (lettered crest
 * tiles) — a PREVIEW, deliberately unmistakable for live data on inspection.
 */
async function writeSample(kind: 'live' | 'ft'): Promise<void> {
  const now = new Date();
  const kickoff = new Date(now.getTime() - (kind === 'ft' ? 130 : 38) * 60 * 1000);
  const next = new Date(now.getTime() + 4 * 24 * 3600 * 1000);

  const snapshot: WidgetSnapshot = {
    v: SNAPSHOT_VERSION,
    writtenAt: now.toISOString(),
    clubs: [{ slug: 'celta-vigo', name: 'Celta de Vigo', abbr: 'CEL' }],
    copy: {
      next: 'NEXT',
      yourWeek: 'YOUR WEEK',
      clubCount: '1 CLUB',
      followPrompt: 'Follow a club',
      noFixtures: 'No matches scheduled',
      versus: 'v',
      away: 'at',
      homeTag: 'HOME',
      awayTag: 'AWAY',
      live: 'LIVE',
      halfTime: 'HT',
      fullTime: 'FT',
    },
    entries: [
      {
        fixtureId: 'debug-live-1',
        clubSlug: 'celta-vigo',
        isHome: true,
        homeAbbr: 'CEL',
        awayAbbr: 'ATH',
        homeSlug: 'celta-vigo',
        awaySlug: 'athletic-club',
        homeName: 'Celta',
        awayName: 'Athletic',
        opponentName: 'Athletic Club',
        opponentAbbr: 'ATH',
        opponentSlot: 'away',
        kickoffUtc: kickoff.toISOString(),
        kickoffLabel: 'Sun 3:30 pm',
        kickoffDay: 'SUN',
        kickoffTime: '3:30',
        roundLabel: 'MD 3',
        venue: 'Balaídos',
        leagueSlug: 'laliga',
      },
      {
        fixtureId: 'debug-next-1',
        clubSlug: 'celta-vigo',
        isHome: false,
        homeAbbr: 'GIR',
        awayAbbr: 'CEL',
        homeSlug: 'girona',
        awaySlug: 'celta-vigo',
        homeName: 'Girona',
        awayName: 'Celta',
        opponentName: 'Girona FC',
        opponentAbbr: 'GIR',
        opponentSlot: 'home',
        kickoffUtc: next.toISOString(),
        kickoffLabel: 'Wed 9:00 pm',
        kickoffDay: 'WED',
        kickoffTime: '9:00',
        roundLabel: 'MD 4',
        venue: 'Montilivi',
        leagueSlug: 'laliga',
      },
    ],
  };

  const live: WidgetLiveState = {
    v: LIVE_VERSION,
    writtenAt: now.toISOString(),
    source: 'app',
    matches: [
      kind === 'ft'
        ? {
            fixtureId: 'debug-live-1',
            status: 'finished',
            minute: null,
            minuteAt: now.toISOString(),
            homeGoals: 2,
            awayGoals: 1,
            lastEvent: 'Iglesias 20′',
          }
        : {
            fixtureId: 'debug-live-1',
            status: 'live',
            minute: 37,
            minuteAt: now.toISOString(),
            homeGoals: 1,
            awayGoals: 0,
            lastEvent: 'Iglesias 20′',
          },
    ],
  };

  writeSnapshot(snapshot);
  writeGroupJson(SNAPSHOT_DIR, LIVE_NAME, live);
  await reloadWidgets();
}

/**
 * ⭐ ADR 0086 — the medium tile at one, two and three fixtures.
 *
 * The clubs are the layout's WORST CASE, not a pretty one: `R. Sociedad` (11
 * characters) against `Villarreal` (10) is the longest pair `widgetName` can
 * actually produce, and it is what decided the hero stacks rather than sitting
 * on one row. Screenshot `week3` on an SE and the rail name is the thing that
 * truncates — by design; the kickoff beside it is a number and must not.
 *
 * ⚠ Kickoffs are pinned to a real LaLiga weekend rather than `now + n days`, so
 * the day labels are stable across runs — but they are shifted forward to keep
 * every row in the future, because `rows(after:)` drops anything already past.
 */
const WEEK_SAMPLES: Record<string, { count: 1 | 2 | 3; lang: Locale }> = {
  week1: { count: 1, lang: 'en' },
  week2: { count: 2, lang: 'en' },
  week3: { count: 3, lang: 'en' },
  week3es: { count: 3, lang: 'es' },
};

/** One fabricated wire fixture. Only the club names and the instant are typed. */
function wireFixture(
  id: string,
  home: { slug: string; name: string },
  away: { slug: string; name: string },
  kickoffUtc: string,
): WindowFixtureView {
  const team = (t: { slug: string; name: string }) => ({
    slug: t.slug,
    name: t.name,
    shortName: null,
    logoUrl: null,
    logoUrls: null,
  });
  return {
    id,
    homeTeam: team(home),
    awayTeam: team(away),
    competition: 'league',
    competitionName: 'LaLiga',
    round: 'Jornada 4',
    kickoffUtc,
    kickoffTbd: false,
    venue: null,
    venueCity: null,
    status: 'scheduled',
    goalsHome: null,
    goalsAway: null,
    // ⚠ The API slug, never our internal `la-liga` (ADR 0084 / trap 48).
    leagueSlug: 'laliga',
    season: 2026,
    matchweek: 4,
  };
}

async function writeWeekSample(count: 1 | 2 | 3, lang: Locale): Promise<void> {
  const now = new Date();
  // Saturday 21:00, Sunday 16:15 and Sunday 18:30 Madrid time, next weekend.
  const day = 24 * 3600 * 1000;
  const at = (offsetDays: number, hhmm: string) => {
    const d = new Date(now.getTime() + offsetDays * day);
    const [h, m] = hhmm.split(':').map(Number);
    d.setUTCHours(h, m, 0, 0);
    return d.toISOString();
  };

  const clubs = {
    sociedad: { slug: 'real-sociedad', name: 'Real Sociedad' },
    villarreal: { slug: 'villarreal', name: 'Villarreal CF' },
    valladolid: { slug: 'valladolid', name: 'Real Valladolid' },
    rayo: { slug: 'rayo-vallecano', name: 'Rayo Vallecano' },
    palmas: { slug: 'las-palmas', name: 'UD Las Palmas' },
    athletic: { slug: 'athletic-club', name: 'Athletic Club' },
  };

  const wire = [
    wireFixture('debug-week-1', clubs.sociedad, clubs.villarreal, at(5, '19:00')),
    wireFixture('debug-week-2', clubs.valladolid, clubs.rayo, at(6, '14:15')),
    wireFixture('debug-week-3', clubs.palmas, clubs.athletic, at(6, '16:30')),
  ].slice(0, count);

  // ⚠ The REAL builder, the real copy table and the real formatters — see the
  // `?sample=` docblock. Nothing below is a value typed by hand.
  const phrases = PHRASES[lang];
  const zone = 'Europe/Madrid';
  const snapshot = buildSnapshot(
    wire,
    [clubs.sociedad.slug, clubs.rayo.slug, clubs.palmas.slug].slice(0, count),
    now,
    COPY[lang],
    (iso) => formatWidgetKickoff(iso, zone, '24', phrases),
    (iso) => formatWidgetKickoffParts(iso, zone, '24', phrases),
  );

  writeSnapshot(snapshot);
  await reloadWidgets();
}

function clearLive(): void {
  const container = groupContainer();
  if (!container) return;
  const file = new File(container, SNAPSHOT_DIR, LIVE_NAME);
  if (file.exists) file.delete();
}

/** `news.json` as it sits on disk, plus whether each item's picture is there. */
async function readNews(): Promise<{ summary: string; images: string[] }> {
  const file = newsSnapshotFile();
  if (!file) return { summary: '(no App Group container)', images: [] };
  if (!file.exists) return { summary: '(not written yet)', images: [] };

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw) as NewsSnapshot;
    return {
      summary: `${raw.length} B · v${parsed.v} · ${parsed.items.length} items · ${parsed.writtenAt.replace('T', ' ').replace(/\.\d+Z$/, 'Z')}`,
      images: parsed.items.map(
        (item) =>
          `${newsImageExists(item.id) ? '✓' : '✗'} ${item.hasImage ? 'h' : '-'} ${item.publisher.padEnd(6)} ${item.title.slice(0, 40)}`,
      ),
    };
  } catch (error) {
    return {
      summary: `unreadable: ${error instanceof Error ? error.message : String(error)}`,
      images: [],
    };
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="footnote" color="textSecondary">
        {label}
      </Text>
      <Text variant="footnote" color="accent" style={styles.mono}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: Spacing.five, paddingTop: Spacing.eight * 2, gap: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  box: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  mono: { fontFamily: 'Menlo' },
});
