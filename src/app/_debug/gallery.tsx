/**
 * The molecule gallery — every state, side by side, on fabricated data.
 *
 * The point is the states that production rarely shows: `--:--`, a null score, a
 * cancelled fixture, an empty form strip, a scoreboard row with no `lastUpdateAt`.
 * Those are exactly the ones that ship broken, because nobody sees them until a
 * Tuesday in October.
 */
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BAND_COLOR, Button, ChipButton, Hairline, PlusGlyph, Score, Switch, Text } from '@/components/atoms';
import {
  ClubBubble,
  ClubRow,
  Countdown,
  EventRow,
  EventTabs,
  FeedAge,
  FixtureTiming,
  FormStrip,
  HomeAwayTag,
  ListRow,
  ScoreLine,
  SectionHeader,
  StatRow,
} from '@/components/molecules';
import { FinishedToday } from '@/components/organisms/finished-today';
import { NewsCard } from '@/components/organisms/news-card';
import { NewsList, type NewsGroup } from '@/components/organisms/news-list';
import { MatchBoard } from '@/components/organisms/match-board';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  detailLine,
  eventKind,
  eventSide,
  eventKey,
  eventsInGroup,
  groupCounts,
  initialGroup,
  minuteLabel,
  type EventGroup,
} from '@/lib/cronogol/events';
import { clubTint, pairWash } from '@/lib/cronogol/club-wash';
import { STALL_AFTER_MS, isStalled, liveMinute, minutesSinceSeen } from '@/lib/cronogol/live';
import { frontPagePick } from '@/lib/cronogol/news';
import type {
  FixtureWindowView,
  LiveMatchEventView,
  LiveMatchView,
  MatchEventView,
  NewsArticleView,
  TeamRef,
  WindowFixtureView,
} from '@/lib/cronogol/types';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useState } from 'react';

const ZONE = 'Europe/Madrid';
const SOON = new Date(Date.now() + 1000 * 60 * 60 * 28).toISOString();
/** One clock read for every fabricated stamp below — never read during render. */
const NOW = Date.now();

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

/**
 * Fabricated `/cronogol/live` rows (ADR 0048).
 *
 * ⚠ **This is the only way to see the live card most days.** The route is
 * LaLiga-only and serves in-play matches exclusively, so outside a ninety-minute
 * window on a matchday it returns an empty array — which is the normal answer,
 * and which means the states below would otherwise ship unseen.
 *
 * ⚠ `lastSeenAt` is built off the clock rather than pinned, because the stall
 * test is a comparison against now. A frozen literal would read as stalled the
 * day after this file was written and prove nothing.
 */
const liveRow = (over: Partial<LiveMatchView> = {}): LiveMatchView => ({
  fixtureId: 'gallery-live',
  home: { slug: 'barcelona', name: 'FC Barcelona', shortName: 'BAR' },
  away: { slug: 'athletic-club', name: 'Athletic Club', shortName: 'ATH' },
  kickoffUtc: new Date(NOW - 1000 * 60 * 67).toISOString(),
  status: 'live',
  minute: 67,
  injuryTime: null,
  score: { home: 1, away: 0 },
  halftime: { home: null, away: null },
  lastSeenAt: new Date(NOW - 1000 * 12).toISOString(),
  events: [],
  ...over,
});

/**
 * The same timeline as `EVENTS`, in the shape `GET /cronogol/live` actually
 * sends it — **no `id`** (ADR 0051).
 *
 * ⚠ Derived from `EVENTS` rather than written out again, so the two can never
 * disagree about what a goal looks like. What it proves is narrow and worth
 * proving: that the panel renders the id-less shape production will send, and
 * that `eventKey` tells the rows apart without one.
 */
const LIVE_EVENTS: LiveMatchEventView[] = EVENTS.map(({ id: _id, ...rest }) => rest);

const LIVE_SIDE = (name: string, abbr: string, goals: number | null, muted: boolean) => ({
  name,
  crest: null,
  abbr,
  goals,
  muted,
});

/**
 * The next-up card's four wash states (ADR 0068), on REAL club hexes copied
 * from `/cronogol/teams` on 2026-08-29 — the point is the awkward ones.
 *
 * ⚠ Crests are null here on purpose: the monogram tile is the case where a
 * grey plate sits on a coloured wash, which is the collision to look at.
 */
const WASH_TEAM = (primary: string | null, secondary: string | null) => ({
  colorPrimary: primary,
  colorSecondary: secondary,
});
const NEXT_SIDE = (name: string, abbr: string) => ({ name, crest: null, abbr, goals: null });
const NEXT_CASES = [
  { label: 'Real Madrid v Barcelona — both colours; ⚠ Barça is BLUE, never purple',
    home: NEXT_SIDE('Real Madrid', 'RMA'), away: NEXT_SIDE('Barcelona', 'BAR'),
    wash: pairWash(WASH_TEAM('#0f39b8', '#ffffff'), WASH_TEAM('#0f39b8', '#bc161c')) },
  { label: 'Villarreal v Betis — #ffd301 clamped to gold',
    home: NEXT_SIDE('Villarreal', 'VIL'), away: NEXT_SIDE('Real Betis', 'BET'),
    wash: pairWash(WASH_TEAM('#ffd301', '#ffffff'), WASH_TEAM('#038316', '#ffffff')) },
  { label: 'Athletic v Valencia — #000000 → graphite, the card leans red',
    home: NEXT_SIDE('Athletic Club', 'ATH'), away: NEXT_SIDE('Valencia', 'VAL'),
    wash: pairWash(WASH_TEAM('#f21e27', '#ffffff'), WASH_TEAM('#000000', '#ffffff')) },
  { label: 'Arsenal v Liverpool — no colours on file: ⚠ must be TODAY\'S card, lime ring',
    home: NEXT_SIDE('Arsenal', 'ARS'), away: NEXT_SIDE('Liverpool', 'LIV'),
    wash: pairWash(WASH_TEAM(null, null), WASH_TEAM(null, null)) },
];

/**
 * A FINISHED TODAY window on the pairs that used to truncate (ADR 0069): the
 * longest tracked names, a draw (both lit), a null-crest pair (monogram tiles)
 * and two leagues so the band-vs-row height rule (0062) is on screen too.
 */
const REF = (slug: string, name: string, shortName: string | null = null): TeamRef => ({
  slug, name, shortName, logoUrl: null, logoUrls: null,
});
const FINISHED = (
  id: string, leagueSlug: string, home: TeamRef | null, away: TeamRef | null, gh: number, ga: number,
): WindowFixtureView => ({
  id, homeTeam: home, awayTeam: away, competition: 'league', competitionName: null, round: null,
  kickoffUtc: new Date(NOW - 3 * 60 * 60 * 1000).toISOString(), kickoffTbd: false, venue: null,
  venueCity: null, status: 'finished', goalsHome: gh, goalsAway: ga, leagueSlug, season: 2026,
  matchweek: 4,
});
const FINISHED_WINDOW: FixtureWindowView = {
  from: new Date(NOW).toISOString(), to: new Date(NOW).toISOString(), count: 5, truncated: false,
  nextKickoffUtc: null,
  leagues: [
    { slug: 'premier-league', name: 'PREMIER LEAGUE', logoUrl: null, logoUrls: null, accentColor: null },
    { slug: 'bundesliga', name: 'BUNDESLIGA', logoUrl: null, logoUrls: null, accentColor: null },
  ],
  fixtures: [
    FINISHED('f1', 'premier-league', REF('liverpool', 'Liverpool', 'LIV'), REF('nottingham-forest', 'Nottingham Forest', 'NFO'), 2, 2),
    FINISHED('f2', 'premier-league', REF('brighton', 'Brighton & Hove Albion', 'BHA'), REF('manchester-united', 'Manchester United', 'MUN'), 1, 3),
    // ⚠ A side that could not be resolved — the `?` monogram and an em dash.
    FINISHED('f3', 'premier-league', REF('wolverhampton', 'Wolverhampton Wanderers', 'WOL'), null, 0, 1),
    FINISHED('f4', 'bundesliga', REF('gladbach', 'Borussia Mönchengladbach', 'BMG'), REF('bayern', 'Bayern München', 'FCB'), 0, 4),
    // ⚠ Double digits — the widest the goal column is asked to hold.
    FINISHED('f5', 'bundesliga', REF('kiel', 'Holstein Kiel', 'KIE'), REF('leverkusen', 'Bayer 04 Leverkusen', 'B04'), 10, 1),
  ],
};

/**
 * The News front page (ADR 0070) on fabricated stories. Pictures are REAL
 * MARCA URLs from 2026-08-29 — hot-linked, so they will 404 one day, and that
 * day the first case turns into the second. That is a state, not a breakage.
 */
const MARCA = { id: 'marca', name: 'MARCA', siteUrl: 'https://www.marca.com', isFirstParty: false };
const STORY = (
  id: string, title: string, excerpt: string | null, imageUrl: string | null, hoursAgo: number,
  category = 'Primera División',
): NewsArticleView => ({
  id, title, excerpt, imageUrl, url: `https://www.marca.com/${id}`,
  publishedAt: new Date(NOW - hoursAgo * 60 * 60 * 1000).toISOString(),
  publisher: MARCA, author: null, categories: [category],
});
const IMG = (f: string) => `https://objetos-xlk.estaticos-marca.com/files/og_thumbnail/uploads/2026/08/29/${f}.jpeg`;
const NEWS_STORIES: NewsArticleView[] = [
  STORY('n1', 'Sevilla 1-3 Atlético de Madrid | Resumen LaLiga',
    'El Atlético se lleva el derbi andaluz con un doblete de Baena y un gol de Julián en el descuento.', IMG('6a932fb775b3a'), 1, 'Atlético'),
  STORY('n2', 'Luis García Plaza: "Espero que saquen en el vídeo de LaLiga la acción del penalti"', null, IMG('6a932fb775b3a'), 1, 'Sevilla'),
  STORY('n3', 'Simeone: "Me voy contento por el compromiso, la identidad de lo que somos y lo que queremos"',
    'El técnico argentino valoró la victoria en el Sánchez-Pizjuán.', IMG('6a932fb775b3a'), 2, 'Atlético'),
  STORY('n4', 'Kike Salas: "Noto que me golpean, pero me dicen que no es suficiente"', null, IMG('6a932fb775b3a'), 2, 'Sevilla'),
  STORY('n5', 'Deportivo - Valencia | Riazor quiere tener la fiesta en paz: previa, análisis, pronóstico y predicción', null, IMG('6a932fb775b3a'), 3),
  STORY('n6', 'Baena hace que se cumplan los sueños', null, null, 4, 'Atlético'),
];
/** The screen's own mapping, in miniature. */
const newsGroup = (label: string, items: NewsArticleView[], count: string): NewsGroup => {
  const row = (a: NewsArticleView) => ({
    key: a.id, title: a.title, imageUrl: a.imageUrl, topic: a.categories[0] ?? null,
    publisher: a.publisher.name, age: '2h', onPress: () => {},
  });
  const page = frontPagePick(items);
  return {
    label, count,
    lead: page.lead ? { ...row(page.lead), excerpt: page.lead.excerpt, kicker: 'Lead' } : null,
    tiles: page.tiles.map(row),
    rows: page.rows.map(row),
  };
};
const NEWS_CHIPS = [{ id: 'all', label: 'All' }, { id: 'laliga', label: 'LaLiga' }];
/** The Today screen's `story()` mapper, in miniature. */
const cardStory = (a: NewsArticleView) => ({
  title: a.title, imageUrl: a.imageUrl, topic: a.categories[0] ?? null, publisher: a.publisher.name, age: '2h',
});

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

/** Counted once — the fixture array is a module constant, not props. */
const EV_COUNTS = groupCounts(EVENTS);

/**
 * The live-card states, resolved ONCE at module scope.
 *
 * ⚠ `isStalled` and `minutesSinceSeen` both read a clock, and doing that during
 * render is `react-hooks/purity`. Resolving here is also the more honest test:
 * these cases are fixed states to look at, not a ticking card, and a stall that
 * flickered between renders would be a worse gallery than one that does not.
 */
const LIVE_CASES = (
  [
    {
      label: 'live · 67′ — the ordinary case, /cronogol/live',
      match: liveRow(),
    },
    {
      label: 'live · 94′ — ⚠ stoppage is INCLUDED, never rendered 90+4′',
      match: liveRow({ minute: 94 }),
    },
    {
      label: 'live · before kick-off — ⚠ a dash, never 0 (null is not a zero)',
      match: liveRow({ minute: null, score: { home: null, away: null } }),
    },
    {
      label: 'unknown status — ⚠ the score is still true, the minute is not',
      match: liveRow({ status: 'unknown', minute: null }),
    },
    {
      // ⚠ The case that used to be `polling: false`. That flag is no longer read
      // (0049) — production served it `false` for a whole match that was
      // updating fine, so `lastSeenAt` is the only stall signal now.
      label: 'stalled · lastSeenAt just past the 2-min threshold',
      match: liveRow({ lastSeenAt: new Date(NOW - (STALL_AFTER_MS + 30_000)).toISOString() }),
    },
    {
      label: 'stalled · lastSeenAt 9 min behind — dimmed minute, paused note',
      match: liveRow({ lastSeenAt: new Date(NOW - 1000 * 60 * 9).toISOString() }),
    },
  ] as const
).map(({ label, match }) => ({
  label,
  match,
  stalled: isStalled(match, NOW),
  minute: liveMinute(match),
  minutesAgo: minutesSinceSeen(match, NOW),
}));


/**
 * The Clubs rail and its list (ADR 0082) — every state production rarely puts
 * on one screen at once.
 *
 * ⚠ The tints run through the REAL `clubTint`, not literals: a bubble here has
 * to prove the selection rule, including the fallback map that carries the
 * Premier League and Serie A.
 */
const RAIL_CASES = [
  {
    // ⚠ The API's own hexes, not the handoff's garnet. Barcelona and Real
    // Madrid both serve `#0f39b8` — the rail draws what the wire says.
    label: 'LaLiga · API colour · UCL band',
    club: { slug: 'barcelona', colorPrimary: '#0f39b8', colorSecondary: '#bc161c' },
    name: 'Barcelona', abbr: 'BAR', rank: 1, zone: 'ucl' as const,
  },
  {
    label: 'Bundesliga · API colour · UEL band',
    club: { slug: 'bayer-04-leverkusen', colorPrimary: '#FF0000', colorSecondary: '#FF0000' },
    name: 'Leverkusen', abbr: 'B04', rank: 5, zone: 'uel' as const,
  },
  {
    label: 'Premier League · fallback map · Conference band',
    club: { slug: 'arsenal', colorPrimary: null, colorSecondary: null },
    name: 'Arsenal', abbr: 'ARS', rank: 7, zone: 'conf' as const,
  },
  {
    label: 'Serie A · fallback map · relegation band',
    club: { slug: 'venezia', colorPrimary: null, colorSecondary: null },
    name: 'Venezia', abbr: 'VEN', rank: 19, zone: 'rel' as const,
  },
  {
    // ⚠ The real payload: BOTH hexes are unusable, so the secondary does not
    // save it either and the curated colour is what draws. Five clubs — this
    // one, Leipzig, Stuttgart, Frankfurt, Gladbach — reach the map this way.
    label: 'black-and-white kit · both hexes unusable → the curated colour',
    club: { slug: 'valencia', colorPrimary: '#000000', colorSecondary: '#ffffff' },
    name: 'Valencia', abbr: 'VAL', rank: 11, zone: null,
  },
  {
    label: '⚠ no rank — absent, never 0 and never a dash',
    club: { slug: 'celta-vigo', colorPrimary: '#52c3f1', colorSecondary: '#ffffff' },
    name: 'Celta', abbr: 'CEL', rank: null, zone: null,
  },
  {
    // ⚠ `ceuta` is the ONE club in the catalogue that reaches this, and it is
    // kept out of the fallback map so this path stays drawn somewhere.
    label: '⚠ no colour anywhere (ceuta) → the NEUTRAL bubble, and no glow',
    club: { slug: 'ceuta', colorPrimary: null, colorSecondary: null },
    name: 'Ceuta', abbr: 'CEU', rank: null, zone: null,
  },
];

/** ⚠ The place line's three outcomes, which no single league shows all of. */
const BROWSE_CASES = [
  { label: 'a city — the Premier League and Serie A state one',
    slug: 'arsenal', name: 'Arsenal', abbr: 'ARS', place: 'London' },
  { label: '⚠ no city → the GROUND. All 20 LaLiga clubs land here',
    slug: 'athletic-club', name: 'Athletic Club', abbr: 'ATH', place: 'Estadio San Mamés' },
  { label: '⚠ neither — Bundesliga carries no venue at all. One line, not a bug',
    slug: '1-fc-koeln', name: '1. FC Köln', abbr: 'KOE', place: null },
  { label: '⚠ lastSyncedAt null → pending outranks the place (trap 1)',
    slug: 'ceuta', name: 'Grasshopper Club', abbr: 'GRA', place: 'Schedule pending' },
];

export default function GalleryScreen() {
  const { copy, phrases } = useI18n();
  /**
   * `?only=next` / `?only=finished` / `?only=news` / `?only=clubs` /
   * `?only=club-rows` render one section alone. The gallery is a long
   * scroll and the shell cannot drive one (no `idb`, no Accessibility), so a
   * section deep in it is otherwise unreachable from a deep link + screenshot.
   */
  const { only } = useLocalSearchParams<{ only?: string }>();
  const [on, setOn] = useState(true);
  // ⚠ `null` and derived, exactly as `MatchEvents` does it — the gallery must
  // exercise the real behaviour, not a simplified stand-in of it.
  const [picked, setPicked] = useState<EventGroup | null>(null);
  const evGroup = picked !== null && EV_COUNTS[picked] > 0 ? picked : initialGroup(EV_COUNTS);

  const nextUp = (
    <>
      <SectionHeader title="Next up" meta="the club-colour wash (ADR 0068)" />
      {NEXT_CASES.map(({ label, home, away, wash }) => (
        <Case key={label} label={label}>
          <MatchBoard
            next={{
              home,
              away,
              kickoffUtc: SOON,
              kickoffTbd: false,
              meta: copy.today.nextUp,
              kickoffLabel: '21:00',
              dateLabel: 'SAT 5 SEP',
              zoneLabel: `CEST · ${copy.today.yourTime}`,
              venue: 'Santiago Bernabéu',
              wash,
            }}
            copy={copy.today}
            events={copy.events}
          />
        </Case>
      ))}
    </>
  );

  const finishedToday = (
    <>
      <SectionHeader title="Finished today" meta="stacked pairs (ADR 0069)" />
      <Case label="long names · a draw · a null side · double digits — nothing may truncate">
        <FinishedToday window={FINISHED_WINDOW} eventsCopy={copy.events} />
      </Case>
    </>
  );

  const news = (
    <>
      <SectionHeader title="Today's news card" meta="picture lead (ADR 0071)" />
      <Case label="lead with its picture across the card · 3 NEW">
        <NewsCard
          lead={cardStory(NEWS_STORIES[0])}
          rows={NEWS_STORIES.slice(1, 3).map(cardStory)}
          newLabel={copy.news.newCount(3)}
          title={copy.news.title}
          allNews={copy.news.allNews}
          onPress={() => {}}
        />
      </Case>
      <Case label="lead with NO picture — headline-first, same story">
        <NewsCard
          lead={cardStory({ ...NEWS_STORIES[0], imageUrl: null })}
          rows={NEWS_STORIES.slice(1, 3).map(cardStory)}
          newLabel={null}
          title={copy.news.title}
          allNews={copy.news.allNews}
          onPress={() => {}}
        />
      </Case>

      <SectionHeader title="News front page" meta="lead · tiles · rows (ADR 0070)" />
      <Case label="six stories — lead with excerpt, two tiles, three rows">
        <NewsList chips={NEWS_CHIPS} activeChip="all" onChip={() => {}} loading={false}
          newLabel="4 new" copy={copy.news}
          groups={[newsGroup('Today', NEWS_STORIES, '6 stories'), newsGroup('Yesterday', NEWS_STORIES.slice(3), '3 stories')]} />
      </Case>
      <Case label="lead with NO picture — a text lead, same story, same slot">
        <NewsList chips={NEWS_CHIPS} activeChip="laliga" onChip={() => {}} loading={false}
          newLabel={null} copy={copy.news}
          groups={[newsGroup('Today', [{ ...NEWS_STORIES[0], imageUrl: null }, ...NEWS_STORIES.slice(1, 4)], '4 stories')]} />
      </Case>
      <Case label="two stories — lead and ONE wide tile">
        <NewsList chips={NEWS_CHIPS} activeChip="all" onChip={() => {}} loading={false}
          newLabel={null} copy={copy.news} groups={[newsGroup('Today', NEWS_STORIES.slice(0, 2), '2 stories')]} />
      </Case>
      <Case label="one story — lead alone · then the loading skeleton">
        <NewsList chips={NEWS_CHIPS} activeChip="all" onChip={() => {}} loading={false}
          newLabel={null} copy={copy.news} groups={[newsGroup('Today', NEWS_STORIES.slice(2, 3), '1 story')]} />
        <NewsList chips={NEWS_CHIPS} activeChip="all" onChip={() => {}} loading newLabel={null} copy={copy.news} groups={[]} />
      </Case>
    </>
  );

  const clubsRail = (
    <>
      <SectionHeader title="Clubs rail" meta="bubbles · bands · the neutral case (ADR 0082)" />
      {RAIL_CASES.map(({ label, club, name, abbr, rank, zone }) => (
        <Case key={label} label={label}>
          <View style={styles.rail}>
            <ClubBubble
              name={name}
              crest={null}
              abbr={abbr}
              tint={clubTint({ slug: club.slug, colorPrimary: club.colorPrimary, colorSecondary: club.colorSecondary })}
              rank={rank}
              rankColor={zone ? BAND_COLOR[zone] : null}
              accessibilityLabel={copy.clubs.railClub(name, rank)}
              onPress={() => {}}
            />
          </View>
        </Case>
      ))}

    </>
  );

  const clubRows = (
    <>
      <SectionHeader title="Browse row" meta="the place line's three outcomes" />
      <Case label="one tray, hairlines between and none after the last">
        <View style={styles.tray}>
          {BROWSE_CASES.map((c, i) => (
            <ClubRow
              key={c.slug}
              name={c.name}
              place={c.place}
              crest={null}
              abbr={c.abbr}
              followLabel={copy.clubs.follow}
              followAccessibilityLabel={copy.clubs.followClub(c.name)}
              onOpen={() => {}}
              onFollow={() => {}}
              rule={i < BROWSE_CASES.length - 1}
            />
          ))}
        </View>
      </Case>
      {BROWSE_CASES.map((c) => (
        <Case key={c.label} label={c.label}>
          <View style={styles.tray}>
            <ClubRow
              name={c.name}
              place={c.place}
              crest={null}
              abbr={c.abbr}
              followLabel={copy.clubs.follow}
              followAccessibilityLabel={copy.clubs.followClub(c.name)}
              onOpen={() => {}}
              onFollow={() => {}}
              rule={false}
            />
          </View>
        </Case>
      ))}

      {/* ⚠ No league row here. The Clubs screen shares `LeagueSwitch` with
          Matchdays and Table, so it is exercised by those screens, and a
          fixture copy of it would be a second thing to keep in step. */}
      <Case label="the follow pill, alone — label plus the glyph in its disc">
        <ChipButton label={copy.clubs.follow} shape="pill" trailing={<PlusGlyph />} onPress={() => {}} />
      </Case>
    </>
  );

  if (only === 'clubs') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {clubsRail}
      </ScrollView>
    );
  }

  if (only === 'club-rows') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {clubRows}
      </ScrollView>
    );
  }

  if (only === 'news') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {news}
      </ScrollView>
    );
  }

  if (only === 'finished') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {finishedToday}
      </ScrollView>
    );
  }

  if (only === 'next') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {nextUp}
      </ScrollView>
    );
  }

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
      <Case label="the group tabs, live — tap through; ⚠ a 0 group is dimmed and inert">
        <View style={styles.eventPanel}>
          <EventTabs
            counts={EV_COUNTS}
            active={evGroup}
            labels={copy.events.groups}
            onSelect={setPicked}
          />
          <View style={styles.eventRows}>
            {eventsInGroup(EVENTS, evGroup).map((event, index) => (
              <EventRow
                key={eventKey(event, index)}
                minute={minuteLabel(event)}
                kind={eventKind(event)}
                name={event.player.name}
                detail={detailLine(event, copy.events)}
                crest={null}
                abbr={eventSide(event, EV_HOME, EV_AWAY) === 'home' ? EV_HOME.shortName : null}
              />
            ))}
          </View>
        </View>
      </Case>
      <Case label="every group empty but one — what a 4-0 with no cards and no VAR looks like">
        <View style={styles.eventPanel}>
          <EventTabs
            counts={{ goals: 4, cards: 0, subs: 2, other: 0 }}
            active="goals"
            labels={copy.events.groups}
            onSelect={() => {}}
          />
        </View>
      </Case>
      <Case label="nothing stored yet — ⚠ NOT the same as a goalless match">
        <View style={styles.eventPanel}>
          <Text variant="micro" color="textMuted">
            {copy.events.notPublished}
          </Text>
        </View>
      </Case>

      {nextUp}
      {finishedToday}
      {news}

      {clubsRail}
      {clubRows}

      <SectionHeader title="Live card" meta="the two paths (ADR 0048)" />
      {LIVE_CASES.map(({ label, match, stalled, minute, minutesAgo }) => (
        <Case key={label} label={label}>
          <MatchBoard
            live={{
              // ⚠ No fixture behind a fabricated row, so no chevron. A real id
              // is what the two dedicated cases below supply instead.
              id: null,
              homeTeam: null,
              awayTeam: null,
              home: LIVE_SIDE('Barcelona', 'BAR', match.score.home, false),
              away: LIVE_SIDE(
                'Athletic Club',
                'ATH',
                match.score.away,
                match.score.home !== null &&
                  match.score.away !== null &&
                  match.score.away < match.score.home,
              ),
              isLive: true,
              minute: minute === null ? null : copy.today.minute(minute),
              stalled,
              note: stalled ? copy.today.liveStalled(minutesAgo) : copy.today.liveNote,
              lastUpdateAt: null,
            }}
            copy={copy.today}
            events={copy.events}
          />
        </Case>
      ))}
      {/* ⚠ The FALLBACK, side by side with the above on purpose: every league
          except LaLiga still lands here, and it must keep its FeedAge line and
          its "as of the last check" note. */}
      <Case label="sweep fallback · /cronogol/fixtures — no minute, FeedAge, cadence note">
        <MatchBoard
          live={{
            id: null,
            homeTeam: null,
            awayTeam: null,
            home: LIVE_SIDE('Bayern München', 'FCB', 2, false),
            away: LIVE_SIDE('RB Leipzig', 'RBL', 1, true),
            isLive: false,
            minute: null,
            stalled: false,
            note: copy.today.inPlayNote,
            lastUpdateAt: null,
          }}
          copy={copy.today}
          events={copy.events}
        />
      </Case>

      {/* ⚠⚠ The two cases below are the ONLY way to see an expanded in-progress
          card (ADR 0050). `/cronogol/fixtures/{id}/events` serves nothing during
          play today, so on real data the panel can only ever show the second of
          them — the first is what the card becomes when the backend lands live
          events, and it is here so that shape is looked at before it ships.

          ⚠ Both go through `supplied`, so neither fires a request off a fake
          fixture id — which would settle on the ERROR copy and show nothing. */}
      <Case label="in-progress · EXPANDED — the LIVE timeline off /cronogol/live; ⚠ id-less, no network">
        <MatchBoard
          live={{
            id: 'gallery-live',
            homeTeam: EV_HOME,
            awayTeam: EV_AWAY,
            suppliedEvents: LIVE_EVENTS,
            home: LIVE_SIDE('Arsenal', 'ARS', 2, false),
            away: LIVE_SIDE('Chelsea', 'CHE', 1, true),
            isLive: true,
            minute: copy.today.minute(67),
            stalled: false,
            note: copy.today.liveNote,
            lastUpdateAt: null,
          }}
          copy={copy.today}
          events={copy.events}
        />
      </Case>

      <Case label="in-progress · EXPANDED, empty — ⚠ what a REAL live match shows today">
        <MatchBoard
          live={{
            id: 'gallery-live-empty',
            homeTeam: EV_HOME,
            awayTeam: EV_AWAY,
            // ⚠ `[]`, not undefined: "we hold the answer and it is empty".
            // Never "no goals" — the copy is the only place that holds the line.
            suppliedEvents: [],
            home: LIVE_SIDE('Arsenal', 'ARS', 0, false),
            away: LIVE_SIDE('Chelsea', 'CHE', 0, false),
            isLive: true,
            minute: copy.today.minute(8),
            stalled: false,
            note: copy.today.liveNote,
            lastUpdateAt: null,
          }}
          copy={copy.today}
          events={copy.events}
        />
      </Case>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // The bubble hangs its rank badge 2pt below itself; give it the clearance.
  rail: { paddingBottom: Spacing.two, alignItems: 'flex-start' },
  tray: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.group,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.hairlineMid,
    overflow: 'hidden',
  },
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: Spacing.five, paddingTop: Spacing.eight * 2, gap: Spacing.four },
  case: { gap: Spacing.two },
  body: { paddingVertical: Spacing.two },
  rowOfCells: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  cell: { gap: Spacing.one },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  buttons: { gap: Spacing.two },
  eventRows: { gap: Spacing.three },
  eventPanel: {
    backgroundColor: Colors.dark.sunken,
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
