/**
 * The match in progress, as the Today crown's dark glass plate (ADR 0088) —
 * the live branch that lived at the top of `match-board.tsx`, re-grounded for
 * the crown's bright band. The DATA contract moved verbatim and every warning
 * with it; only the surface changed.
 *
 * ⚠⚠ **The card has THREE paths and the difference is the whole feature**
 * (ADR 0048, 0078). `isLive` and `awaitingUpdate` say which:
 *
 * - **LIVE** — `GET /cronogol/live`, re-read every ~30s, joined to this fixture
 *   by our own id. It carries a real `minute`, so the plate prints one. LaLiga
 *   only.
 * - **SWEEP** — `GET /cronogol/fixtures`, whose `status: "live"` was true at a
 *   sweep up to three hours ago: no minute, `FeedAge`, and a note saying the
 *   score is as of the last check.
 * - **KICKED OFF** — the scheduled kickoff has passed and NEITHER source has
 *   reported yet (ADR 0078): dashes, no minute, no age line, no events, and a
 *   note saying so.
 *
 * ⚠ **The note is required on all three and must never be removed to tidy the
 * screen** (HANDOFF trap 8) — it is "the difference between honest and
 * broken", and on the live path it also carries the stalled state.
 *
 * ⚠ **Still no pulsing dot** (ADR 0034) and **still not the word "live" in the
 * UI** (ADR 0035) — the pill stays `In progress` / `En juego`.
 *
 * ⚠ The plate sits INSIDE the crown (`ScreenScaffold`'s `payload` slot), on
 * the gradient's bright-to-mid band — hence the near-black glass ground
 * (`plateDark`) rather than white glass: white glass on lime reads as a pale
 * card, and the mockup's plate is dark.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Pill, Text } from '@/components/atoms';
import { EventsDisclosure, FeedAge, ScoreLine, type ScoreSide } from '@/components/molecules';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import type { TeamRef, TimelineEventView } from '@/lib/cronogol/types';
import type { Copy } from '@/lib/i18n/copy';
import { MatchEvents } from './match-events';

export interface LivePlateProps {
  /**
   * Our own fixture id, for the events panel — and `null` to withhold the
   * disclosure entirely.
   *
   * ⚠ `null` is not a degradation, it is the honest state for a plate built
   * from something other than a fixture row: `/_debug/gallery` fabricates its
   * live rows and has no fixture behind them. A chevron there would open a
   * request for an id that does not exist and settle on the ERROR copy, which
   * is the one thing worse than no chevron.
   */
  id: string | null;
  /**
   * ⚠ Needed for the events panel: it derives each event's side by comparing
   * `teamSlug`, and the `ScoreSide` pair carries no slug.
   */
  homeTeam: TeamRef | null;
  awayTeam: TeamRef | null;
  /**
   * The in-play timeline, straight off `GET /cronogol/live` (ADR 0051).
   *
   * ⚠⚠ **Set on the LIVE path, `undefined` on the SWEEP path**, and the
   * difference is which source answers. Given events, the panel renders them
   * and issues no request. Given `undefined`, it falls back to the durable
   * finished-match route.
   *
   * ⚠ `[]` is a real answer and NOT the same as `undefined`: it means the live
   * route is holding an empty timeline, so the panel says "not published yet"
   * rather than asking a 3-hourly sweep that has nothing either.
   */
  suppliedEvents?: readonly TimelineEventView[];
  home: ScoreSide;
  away: ScoreSide;
  /**
   * ⚠ **The LIVE path only.** `true` when this came from `/cronogol/live`, in
   * which case `FeedAge` is dropped — that molecule prints whole HOURS, which
   * for a feed that moves every thirty seconds reads `0` for the entire match.
   */
  isLive: boolean;
  /**
   * Already formatted through `copy.minute` — `"67′"`. Null whenever there is
   * nothing honest to print. ⚠ **Never `0′`.**
   */
  minute: string | null;
  /**
   * ⚠ Dims the minute rather than hiding it. A frozen number removed looks
   * like a match that ended; a frozen number dimmed, beside a note that says
   * updates are paused, is what actually happened.
   */
  stalled: boolean;
  /**
   * The note under the rule. The caller owns the wording, the language AND
   * which of the three truths it states: live · live-but-stalled · sweep.
   */
  note: string;
  /** ⚠ SWEEP path only, and always null there too — see `FeedAge`. */
  lastUpdateAt: string | null;
  /** The KICKED-OFF path (ADR 0078) — drops `FeedAge` and the disclosure. */
  awaitingUpdate?: boolean;
  copy: {
    inProgress: string;
    noScore: string;
    scoreAge: (hoursAgo: number | null) => string;
  };
  events: Copy['events'];
}

export function LivePlate({ copy, events, ...live }: LivePlateProps) {
  const [showEvents, setShowEvents] = useState(false);
  return (
    <View style={styles.plate}>
      {/* The lit top edge — a border on an overlay, the repo's inset-highlight
          idiom (React Native has no inset shadow; see `molecules/tray.tsx`). */}
      <View pointerEvents="none" style={styles.plateTop} />
      <View style={styles.pad}>
        <View style={styles.headRow}>
          <Pill label={copy.inProgress} tone="live" />
          {/* ⚠ `tabular` is not optional: this digit changes every minute, and
              proportional numerals make it shift under the reader's eye. */}
          {live.minute ? (
            <Text variant="title3" tabular color={live.stalled ? 'textDim' : 'live'}>
              {live.minute}
            </Text>
          ) : null}
        </View>
        <ScoreLine home={live.home} away={live.away} noScoreLabel={copy.noScore} />
        <View style={styles.rule} />
        {/* ⚠ `FeedAge` is the SWEEP path's alone — it renders whole hours, so on
            a feed that moves every ~30s it would print the same `0` all match.
            The live path's freshness is the minute, plus `note` when it stops. */}
        {live.isLive || live.awaitingUpdate ? null : (
          <FeedAge lastUpdateAt={live.lastUpdateAt} render={copy.scoreAge} />
        )}
        {/* ⚠⚠ The honesty note stays INSIDE the padded block and ABOVE the
            disclosure. It is the line that says which of the three truths this
            plate is telling (HANDOFF trap 8), and pushing it under an expanded
            panel is how it stops being read. */}
        <Text variant="footnote" color="textFaint">
          {live.note}
        </Text>
      </View>

      {live.id !== null && !live.awaitingUpdate ? (
        <>
          <EventsDisclosure
            open={showEvents}
            onToggle={() => setShowEvents((open) => !open)}
            copy={events}
          />
          {showEvents ? (
            <MatchEvents
              fixtureId={live.id}
              home={live.homeTeam}
              away={live.awayTeam}
              copy={events}
              supplied={live.suppliedEvents}
              showTitle={false}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    backgroundColor: Colors.dark.plateDark,
    borderRadius: Radius.card,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.plateLine,
    // ⚠ The `flush` rule from `match-board`: padding lives on `pad` so the
    // events panel runs edge to edge, and `overflow: 'hidden'` is what keeps
    // its ground from squaring the two bottom corners.
    overflow: 'hidden',
  },
  plateTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.plateTop,
    borderRadius: Radius.card,
  },
  pad: { padding: Spacing.four, gap: Spacing.three },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.dark.hairlineMid },
});
