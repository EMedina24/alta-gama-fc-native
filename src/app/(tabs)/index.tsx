/**
 * The Today board.
 *
 * ⚠ With nothing followed the live/last/next cards are SUPPRESSED and the follow
 * card carries the screen — there is no "your" match to lead with. That is the
 * design's own rule (SPEC §3.1), and it is why this screen is fully buildable
 * before push exists: it is exactly what a new user sees.
 */
import { useFocusEffect, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Check,
  ChipButton,
  competitionMarkKind,
  Crest,
  Eyebrow,
  FadeOutImage,
  PencilGlyph,
  PlusGlyph,
  SkeletonRows,
  Text,
} from '@/components/atoms';
import { SectionHeader, StatTile, UpcomingCard } from '@/components/molecules';
import { FinishedToday } from '@/components/organisms/finished-today';
import { LiveCarousel } from '@/components/organisms/live-carousel';
import { LivePlate } from '@/components/organisms/live-plate';
import { LastResultCard } from '@/components/organisms/last-result-card';
import { NextUpCard } from '@/components/organisms/next-up-card';
import { NextUpCarousel } from '@/components/organisms/next-up-carousel';
import { NewsCard } from '@/components/organisms/news-card';
import { BoardStack, type BoardSection, type EditPanelTile } from '@/components/organisms/board-stack';
import { ART_MARK, AvatarButton, ScreenScaffold } from '@/components/templates/screen-scaffold';
import { useIdentityInitials } from '@/features/auth/use-identity';
import { applyWidgetLive } from '@/features/widgets/live';
import {
  BoardEdit,
  Colors,
  CrownArt,
  CrownClubArt,
  CrownClubHead,
  CrownRamp,
  Radius,
  Size,
  Spacing,
  Surfaces,
} from '@/constants/theme';
import { decodeBoardBackground } from '@/lib/board-background';
import {
  applyVisibleOrder,
  BUILT_COUNT,
  trayCards,
  visibleCards,
  type BoardCardId,
} from '@/lib/board-layout';
import {
  boardOutcome,
  involvesFollowed,
  lastResult,
  nextUpDeck,
  upcomingRow,
} from '@/lib/cronogol/board';
import { clubTint } from '@/lib/cronogol/club-wash';
import {
  boardLives,
  isStalled,
  liveById,
  liveMinute,
  minutesSinceSeen,
  type BoardLive,
} from '@/lib/cronogol/live';
import { abbreviate, crestSrc, displayName, matchday } from '@/lib/cronogol/derive';
import { clubCrownTheme, leagueCrownTheme } from '@/lib/cronogol/league-theme';
import { findLeague, LEAGUES } from '@/lib/cronogol/leagues';
import { upcomingBounds } from '@/lib/cronogol/fixture-window';
import { matchEventsCapable, mergeWindows, sliceWindow } from '@/lib/cronogol/team-window';
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
import { useCanOpenClub, useTeams } from '@/queries/use-teams';
import { useLive } from '@/queries/use-live';
import { useNews } from '@/queries/use-news';
import { useTeamWindows } from '@/queries/use-team-windows';
import {
  BOARD_AHEAD_DAYS,
  useFinishedToday,
  useRecent,
  useWidgetWindow,
} from '@/queries/use-today';
import { clubOption, defaultOption, leagueOption, type BackgroundOption } from '@/features/board/background-options';
import { hapticToggle } from '@/lib/haptics';
import { setBoardEditing, useBoardEditing } from '@/store/board-edit';
import {
  resetBoard,
  setBoardBackground,
  setBoardCardHidden,
  setBoardOrder,
  usePreferences,
  useZone,
} from '@/store/preferences';

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
  const { followed, clock, newsSeenAt, bdOrder, bdHidden, bdBg } = usePreferences();

  const finished = useFinishedToday(zone);
  // ⚠ The widget's 21-day window, not `useUpcoming`'s seven (ADR 0192): an
  // international break must not empty NEXT UP and the upcoming list. The SAME
  // query `PushSync` already holds — a cache read, no new request.
  const upcoming = useWidgetWindow(zone);
  const recent = useRecent(zone);
  /**
   * The followed clubs' OWN schedules — cups, European ties, segunda (ADR
   * 0132). The window routes above are league-scoped by design and can carry
   * none of those, which is how a Champions League tie went missing from NEXT
   * UP. Merged UNDER the window rows at every consumer below (dedupe by
   * fixture id, window wins), so for pure-league data nothing changes.
   */
  const teamWindows = useTeamWindows(zone, followed);
  const teamRows = teamWindows.rows;
  const teams = useTeams();
  const canOpenClub = useCanOpenClub();
  // ⚠ The SAME query `PushSync` already holds for the widget — a cache read.
  const news = useNews();

  const hasClubs = followed.length > 0;

  /**
   * Whether the board is being ARRANGED (ADR 0174).
   *
   * ⚠ Screen state, never persisted: the layout survives a relaunch, the mode
   * does not. A reader who leaves the tab mid-edit is not editing when they come
   * back — nothing is pending, because every change committed as it was made.
   *
   * ⚠ `boardEdit` opens straight into it, `__DEV__` only — the design
   * prototype's own QA hook, and what makes the mode screenshot-able without a
   * tap (`altagamafc://(tabs)?boardEdit=1`).
   */
  const params = useLocalSearchParams<{ boardEdit?: string }>();
  const forcedEdit = __DEV__ && params.boardEdit === '1';
  // ⚠ In a STORE since ADR 0199, not `useState`: the tab layout reads it to hide
  // the tab bar while editing (the kit's), and NativeTabs sits above this screen.
  const edited = useBoardEditing();
  // ⚠ DERIVED, not copied into state by an effect (trap 72: if two pieces of
  // state must agree, compute one from the other). A `useState` initialiser
  // would read the param on MOUNT only, and this tab is already mounted when the
  // deep link arrives — which is exactly the case the hook exists for.
  const editing = edited || forcedEdit;
  const setEditing = (on: boolean) => {
    setBoardEditing(on);
    // ⚠ DONE has to be able to close a mode the URL opened, so it clears the
    // param rather than fighting it.
    if (!on && forcedEdit) router.setParams({ boardEdit: undefined });
  };
  /**
   * ⚠ Leaving the screen LEAVES the mode (ADR 0199). With the tab bar hidden
   * while editing, a blur that kept the store's flag up would strand the next
   * screen without its tabs. The cleanup runs on blur and on unmount alike.
   */
  useFocusEffect(useCallback(() => () => setBoardEditing(false), []));

  /**
   * The page, handed to the editor so a held card can scroll it (ADR 0174).
   *
   * ⚠ A ref for the offset, not state: it is written on every scroll frame and
   * read only by the auto-scroll loop, so a re-render per frame would buy
   * nothing and cost the whole screen.
   */
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollOffset = useRef(0);
  const [dragging, setDragging] = useState(false);
  const insets = useSafeAreaInsets();
  const dragScroll = {
    ref: scrollRef,
    offset: scrollOffset,
    top: insets.top + BoardEdit.edge,
  };

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
   * The in-play matches of followed clubs, and whether each is genuinely
   * live — earliest kickoff first. One is the solo plate; two-plus stack as
   * the LIVE DECK (ADR 0126).
   *
   * ⚠⚠ **Tier 0 reads `/cronogol/live` ALONE** (ADR 0066). The route carries
   * our own slugs on both sides, so a followed club's in-play match needs NO
   * fixture window behind it — crests come from the club catalogue by slug.
   * This is what makes the card independent of the windows, which both end at
   * `now` and were the reason the card never appeared at a real kickoff
   * (Levante v Betis, 2026-08-29; HANDOFF trap 39).
   *
   * ⚠⚠ **The tiers MERGE rather than cascade** (ADR 0126, reversing the
   * single-winner rule of 0066/0078): a match thirty seconds past its whistle
   * stacks BEHIND the one already at 67′ instead of vanishing under it, and a
   * sweep-flagged match of a league the route does not cover stays on the
   * board while a LaLiga match is live. `boardLives` owns the union, the
   * dedupe and the order; `held` gets every window for 0078's reason —
   * `upcoming` still holds a fixture on the countdown path, `today` on a cold
   * mount inside the whistle gap — and `swept` keeps the old `finished`-then-
   * `recent` window preference as first-occurrence-wins.
   *
   * ⚠ Not memoised, deliberately: the age cutoff reads the clock, so a
   * `useMemo` would need `now` in its deps and recompute on every render
   * regardless. Filters and sorts over one window of fixtures are cheaper
   * than pretending otherwise.
   */
  const boards: BoardLive[] = !hasClubs
    ? []
    : boardLives({
        byId: liveById(live.data?.matches ?? [], now.getTime()),
        followed,
        teams: teams.data ?? [],
        // ⚠ Team rows come LAST in both: the internal first-occurrence dedupes
        // keep the window rows' full TeamRefs winning. In `held` they are what
        // lets a kicked-off cup tie hold the crown (the windows cannot carry
        // it); in `swept` they are what gives a sweep-flagged live cup match
        // the tier-2 card with its age caption — the same treatment a club
        // outside the live route's coverage gets today (ADR 0132).
        held: [
          ...(finished.data?.fixtures ?? []),
          ...(upcoming.data?.fixtures ?? []),
          ...(recent.data?.fixtures ?? []),
          ...teamRows,
        ],
        swept: [...(finished.data?.fixtures ?? []), ...(recent.data?.fixtures ?? []), ...teamRows],
        now: now.getTime(),
        seenLive,
      });

  /**
   * The most recent finished match of a followed club, with a score.
   *
   * ⚠ Team rows join UNSLICED, on two constructions rather than a clock read
   * (which would cost the memo): their back edge IS the recent band's edge —
   * `TEAM_WINDOW_BACK_DAYS` is `RECENT_DAYS`, both local midnight — and their
   * 21-day forward reach contributes nothing here because `lastResult` only
   * reads `finished` rows with goals.
   */
  const last = useMemo(() => {
    if (!hasClubs || !recent.data) return null;
    return lastResult(mergeWindows(recent.data.fixtures, teamRows), followed);
  }, [hasClubs, recent.data, teamRows, followed]);
  const lastOutcome = last ? boardOutcome(last, followed) : null;
  const lastMatchday = last ? matchday(last.round) : null;
  /** The cup lockup for the LAST RESULT meta row (ADR 0133), when we hold one. */
  const lastMark =
    last && last.competition !== 'league' ? competitionMarkKind(last.competitionName) : null;

  /**
   * The LAST RESULT card's meta line — `MD 3 · Sun 13 Sep`.
   *
   * ⚠ Hoisted out of the JSX because the EDITOR's row uses it too (ADR 0174):
   * this card has no count to summarise, and the line that dates the result is
   * the honest answer to "what is on this card". Two renderings of one string,
   * never two constructions of it.
   *
   * ⚠ A non-league result names its competition where a league one says the
   * matchday (ADR 0132) — "MD 1" for a Champions League jornada reads as
   * LaLiga's. With a LOCKUP on file the card draws that instead and the meta
   * carries the date alone (ADR 0133).
   */
  const lastMeta = !last
    ? null
    : [
        last.competition !== 'league'
          ? lastMark
            ? null
            : last.competitionName
          : lastMatchday !== null
            ? copy.today.md(lastMatchday)
            : null,
        formatFixtureDate(last.kickoffUtc, zone, phrases),
      ]
        .filter(Boolean)
        .join(' · ');

  /**
   * How many of today's matches have actually finished — the FINISHED TODAY
   * section's count, and the editor row's summary. ⚠ One construction: it was
   * written out twice in the JSX and a third time would have been the drift.
   */
  const finishedCount =
    finished.data?.fixtures.filter((f) => f.status === 'finished').length ?? 0;

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
    // ⚠⚠ Team rows are SLICED to the upcoming band before merging, and the
    // slice is a bug guard, not tidiness (ADR 0132): the team window reaches
    // 14 days BACK, and a past TBD row would sail through the `kickoffTbd ||`
    // half of the predicate below into the deck as a `--:--` card for a match
    // long over. The far edge is the board's 21 days (ADR 0192), the same
    // band the window above asks for.
    const { from: upFrom, to: upTo } = upcomingBounds(now, zone, BOARD_AHEAD_DAYS);
    const merged = mergeWindows(
      upcoming.data.fixtures,
      sliceWindow(teamRows, Date.parse(upFrom), Date.parse(upTo)),
    );
    return (
      merged
        .filter(
          (f) => involvesFollowed(f, followed) && (f.kickoffTbd || Date.parse(f.kickoffUtc) > at),
        )
        // ⚠ A real sort, not trust in concatenation order: `deck[0]` must be the
        // soonest kickoff whichever route served it. Stable, so pure-league data
        // keeps the window route's exact order.
        .sort((a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc))
    );
  })();

  /**
   * The crown DECK (ADR 0113): every fixture sharing the soonest kickoff's
   * calendar day in the reader's zone. `deck[0]` is `upcomingMine[0]` by
   * construction, so the single-card path and every kickoff contract below
   * read exactly the fixture they always did. Not memoised — its input isn't.
   */
  const deck = nextUpDeck(upcomingMine, zone);

  /** The soonest upcoming match involving a followed club. */
  const next = deck[0] ?? null;

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
   * One NEXT UP card's props — the single card and every deck layer share this
   * builder verbatim (ADR 0113), so a deck card can never drift from the card
   * it generalises.
   */
  const nextCardProps = (fixture: WindowFixtureView) => ({
    id: fixture.id,
    home: nextSide(fixture.homeTeam),
    away: nextSide(fixture.awayTeam),
    kickoffUtc: fixture.kickoffUtc,
    kickoffTbd: fixture.kickoffTbd,
    // ⚠ Its OWN label, not the section header's — the card sat directly
    // above a section with the identical title. A non-league match names its
    // competition beside it (ADR 0132, Ed's call) — as the LOCKUP where we
    // hold one (ADR 0133: the spelled name truncated the venue), and the
    // provider's proper noun verbatim where we do not, so a new competition
    // degrades to text rather than to silence.
    mark: fixture.competition !== 'league' ? competitionMarkKind(fixture.competitionName) : null,
    meta:
      fixture.competition !== 'league' &&
      fixture.competitionName &&
      competitionMarkKind(fixture.competitionName) === null
        ? `${copy.today.nextUp} · ${fixture.competitionName}`
        : copy.today.nextUp,
    kickoffLabel: fixture.kickoffTbd ? '--:--' : formatKickoffTime(fixture.kickoffUtc, zone, clock),
    dateLabel: formatFixtureDate(fixture.kickoffUtc, zone, phrases),
    zoneLabel: `${zoneAbbreviation(zone)} · ${copy.today.yourTime}`,
    venue: fixture.venue,
    /**
     * Kick-off, announced by the card's own countdown (ADR 0052).
     *
     * ⚠⚠ **Nothing else on this screen knows a match has started.**
     * `todayBounds` and `recentBounds` both END at the instant they were
     * fetched, so a fixture that kicks off after that fetch is in NEITHER
     * window — and `boardLive` tier 1 joins the live row onto a fixture it
     * holds, so with no fixture there is nothing for `/cronogol/live` to
     * upgrade no matter how often it polls. The countdown was already
     * counting to the one moment that fixes it.
     *
     * ⚠⚠ **`upcoming` is deliberately NOT refetched, on two grounds.** Its
     * window starts at `now`, so refetching it drops the match that just
     * kicked off — and until the live row lands (the backend re-reads every
     * ~30s) the screen would replace this card with the match AFTER it,
     * which reads as the fixture having vanished. It is also what keeps this
     * safe: `next` and the deck are fed by `upcoming` alone, so nothing here
     * can change `kickoffUtc`, re-arm the countdown's guard and loop.
     *
     * ⚠ One shot, not a burst. `useLive` is already polling every 15s while
     * this screen is focused; what it was missing is the fixture to join to,
     * and that arrives with these two.
     *
     * ⚠ EVERY deck card carries this, hidden ones included (ADR 0113): a
     * card at the back of the stack is still the only observer of its own
     * kickoff. Two same-second kickoffs firing twice is harmless — the
     * refetches dedupe in flight and the bump is idempotent.
     */
    onKickoff: () => {
      // ⚠ First, and synchronously: the kicked-off card is built from rows
      // already on screen, so it needs a render, not a response.
      bumpKickoff();
      void finished.refetch();
      void recent.refetch();
      void live.refetch();
      // ⚠ Safe where `upcoming` is not (ADR 0132): this window starts 14 days
      // back, so a refetch cannot drop the match that just kicked off — and
      // for a cup tie it is the ONLY feed that will ever flip the status.
      teamWindows.refetch();
    },
  });

  /**
   * The Board's CARDS, resolved — the screen still decides what each one says
   * and whether it has anything to say; the reader decides what order they come
   * in and which of them it draws at all (ADR 0174).
   *
   * ⚠⚠ **A `null` here means "nothing to draw today", not "put away".** The two
   * are different facts and only one of them is the reader's: an ineligible card
   * is absent from the stack AND from the editor's rows, because a slot that is
   * not on screen cannot be dragged to — while a card the reader removed sits in
   * the add tray, one tap from coming back.
   *
   * ⚠ The LEAD card is not in here at all: live and NEXT UP are the crown's
   * payload (ADR 0088/0095) and are PINNED — the match being played is the
   * reason this screen exists on a matchday and is not the reader's to move.
   * That is why the catalogue has no `next` card, against the handoff's eight.
   */
  const cards: Partial<Record<BoardCardId, ReactNode>> = {
    /* LAST RESULT follows the crown's lead card (ADR 0095). Suppressed
        while any match is live: the result the reader wants is the one being
        played, and the finished one is a distraction under it. */
    last:
      hasClubs && boards.length === 0 && last ? (
        <LastResultCard
          // ⚠ The fixture's own id and its two `TeamRef`s, for the events
          // panel (ADR 0045). `ScoreSide` carries no slug, and the panel
          // derives each event's side by comparing one.
          id={last.id}
          homeTeam={last.homeTeam}
          awayTeam={last.awayTeam}
          home={side(last.homeTeam, last.goalsHome, loses(last.goalsHome, last.goalsAway))}
          away={side(last.awayTeam, last.goalsAway, loses(last.goalsAway, last.goalsHome))}
          mark={lastMark}
          meta={lastMeta ?? ''}
          outcome={lastOutcome ? phrases.formLetters[lastOutcome] : null}
          copy={copy.today}
          events={copy.events}
          // ⚠ The league's capability, off the fixture's own `leagueSlug` (the
          // API slug). A league that never publishes events loses the
          // disclosure rather than opening it on copy that says "not yet" —
          // and so does a cup tie, until the events sweep is proven to reach
          // one (`matchEventsCapable`, ADR 0132).
          matchEvents={matchEventsCapable(last)}
        />
      ) : null,

    /* ⚠ Under the match, above the rest of the round: scores first, always.
        A headline is never why someone opened this app (ADR 0064). */
    news: newsPick?.lead ? (
      <NewsCard
        lead={story(newsPick.lead)}
        rows={newsPick.rows.map(story)}
        newLabel={newsPick.newCount > 0 ? copy.news.newCount(newsPick.newCount) : null}
        title={copy.news.title}
        allNews={copy.news.allNews}
        onPress={() => router.push('/news')}
      />
    ) : null,

    results: (
      <>
        <SectionHeader
          title={copy.today.finishedToday}
          meta={finished.data ? phrases.matches(finishedCount) : null}
        />

        {finished.isPending ? (
          <SkeletonRows count={3} height={Size.rowSkeleton} />
        ) : finished.data && finishedCount > 0 ? (
          <>
            <FinishedToday
              window={finished.data}
              eventsCopy={copy.events}
              // A crest opens its club, when it has a page (ADR 0191).
              onOpenClub={(slug) => router.push({ pathname: '/club/[slug]', params: { slug } })}
              canOpenClub={canOpenClub}
              openClubLabel={copy.clubLink.open}
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
      </>
    ),

    upcoming:
      hasClubs && mine.length > 0 ? (
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
                  // ⚠ A non-league row names its competition where a league
                  // one says the matchday (ADR 0132) — same rule as the
                  // last-result card, for the same ambiguity.
                  meta={[
                    fixture.competition !== 'league'
                      ? fixture.competitionName
                      : md !== null
                        ? copy.today.md(md)
                        : null,
                    location,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  // ⚠ Today only. `formatRelativeDay` also names tomorrow, and
                  // that word is deliberately dropped here (ADR 0043) — the
                  // date under the kickoff already carries it.
                  todayLabel={relative?.tone === 'accent' ? relative.label : null}
                  kickoffLabel={
                    fixture.kickoffTbd
                      ? '--:--'
                      : formatKickoffTime(fixture.kickoffUtc, zone, clock)
                  }
                  dateLabel={formatFixtureDate(fixture.kickoffUtc, zone, phrases)}
                  onPress={() =>
                    router.push({
                      pathname: '/club/[slug]',
                      params: { slug: row.club.slug },
                    })
                  }
                />
              );
            })}
          </View>
        </>
      ) : null,

    /**
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
     */
    counters: hasClubs ? (
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
    ) : null,
  };

  /**
   * What each card is HOLDING, for the editor's rows (ADR 0174) — the line under
   * the name that answers "what do I lose if I take this off".
   *
   * ⚠ Every one of these already existed on this screen; none of them is a new
   * query and none is a new copy key — `phrases.stories`/`matches`/`clubs` are
   * the counted phrases the rest of the app uses, so Spanish agreement is
   * already handled (`partido` masculine, `noticia` feminine).
   *
   * ⚠ LAST RESULT has no count, so it takes the card's own meta line — the date
   * it was played. A fabricated "1 match" there would be a number pretending to
   * be information.
   */
  const summaries: Partial<Record<BoardCardId, string>> = {
    last: lastMeta ?? undefined,
    // ⚠ `1 +`: the lead IS a story. `rows` is what sits under it.
    news: newsPick?.lead ? phrases.stories(1 + newsPick.rows.length) : undefined,
    results: phrases.matches(finishedCount),
    upcoming: phrases.matches(mine.length),
    counters: phrases.clubs(followed.length),
  };

  /** The reader's arrangement. ⚠ Already normalised — `parse` does it on read. */
  const layout = { order: bdOrder, hidden: bdHidden };

  /**
   * The board's BACKGROUND (ADR 0175), resolved per render — never state
   * (trap 72). Three shapes:
   *
   *  - `default` → the brand crown; no `tintLeague`, no override.
   *  - `league:{slug}` → the league's own deep crown via `tintLeague`, exactly
   *    the Matchdays/Table path — bundled mark and all.
   *  - `club:{slug}` → `crownOverride`: the club's colour on the deep ladder
   *    and its crest bled through `FadeOutImage`, `CrownClubArt`'s numbers.
   *
   * ⚠ A club slug the catalogue cannot answer YET (query loading, offline) or
   * ANY MORE (club dropped) renders the brand default and NEVER rewrites the
   * stored pick — a transient network failure must not destroy it.
   */
  const bgChoice = decodeBoardBackground(bdBg);
  const bgTeam =
    bgChoice.kind === 'club'
      ? ((teams.data ?? []).find((team) => team.slug === bgChoice.slug) ?? null)
      : null;
  const bgLeague = bgChoice.kind === 'league' ? findLeague(bgChoice.slug) : undefined;
  /** Re-derived for the avatar's ink and the edit row's swatch — same inputs
   *  the scaffold themes from, so the two cannot disagree. */
  const bgTheme = bgTeam
    ? clubCrownTheme(clubTint(bgTeam))
    : leagueCrownTheme(bgLeague?.apiSlug ?? null);
  const bgCrest = bgTeam ? crestSrc(bgTeam.logoUrls, bgTeam.logoUrl, 'hero') : null;
  /** The day line — the scaffold's eyebrow, and every wallpaper head's one line. */
  const eyebrowText = copy.today.eyebrow(
    formatWeekdayLong(new Date().toISOString(), zone, phrases),
  );
  /**
   * The reduced head every WALLPAPER wears (ADR 0180, widened on Ed's report
   * — a league pick reverting to the full title read as a bug, not a scope):
   * the DAY LINE alone, in the STRONG ink (the words sit ON the mark, and
   * the dim family fails AA over the club crest — `CrownClubHead`'s
   * docblock). Fixed height so the lead card's position never moves with
   * the text; the label still names what the mark states only visually.
   */
  const bgHead = (name: string) => (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${name} · ${eyebrowText}`}
      style={{ height: CrownClubHead.size }}>
      <Eyebrow color="onDeep">{eyebrowText}</Eyebrow>
    </View>
  );
  /** The league mark, head-left — the same drawn atom the league screens bleed
   *  at the right, `CrownArt`'s own sizing. */
  const BgMark = !bgTeam && bgLeague && bgTheme.art ? ART_MARK[bgTheme.art] : null;
  /**
   * The wallpaper's crown furniture (ADR 0180): "MONDAY / Board" steps aside
   * and the pick's mark takes its place — the club crest as the bled
   * translucent watermark (0175's style, 0177/0178's tuning), or the
   * league's drawn mark at its own alpha — anchored head-LEFT and running
   * down behind the lead card. The brand default keeps the full title.
   */
  const crownOverride = bgTeam
    ? {
        theme: bgTheme,
        artAnchor: 'headLeft' as const,
        art: bgCrest ? (
          <FadeOutImage
            uri={bgCrest}
            size={CrownRamp * CrownClubArt.height}
            fadeFrom={CrownClubArt.fadeFrom}
            fadeTo={CrownClubArt.fadeTo}
            bands={CrownClubArt.bands}
            style={{ opacity: CrownClubArt.alpha }}
          />
        ) : undefined,
        head: bgHead(displayName(bgTeam.name)),
      }
    : bgLeague
      ? {
          theme: bgTheme,
          artAnchor: 'headLeft' as const,
          art:
            BgMark && bgTheme.art ? (
              <BgMark height={CrownRamp * CrownArt.height[bgTheme.art]} alpha={CrownArt.alpha} />
            ) : undefined,
          head: bgHead(bgLeague.name),
        }
      : undefined;
  /**
   * The edit panel's background tiles (ADR 0199) — the common picks, with the
   * full catalogue behind the last one. Built HERE because the league marks
   * live with the scaffold (a template the panel may not import).
   *
   * The brand default, the reader's own clubs, then every league; the current
   * pick is slotted in after the default if it is none of those (a club chosen
   * from the full sheet), so the selection is always on the strip.
   */
  const followedTeams = followed.flatMap((slug) => {
    const team = (teams.data ?? []).find((t) => t.slug === slug);
    return team ? [team] : [];
  });
  const bgOptions: BackgroundOption[] = [
    defaultOption(copy.board.backgroundDefault, bdBg),
    ...followedTeams.map((team) => clubOption(team, bdBg)),
    ...LEAGUES.map((league) => leagueOption(league, bdBg)),
  ];
  if (bgTeam && !bgOptions.some((option) => option.selected)) {
    bgOptions.splice(1, 0, clubOption(bgTeam, bdBg));
  }
  const tileMark = (option: BackgroundOption): ReactNode => {
    if (option.crestFallback !== undefined) {
      return (
        <View style={{ opacity: BoardEdit.tileMarkAlpha }}>
          <Crest src={option.crest} fallback={option.crestFallback} size={BoardEdit.tileMark} />
        </View>
      );
    }
    if (option.art) {
      const Mark = ART_MARK[option.art];
      return <Mark height={BoardEdit.tileMark} alpha={BoardEdit.tileMarkAlpha} />;
    }
    return undefined;
  };
  const bgTiles: EditPanelTile[] = [
    ...bgOptions.map((option) => ({
      key: option.id,
      label: option.label,
      stops: option.stops,
      mark: tileMark(option),
      markSide: option.art ? ('right' as const) : ('left' as const),
      selected: option.selected,
      accessibilityLabel: copy.board.backgroundTile(option.label),
      onPress: () => {
        void hapticToggle();
        setBoardBackground(option.id);
      },
    })),
    {
      key: 'more',
      label: copy.board.more,
      icon: <PlusGlyph color="textSecondary" size={Size.moreGlyph} />,
      accessibilityLabel: copy.board.more,
      onPress: () => router.push('/(sheets)/board-background'),
    },
  ];

  /** What the body draws, in the reader's order: on the board, and eligible. */
  const sections = visibleCards(layout).flatMap<BoardSection>((id) => {
    const node = cards[id];
    return node == null ? [] : [{ id, node, summary: summaries[id] ?? null }];
  });

  /**
   * The crown's payload: the screen's LEAD CARD, whichever it is (ADR 0095) —
   * the live plate while a match is in play, otherwise NEXT UP, as a single card
   * or as the same-day DECK of them (ADR 0113).
   *
   * ⚠⚠ **PINNED.** It is the one panel edit mode cannot touch (ADR 0174): no
   * handle, no remove, no slot in the order. The match being played is the
   * reason the screen exists on a matchday, and the crown is not a place a card
   * can be dragged to.
   */
  const lead = !hasClubs ? undefined : boards.length > 1 ? (
    <LiveCarousel
      key={boards.map((b) => b.fixture.id).join('|')}
      cards={boards.map(liveCard)}
      copy={copy.today}
      events={copy.events}
    />
  ) : boards.length === 1 ? (
    <LivePlate {...liveCard(boards[0])} copy={copy.today} events={copy.events} />
  ) : deck.length > 1 ? (
    <NextUpCarousel
      key={`${zone}:${deck.map((f) => f.id).join('|')}`}
      cards={deck.map(nextCardProps)}
      copy={copy.today}
    />
  ) : next ? (
    <NextUpCard {...nextCardProps(next)} copy={copy.today} />
  ) : undefined;

  return (
    <ScreenScaffold
      title={copy.today.title}
      eyebrow={eyebrowText}
      // The reader's background (ADR 0175/0180): every wallpaper — club or
      // league — travels as a crownOverride now; the brand default passes
      // nothing and keeps the bright crown.
      crownOverride={crownOverride}
      // ⚠ Only under a wallpaper — paired with `CrownClubHead.size` (see its
      // docblock): the lead card sits 20pt lower, the body does not.
      crownPadBottom={crownOverride ? CrownClubHead.padBottom : undefined}
      /**
       * The crown's top-right slot (ADR 0174).
       *
       * ⚠ While editing, DONE owns it ALONE — the avatar steps aside rather
       * than sitting beside a second pill, which is the design's call and the
       * only way both fit on a 375pt head.
       *
       * ⚠ No EDIT chip with nothing followed: the follow card REPLACES the
       * board there, so there is no arrangement to make.
       */
      accessory={
        editing ? (
          // ⚠ `pulse` is the way OUT of a mode that has no other one: with the
          // avatar stood down, this pill is the only control in the crown, and a
          // reader who does not find it is stuck (ADR 0174 §13). It is also the
          // app's third looping animation — see `Pulse`.
          // ADR 0199: the kit's lime "✓ Done" — solid, not the crown capsule.
          <ChipButton
            label={copy.board.done}
            leading={<Check color="onAccent" size={Size.doneCheck} />}
            shape="pill"
            tone="fill"
            pulse
            onPress={() => setEditing(false)}
          />
        ) : (
          <View style={styles.crownControls}>
            {hasClubs ? (
              /* ⚠ Icon-only (ADR 0182): the pencil says "edit" in any locale;
                 the string survives as the VoiceOver label. DONE stays TEXT —
                 it is the only way out of the mode (ADR 0174 §13). */
              <View style={styles.editNudge}>
                <ChipButton
                  leading={<PencilGlyph color="accent" size={13} strokeWidth={1.6} />}
                  shape="pill"
                  tone="crown"
                  accessibilityLabel={copy.board.edit}
                  onPress={() => setEditing(true)}
                />
              </View>
            ) : null}
            <AvatarButton
              initials={initials}
              onPress={() => router.push('/(sheets)/account')}
              /* ⚠ `ground` on a deep background — the crown tone's near-black
                 ink is invisible on a dark band (ADR 0165), and the board can
                 wear one now (ADR 0175). Derived from the SAME theme the
                 scaffold paints, so the two cannot disagree (trap 72). */
              tone={bgTheme.tone === 'deep' ? 'ground' : 'crown'}
            />
          </View>
        )
      }
      scrollRef={scrollRef}
      onScrollY={(y) => {
        scrollOffset.current = y;
      }}
      // ⚠ Frozen while a card is up: the drag owns the Y axis then, and the
      // page scrolling underneath it is the auto-scroll's job alone.
      scrollEnabled={!dragging}
      // The match in progress IS the crown's payload (ADR 0088): a dark glass
      // plate on the bright band. With nothing live the crown collapses to
      // eyebrow + title, exactly as APP-SHELL asks.
      /**
       * The crown's payload is the screen's LEAD CARD, whichever it is (ADR
       * 0095): the live plate while a match is in play, otherwise NEXT UP —
       * the single card, or the same-day DECK of them (ADR 0113). The
       * gradient runs over it either way, so the head of the screen is one
       * object rather than a header with a card under it.
       *
       * ⚠ The live boards outrank the whole NEXT UP deck exactly as one
       * outranks the fixture it became — live and next-up are never both
       * drawn, and the body's LAST RESULT is what follows either. Two-plus
       * live boards are their own deck (ADR 0126); one is the solo plate.
       *
       * ⚠ Each deck's `key` is its membership: any change — a kickoff
       * passing, a refetch, a match ending — remounts it with the earliest
       * back on top. A shuffle is a peek, not a preference (ADR 0113), and a
       * remount is the reset that needs no effect. ⚠ The live key has no
       * zone term — live boards are not zone-derived — and a kickoff→route
       * source upgrade keeps its fixture id, so the card upgrades IN PLACE
       * without resetting the shuffle.
       */
      /**
       * ⚠⚠ **`lead` alone unless editing, never a fragment around it.** `Crown`
       * collapses its bottom padding when it has NO payload, which is Today's
       * idle state — and a fragment is always truthy, so wrapping
       * unconditionally would silently re-pad the crown on every quiet day.
       *
       * ⚠ The hint bar rides INSIDE the crown above the pinned lead card, which
       * is the design's own placement and needs no crown API: `Crown.inner`
       * already gaps its children by `Spacing.four`. ⚠⚠ Never by raising the
       * crown over the body to get there (trap 70).
       */
      // ⚠ `lead` alone in BOTH modes since ADR 0199 — the hint left the crown
      // for a caption at the top of the body, so there is no fragment to
      // re-pad an idle crown (trap 76) and the pinned lead card is untouched.
      payload={lead}
      // ⚠ No pull-to-refresh while arranging: a refetch mid-edit reshuffles the
      // content under the scrims and can take a card out of the stack under the
      // finger, for a reader who is not reading any of it.
      onRefresh={
        editing
          ? undefined
          : () => {
              void finished.refetch();
              void upcoming.refetch();
              void recent.refetch();
              void live.refetch();
              teamWindows.refetch();
            }
      }
      refreshing={
        finished.isRefetching ||
        upcoming.isRefetching ||
        recent.isRefetching ||
        teamWindows.isRefetching
      }
    >
      <BoardStack
        sections={sections}
        editing={editing}
        tray={trayCards(layout)}
        copy={{
          ...copy.board,
          caption: `${copy.board.hint} · ${copy.board.count(visibleCards(layout).length, BUILT_COUNT)}`,
        }}
        tiles={bgTiles}
        // ⚠ The drag speaks in VISIBLE cards; the store holds the whole
        // catalogue's order. `applyVisibleOrder` is the join — it rewrites only
        // the slots those cards occupied, so a put-away card keeps the place it
        // was put away from (ADR 0174).
        onOrder={(visible) => setBoardOrder(applyVisibleOrder(bdOrder, visible))}
        onRemove={(id) => setBoardCardHidden(id, true)}
        onAdd={(id) => setBoardCardHidden(id, false)}
        // Order, hidden cards AND background — the kit's Reset (ADR 0199).
        onReset={resetBoard}
        scroll={dragScroll}
        onDragging={setDragging}
      />

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
                  router.push({
                    pathname: '/club/[slug]',
                    params: { slug: team.slug },
                  })
                }
                style={styles.pick}
              >
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

          <Button label={copy.today.browseAll} onPress={() => router.push('/clubs')} />
        </View>
      ) : null}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  // ⚠ The EDIT chip and the avatar share the crown's top-right slot (ADR 0174).
  // Both have an intrinsic width and neither takes a flex share (trap 56).
  crownControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  // ⚠ The pencil circle sits a touch BELOW the row's centre line (Ed's eye —
  // dead-centre beside the avatar's larger halo it read as riding high).
  // Transform, not margin: the row's layout and hit target stay put.
  editNudge: { transform: [{ translateY: Spacing.half }] },
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
