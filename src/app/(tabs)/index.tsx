/**
 * The Today board.
 *
 * ⚠ With nothing followed the live/last/next cards are SUPPRESSED and the follow
 * card carries the screen — there is no "your" match to lead with. That is the
 * design's own rule (SPEC §3.1), and it is why this screen is fully buildable
 * before push exists: it is exactly what a new user sees.
 */
import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useMemo, useReducer, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Crest, SkeletonRows, Text } from '@/components/atoms';
import { SectionHeader, StatTile, UpcomingCard } from '@/components/molecules';
import { FinishedToday } from '@/components/organisms/finished-today';
import { LivePlate } from '@/components/organisms/live-plate';
import { LastResultCard } from '@/components/organisms/last-result-card';
import { NextUpCard } from '@/components/organisms/next-up-card';
import { NewsCard } from '@/components/organisms/news-card';
import { AvatarButton, ScreenScaffold } from '@/components/templates/screen-scaffold';
import { useIdentityInitials } from '@/features/auth/use-identity';
import { applyWidgetLive } from '@/features/widgets/live';
import { Colors, Radius, Size, Spacing, Surfaces } from '@/constants/theme';
import { boardOutcome, involvesFollowed, lastResult, upcomingRow } from '@/lib/cronogol/board';
import { pairWash } from '@/lib/cronogol/club-wash';
import {
  boardFromKickoff,
  boardFromRoute,
  boardLive,
  isStalled,
  kickedOff,
  liveById,
  liveMinute,
  minutesSinceSeen,
  routeLive,
  type BoardLive,
} from '@/lib/cronogol/live';
import { abbreviate, crestSrc, displayName, matchday } from '@/lib/cronogol/derive';
import {
  articleTopic,
  newsAge,
  newsCardPick,
  plainText,
  selectNewsItems,
} from '@/lib/cronogol/news';
import type { WindowFixtureView } from '@/lib/cronogol/types';
import {
  formatFixtureDate,
  formatKickoffTime,
  formatRelativeDay,
  formatWeekdayLong,
} from '@/lib/format';
import { zoneAbbreviation } from '@/lib/timezones';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useTeams } from '@/queries/use-teams';
import { useLive } from '@/queries/use-live';
import { useNews } from '@/queries/use-news';
import { useFinishedToday, useRecent, useUpcoming } from '@/queries/use-today';
import { usePreferences, useZone } from '@/store/preferences';

/** The six clubs offered in the follow card's grid. */
const FOLLOW_PICKS = 6;

/**
 * Every fixture id `/cronogol/live` has served this process (ADR 0078).
 *
 * ⚠⚠ **The post-match guard for the kicked-off tier.** When a match ends its
 * live row vanishes, but the `today` window can be fifteen minutes stale and
 * still call the fixture `scheduled` — and "scheduled, kickoff in the past, no
 * live row" is exactly the shape the kicked-off tier holds. A fixture the route
 * has ever served is never held as "kicked off" again.
 *
 * ⚠ Module scope, not a ref or state, deliberately. It is read during render
 * (`react-hooks/refs` forbids `ref.current` there) and written from an effect
 * (a `setState` there is the lint error this repo carries six of and refuses a
 * seventh). It is bookkeeping about what the network has said, not render
 * state: nothing re-renders because it changed, and the render that needs it
 * always follows the effect that wrote it.
 */
const seenLive = new Set<string>();

export default function TodayScreen() {
  const router = useRouter();
  const { copy, phrases } = useI18n();
  const zone = useZone();
  const initials = useIdentityInitials();
  const { followed, clock, newsSeenAt } = usePreferences();

  const finished = useFinishedToday(zone);
  const upcoming = useUpcoming(zone);
  const recent = useRecent(zone);
  const teams = useTeams();
  // ⚠ The SAME query `PushSync` already holds for the widget — a cache read.
  const news = useNews();

  const hasClubs = followed.length > 0;

  /**
   * ⚠ **Both conditions, not either.** `useLive` polls every fifteen seconds
   * while enabled, so it must be off whenever the result cannot reach the
   * screen: on another tab (`useIsFocused`), and for a reader with nothing
   * followed — the lead cards are suppressed entirely there, so there is no row
   * to upgrade and the poll would be pure spend.
   *
   * ⚠ `useIsFocused` rather than a `useFocusEffect` + `useState` pair: the
   * latter is a `setState` inside an effect, which is a lint error this repo
   * already carries six of and does not need a seventh.
   */
  const focused = useIsFocused();
  const live = useLive(focused && hasClubs);

  /**
   * ⚠ **One instant for the whole render.** Every upcoming row is dated off it,
   * and so is every live freshness test — read per site, a render straddling
   * midnight would date two cards off different days, and one straddling the
   * stall threshold would paint a live-toned minute above a note saying updates
   * are paused.
   */
  const now = new Date();

  /**
   * Re-renders the screen at the instant the countdown crosses zero (ADR 0078).
   *
   * ⚠ The refetches `onKickoff` fires re-render too — but a request later. The
   * kicked-off tier below answers from fixtures ALREADY on screen, so all it
   * needs is a render that reads a `now` past the kickoff, and this is that.
   */
  const [, bumpKickoff] = useReducer((n: number) => n + 1, 0);

  /**
   * Records what the route has served into `seenLive` (ADR 0078).
   *
   * A row vanishing is also the one signal that a match has ENDED before the
   * sweep says so, so it refetches the two windows behind FINISHED TODAY and
   * the last-result card — once per fixture, guarded by `settled`.
   */
  const settled = useRef(new Set<string>());
  const refetchFinished = finished.refetch;
  const refetchRecent = recent.refetch;
  useEffect(() => {
    const byId = liveById(live.data?.matches ?? [], Date.now());
    for (const id of byId.keys()) seenLive.add(id);
    for (const id of seenLive) {
      if (byId.has(id) || settled.current.has(id)) continue;
      settled.current.add(id);
      void refetchFinished();
      void refetchRecent();
    }

    // The widget's live sidecar (ADR 0080) — keyed on score/state, so the
    // 15-second poll costs a WidgetKit reload only when something moved.
    applyWidgetLive(live.data?.matches ?? [], new Date());
  }, [live.data, refetchFinished, refetchRecent]);

  /**
   * The in-play match of a followed club, and whether it is genuinely live.
   *
   * ⚠⚠ **Tier 0 reads `/cronogol/live` ALONE** (ADR 0066). The route carries
   * our own slugs on both sides, so a followed club's in-play match needs NO
   * fixture window behind it — crests come from the club catalogue by slug.
   * This is what makes the card independent of the windows, which both end at
   * `now` and were the reason the card never appeared at a real kickoff
   * (Levante v Betis, 2026-08-29; HANDOFF trap 39).
   *
   * ⚠ `boardLive` remains the fallback: the sweep's own `live` flag for every
   * league the route does not cover. Nothing regresses there.
   */
  const board = ((): BoardLive | null => {
    if (!hasClubs) return null;
    // ⚠ Not memoised, deliberately: the age cutoff reads the clock, so a
    // `useMemo` would need `now` in its deps and recompute on every render
    // regardless. A filter and a sort over one window of fixtures is cheaper
    // than pretending otherwise.
    const byId = liveById(live.data?.matches ?? [], now.getTime());
    const fromRoute = routeLive(byId, followed);
    if (fromRoute) return boardFromRoute(fromRoute, teams.data ?? []);
    /**
     * ⚠⚠ **Kicked off, and nothing has reported yet** (ADR 0078). The route
     * flips a match to `live` at the ACTUAL whistle, two to five minutes after
     * the scheduled kickoff the countdown counted to; for that gap the match
     * has no row and a fresh `upcoming` window has already dropped it. Every
     * window is offered: `upcoming` still holds the fixture on the countdown
     * path, `today` holds it on a cold mount inside the gap.
     */
    const held = kickedOff(
      [
        ...(finished.data?.fixtures ?? []),
        ...(upcoming.data?.fixtures ?? []),
        ...(recent.data?.fixtures ?? []),
      ],
      followed,
      now.getTime(),
      seenLive,
    );
    if (held) return boardFromKickoff(held);
    return (
      boardLive(finished.data?.fixtures ?? [], followed, byId) ??
      boardLive(recent.data?.fixtures ?? [], followed, byId)
    );
  })();

  /** The most recent finished match of a followed club, with a score. */
  const last = useMemo(() => {
    if (!hasClubs || !recent.data) return null;
    return lastResult(recent.data.fixtures, followed);
  }, [hasClubs, recent.data, followed]);
  const lastOutcome = last ? boardOutcome(last, followed) : null;
  const lastMatchday = last ? matchday(last.round) : null;

  /**
   * A followed club's fixture that has not kicked off yet.
   *
   * ⚠⚠ **The kickoff test is what keeps a started match out of NEXT UP** (ADR
   * 0078). `upcoming` is deliberately never refetched at kickoff, so its rows
   * outlive their kickoffs by up to fifteen minutes — and without this a
   * match the kicked-off tier is holding, or one that just ended, came back
   * here as "next up" over a countdown reading `00m 00s`. A TBD kickoff is
   * midnight UTC and is never compared (ADR 0029).
   *
   * ⚠ Not memoised, for the same reason `board` is not: it reads the clock.
   */
  const upcomingMine = (() => {
    if (!hasClubs || !upcoming.data) return [];
    const at = now.getTime();
    return upcoming.data.fixtures.filter(
      (f) => involvesFollowed(f, followed) && (f.kickoffTbd || Date.parse(f.kickoffUtc) > at),
    );
  })();

  /** The soonest upcoming match involving a followed club. */
  const next = upcomingMine[0] ?? null;

  const mine = upcomingMine.slice(0, 6);

  const picks = useMemo(() => (teams.data ?? []).slice(0, FOLLOW_PICKS), [teams.data]);

  /**
   * The news card's three stories (ADR 0064). Not memoised for the same
   * reason `board` is not: the 48h cutoff and every age read `now`.
   */
  const newsPick = hasClubs
    ? newsCardPick(selectNewsItems(news.data?.articles ?? [], now, 3), newsSeenAt)
    : null;
  const story = (article: NonNullable<typeof newsPick>['rows'][number]) => ({
    title: plainText(article.title),
    imageUrl: article.imageUrl,
    topic: articleTopic(article),
    publisher: article.publisher.name,
    age: newsAge(article.publishedAt, now),
  });

  /** The losing side recedes; a draw or a missing score mutes nobody. */
  const loses = (mine: number | null, theirs: number | null) =>
    mine !== null && theirs !== null && mine < theirs;

  /** A crest, its monogram fallback and the short name for an upcoming side. */
  const upcomingSide = (team: WindowFixtureView['homeTeam']) => ({
    crest: crestSrc(team?.logoUrls ?? null, team?.logoUrl ?? null, 'small'),
    abbr: team ? abbreviate(team.name, team.slug, team.shortName) : phrases.unknownOpponent,
    name: team ? displayName(team.name) : '—',
  });

  const side = (team: WindowFixtureView['homeTeam'], goals: number | null, muted: boolean) => ({
    name: team ? displayName(team.name) : '—',
    crest: crestSrc(team?.logoUrls ?? null, team?.logoUrl ?? null, 'xsmall'),
    abbr: team ? abbreviate(team.name, team.slug, team.shortName) : phrases.unknownOpponent,
    goals,
    muted,
  });

  /**
   * The in-progress card's props, for whichever of the two paths this is.
   *
   * ⚠ **The goals come from the LIVE row when there is one.** A match that
   * kicked off twenty minutes ago has a `1-0` on `/cronogol/live` and, very
   * often, a `null-null` on the fixture sweep — reading the fixture would hide
   * the score this whole feature exists to show. The sweep's goals are the
   * fallback, not the source of truth, whenever the live row is set.
   *
   * ⚠ `loses()` is reused unchanged and already handles the nulls correctly:
   * both sides stay full when either goal is null, so a pre-kick-off row mutes
   * nobody. A null is never reasoned about as a zero.
   */
  const liveCard = (state: BoardLive) => {
    const { fixture, live: match, source } = state;
    const goalsHome = match ? match.score.home : fixture.goalsHome;
    const goalsAway = match ? match.score.away : fixture.goalsAway;

    // The screen's own instant, so the minute, the stall test and its caption
    // all describe the same moment.
    const checkedAt = now.getTime();
    const stalled = match !== null && isStalled(match, checkedAt);
    const minute = match ? liveMinute(match) : null;

    return {
      // ⚠ The fixture's own id and its two `TeamRef`s, for the events panel
      // (ADR 0050) — the same three the last-result card already passes, and
      // for the same reason: `ScoreSide` below carries no slug, and the panel
      // derives each event's side by comparing one.
      id: fixture.id,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      /**
       * The in-play timeline, straight off the live row (ADR 0051).
       *
       * ⚠⚠ **`undefined` on the sweep path, and that is what selects the other
       * source.** `match?.events` is the whole rule: a LaLiga match in play
       * hands the panel its events — already fetched, on the same poll as the
       * score — while every other league passes `undefined` and the panel falls
       * back to the durable finished-match route exactly as before.
       *
       * ⚠ Do not default this to `[]`. An empty array is a claim that we hold
       * the answer; the sweep path holds nothing and must go and ask.
       */
      suppliedEvents: match?.events,
      home: side(fixture.homeTeam, goalsHome, loses(goalsHome, goalsAway)),
      away: side(fixture.awayTeam, goalsAway, loses(goalsAway, goalsHome)),
      isLive: match !== null,
      // ⚠ The kicked-off tier (ADR 0078): dashes, no minute, no age line, no
      // events — nothing has been reported, and the card must not pretend.
      awaitingUpdate: source === 'kickoff',
      // ⚠ Null on the sweep path, and null for a `status: 'unknown'` row — the
      // score is still true there, the minute is not.
      minute: minute === null ? null : copy.today.minute(minute),
      stalled,
      note:
        source === 'kickoff'
          ? copy.today.kickedOffNote
          : match === null
            ? copy.today.inPlayNote
            : stalled
              ? copy.today.liveStalled(minutesSinceSeen(match, checkedAt))
              : copy.today.liveNote,
      // ⚠ SWEEP path only, and null even there: the fixture route carries no
      // per-row stamp, and our own fetch time would UNDERSTATE the age — the
      // wrong direction for an honesty line.
      lastUpdateAt: null,
    };
  };

  /**
   * The next-up pairing. Its own helper because the crest renders at
   * `Size.crestNext` — `side()` asks for `xsmall`, which is the row weight and
   * blurs at 56pt (ADR 0034).
   */
  const nextSide = (team: WindowFixtureView['homeTeam']) => ({
    ...side(team, null, false),
    crest: crestSrc(team?.logoUrls ?? null, team?.logoUrl ?? null, 'small'),
  });

  /**
   * The club-colour wash behind the next-up card (ADR 0068). `TeamRef` carries
   * no colour, so each side is joined to the club catalogue by slug — the same
   * join `boardFromRoute` makes for the live card's crests. An opponent-only
   * club is not in the catalogue and resolves to nothing, which `pairWash`
   * treats as "no colour on this side".
   */
  const catalogueTeam = (team: WindowFixtureView['homeTeam']) =>
    team ? (teams.data ?? []).find((t) => t.slug === team.slug) ?? null : null;

  return (
    <ScreenScaffold
      title={copy.today.title}
      eyebrow={copy.today.eyebrow(formatWeekdayLong(new Date().toISOString(), zone, phrases))}
      accessory={<AvatarButton initials={initials} onPress={() => router.push('/(sheets)/account')} />}
      // The match in progress IS the crown's payload (ADR 0088): a dark glass
      // plate on the bright band. With nothing live the crown collapses to
      // eyebrow + title, exactly as APP-SHELL asks.
      /**
       * The crown's payload is the screen's LEAD CARD, whichever it is (ADR
       * 0095): the live plate while a match is in play, otherwise NEXT UP. The
       * gradient runs over it either way, so the head of the screen is one
       * object rather than a header with a card under it.
       *
       * ⚠ The two are never both drawn — a live match outranks the fixture it
       * became, and the body's LAST RESULT is what follows either.
       */
      payload={
        !hasClubs ? undefined : board ? (
          <LivePlate {...liveCard(board)} copy={copy.today} events={copy.events} />
        ) : next ? (
          <NextUpCard
            home={nextSide(next.homeTeam)}
            away={nextSide(next.awayTeam)}
            kickoffUtc={next.kickoffUtc}
            kickoffTbd={next.kickoffTbd}
            // ⚠ Its OWN label, not the section header's — the card sat
            // directly above a section with the identical title.
            meta={copy.today.nextUp}
            kickoffLabel={
              next.kickoffTbd ? '--:--' : formatKickoffTime(next.kickoffUtc, zone, clock)
            }
            dateLabel={formatFixtureDate(next.kickoffUtc, zone, phrases)}
            zoneLabel={`${zoneAbbreviation(zone)} · ${copy.today.yourTime}`}
            venue={next.venue}
            wash={pairWash(catalogueTeam(next.homeTeam), catalogueTeam(next.awayTeam))}
            /**
             * Kick-off, announced by the card's own countdown (ADR 0052).
             *
             * ⚠⚠ **Nothing else on this screen knows a match has started.**
             * `todayBounds` and `recentBounds` both END at the instant they
             * were fetched, so a fixture that kicks off after that fetch is in
             * NEITHER window — and `boardLive` tier 1 joins the live row onto a
             * fixture it holds, so with no fixture there is nothing for
             * `/cronogol/live` to upgrade no matter how often it polls. The
             * countdown was already counting to the one moment that fixes it.
             *
             * ⚠⚠ **`upcoming` is deliberately NOT refetched, on two grounds.**
             * Its window starts at `now`, so refetching it drops the match that
             * just kicked off — and until the live row lands (the backend
             * re-reads every ~30s) the screen would replace this card with the
             * match AFTER it, which reads as the fixture having vanished. It is
             * also what keeps this safe: `next` is fed by `upcoming` alone, so
             * nothing here can change `next.kickoffUtc`, re-arm the countdown's
             * guard and loop.
             *
             * ⚠ One shot, not a burst. `useLive` is already polling every 15s
             * while this screen is focused; what it was missing is the fixture
             * to join to, and that arrives with these two.
             */
            onKickoff={() => {
              // ⚠ First, and synchronously: the kicked-off card is built from
              // rows already on screen, so it needs a render, not a response.
              bumpKickoff();
              void finished.refetch();
              void recent.refetch();
              void live.refetch();
            }}
            copy={copy.today}
          />
        ) : undefined
      }
      onRefresh={() => {
        void finished.refetch();
        void upcoming.refetch();
        void recent.refetch();
        void live.refetch();
      }}
      refreshing={finished.isRefetching || upcoming.isRefetching || recent.isRefetching}>
      {/* LAST RESULT follows the crown's lead card (ADR 0095). Suppressed
          while a match is live: the result the reader wants is the one being
          played, and the finished one is a distraction under it. */}
      {hasClubs && !board && last ? (
        <LastResultCard
          // ⚠ The fixture's own id and its two `TeamRef`s, for the events
          // panel (ADR 0045). `ScoreSide` carries no slug, and the panel
          // derives each event's side by comparing one.
          id={last.id}
          homeTeam={last.homeTeam}
          awayTeam={last.awayTeam}
          home={side(last.homeTeam, last.goalsHome, loses(last.goalsHome, last.goalsAway))}
          away={side(last.awayTeam, last.goalsAway, loses(last.goalsAway, last.goalsHome))}
          meta={[
            lastMatchday !== null ? copy.today.md(lastMatchday) : null,
            formatFixtureDate(last.kickoffUtc, zone, phrases),
          ]
            .filter(Boolean)
            .join(' · ')}
          outcome={lastOutcome ? phrases.formLetters[lastOutcome] : null}
          copy={copy.today}
          events={copy.events}
        />
      ) : null}

      {/* ⚠ Under the match, above the rest of the round: scores first, always.
          A headline is never why someone opened this app (ADR 0064). */}
      {newsPick?.lead ? (
        <NewsCard
          lead={story(newsPick.lead)}
          rows={newsPick.rows.map(story)}
          newLabel={newsPick.newCount > 0 ? copy.news.newCount(newsPick.newCount) : null}
          title={copy.news.title}
          allNews={copy.news.allNews}
          onPress={() => router.push('/news')}
        />
      ) : null}

      <SectionHeader
        title={copy.today.finishedToday}
        meta={
          finished.data
            ? phrases.matches(finished.data.fixtures.filter((f) => f.status === 'finished').length)
            : null
        }
      />

      {finished.isPending ? (
        <SkeletonRows count={3} height={Size.rowSkeleton} />
      ) : finished.data && finished.data.fixtures.some((f) => f.status === 'finished') ? (
        <>
          <FinishedToday
            window={finished.data}
            eventsCopy={copy.events}
          />
          <Text variant="footnote" color="textFaint">
            {copy.today.settleNote}
          </Text>
        </>
      ) : (
        <Text variant="body" color="textDim">
          {copy.today.quiet}
        </Text>
      )}

      {hasClubs && mine.length > 0 ? (
        <>
          {/* ⚠ Plain, no count: the accent in this section belongs to the day
              word on today's card, and the count restates six visible cards. */}
          <SectionHeader title={copy.today.upcoming} />
          <View style={styles.upcoming}>
            {/* ⚠ One `now` for the whole section: read per card, a render that
                straddles midnight would date two of them off different days. */}
            {mine.map((fixture) => {
              // The row is read from the followed club's bench (ADR 0029) —
              // for the tap target and the home/away fallback, not the order:
              // the sides stay home-first, the way the match is named.
              const row = upcomingRow(fixture, followed);
              if (!row) return null;
              const md = matchday(fixture.round) ?? fixture.matchweek;
              // ⚠ `venue` is null on plenty of rows. Where the ground is
              // unknown, saying which end of it you are on is still a fact.
              const location =
                fixture.venue ?? (row.isHome ? copy.today.homeWord : copy.today.awayWord);
              // ⚠ A TBD kickoff is stored as midnight UTC — `formatRelativeDay`
              // must never see one, or it claims "tonight" for a match that has
              // no kickoff at all (ADR 0029). Those cards just lose the word.
              const relative = fixture.kickoffTbd
                ? null
                : formatRelativeDay(fixture.kickoffUtc, zone, now, copy.today, phrases);

              return (
                <UpcomingCard
                  key={fixture.id}
                  home={upcomingSide(fixture.homeTeam)}
                  away={upcomingSide(fixture.awayTeam)}
                  meta={[md !== null ? copy.today.md(md) : null, location]
                    .filter(Boolean)
                    .join(' · ')}
                  // ⚠ Today only. `formatRelativeDay` also names tomorrow, and
                  // that word is deliberately dropped here (ADR 0043) — the
                  // date under the kickoff already carries it.
                  todayLabel={relative?.tone === 'accent' ? relative.label : null}
                  kickoffLabel={
                    fixture.kickoffTbd ? '--:--' : formatKickoffTime(fixture.kickoffUtc, zone, clock)
                  }
                  dateLabel={formatFixtureDate(fixture.kickoffUtc, zone, phrases)}
                  onPress={() =>
                    router.push({ pathname: '/club/[slug]', params: { slug: row.club.slug } })
                  }
                />
              );
            })}
          </View>
        </>
      ) : null}

      {/**
       * The two stat tiles (SPEC §3.1 item 4).
       *
       * ⚠ Gated on `hasClubs` ALONE, not on the upcoming section above it. A
       * reader who follows clubs but has no fixtures in the window — an
       * international break, or the gap between seasons — still follows those
       * clubs, and the tiles are how they get back to them. Tying these to
       * `mine.length` would make the shortcuts vanish exactly when the screen is
       * emptiest and they are most useful.
       *
       * ⚠ **Both tiles show the SAME NUMBER, deliberately.** A calendar feed is
       * derived 1:1 from a followed club here (ADR 0019/0038) — there are no
       * claimed or subset feeds — so the counts cannot disagree. The tiles earn
       * their place on their DESTINATIONS, not on the arithmetic. If that ever
       * reads as a bug to a real user, drop the second one rather than inventing
       * a number for it.
       */}
      {hasClubs ? (
        <View style={styles.tiles}>
          <StatTile
            value={followed.length}
            label={copy.today.tileClubs}
            accessibilityLabel={`${followed.length} ${copy.today.tileClubs}`}
            onPress={() => router.push('/clubs')}
          />
          <StatTile
            value={followed.length}
            label={copy.today.tileFeeds}
            accessibilityLabel={`${followed.length} ${copy.today.tileFeeds}`}
            onPress={() => router.push('/(sheets)/account')}
          />
        </View>
      ) : null}

      {/* ⚠ The no-subscriptions state: the follow card REPLACES the board. */}
      {!hasClubs ? (
        <View style={styles.follow}>
          <Text variant="title3">{copy.today.followTitle}</Text>
          <Text variant="body" color="textDim">
            {copy.today.followBody}
          </Text>

          <View style={styles.grid}>
            {picks.map((team) => (
              <Pressable
                key={team.slug}
                onPress={() =>
                  router.push({ pathname: '/club/[slug]', params: { slug: team.slug } })
                }
                style={styles.pick}>
                <Crest
                  src={crestSrc(team.logoUrls, team.logoUrl, 'small')}
                  fallback={abbreviate(team.name, team.slug, team.shortName)}
                  size={Size.crestList}
                />
                <Text variant="callout" numberOfLines={1} style={styles.pickName}>
                  {displayName(team.name)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button
            label={copy.today.browseAll}
            onPress={() => router.push('/clubs')}
          />
        </View>
      ) : null}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  // ⚠ Each fixture draws its own surface (ADR 0043); this only spaces them.
  upcoming: { gap: Spacing.three },
  // ⚠ The gap is the only thing separating the two tiles — they share a fill
  // colour, so a zero gap reads as one wide tile with two numbers in it.
  tiles: { flexDirection: 'row', gap: Spacing.two },
  follow: {
    // Glass (ADR 0087); the accent ring stays — it is this card's identity.
    backgroundColor: Colors.dark.glassFill,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.dark.accentRing,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '48%',
    ...Surfaces.glass,
    borderRadius: Radius.tile,
    padding: Spacing.three,
  },
  pickName: { flex: 1, minWidth: 0 },
});
