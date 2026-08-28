/**
 * The Today board's lead card: a match in progress, or last result + next kickoff.
 *
 * ⚠⚠ **The in-progress card has TWO paths and the difference is the whole
 * feature** (ADR 0048). `isLive` says which one is on screen:
 *
 * - **LIVE** — `GET /cronogol/live`, re-read every ~30s, joined to this fixture
 *   by our own id. It carries a real `minute`, so the card prints one. LaLiga
 *   only.
 * - **SWEEP** — `GET /cronogol/fixtures`, whose `status: "live"` was true at a
 *   sweep up to three hours ago. Every other league lands here, and it renders
 *   exactly as it always has: no minute, `FeedAge`, and a note saying the score
 *   is as of the last check.
 *
 * ⚠ **The note is required on BOTH and must never be removed to tidy the
 * screen.** The handoff is explicit that those lines "are the difference
 * between honest and broken", and on the live path it also carries the stalled
 * state — the one failure this feature has, where rows are in play and nothing
 * is refreshing them.
 *
 * ⚠ **Still no pulsing dot.** SPEC §3.1 asks for one and ADR 0034 refused it
 * once already. The minute is the liveness signal now, and it is information
 * rather than animation — a pulse would say nothing the number does not, and
 * would need a Reduce Motion path to say it.
 *
 * ⚠ **Still not the word "live" in the UI** (ADR 0035). The pill stays
 * `In progress` / `En juego`. What changed is that the card can now back that
 * word with a minute; the vocabulary did not.
 *
 * ⚠ The last-result card is fed from `/cronogol/fixtures`, not the scoreboard —
 * the scoreboard cannot say which match is yours (ADR 0027).
 *
 * ⚠⚠ **BOTH the live and the last-result card expand into their timeline**
 * (ADR 0050), which reverses 0045's divergence 1 — the design had asked for the
 * panel on the live card's footer row all along, and 0045 struck it out because
 * an in-play match had no events at all and a chevron would open on nothing.
 *
 * ⚠ **It still opens on nothing TODAY**, and that is expected rather than
 * broken: `/cronogol/fixtures/{id}/events` served `count: 0` for a match that
 * was 3-0 at 51 minutes on 2026-08-28. What changed is that the absence is now
 * known to be temporary and scheduled to go away — the upstream does publish
 * during play. The panel says "aren't published yet", which is true in both
 * worlds, and fills in when the backend lands it. See `.claude/LIVE-SCORES.md` §6.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chevron, Crest, Pill, Text, VersusBadge } from '@/components/atoms';
import { Countdown, FeedAge, ScoreLine, type ScoreSide } from '@/components/molecules';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import type { TeamRef, TimelineEventView } from '@/lib/cronogol/types';
import type { Copy } from '@/lib/i18n/copy';
import { MatchEvents } from './match-events';

export interface MatchBoardProps {
  /** A match in play, if any. See the two paths in this file's docblock. */
  live?: {
    /**
     * Our own fixture id, for the events panel — and `null` to withhold the
     * disclosure entirely.
     *
     * ⚠ `null` is not a degradation, it is the honest state for a card built
     * from something other than a fixture row: `/_debug/gallery` fabricates its
     * live rows and has no fixture behind them. A chevron there would open a
     * request for an id that does not exist and settle on the ERROR copy, which
     * is the one thing worse than no chevron.
     */
    id: string | null;
    /**
     * ⚠ Needed for the events panel, exactly as on `last` below: the panel
     * derives each event's side by comparing `teamSlug`, and the `ScoreSide`
     * pair carries no slug.
     */
    homeTeam: TeamRef | null;
    awayTeam: TeamRef | null;
    /**
     * The in-play timeline, straight off `GET /cronogol/live` (ADR 0051).
     *
     * ⚠⚠ **Set on the LIVE path, `undefined` on the SWEEP path**, and the
     * difference is which source answers. Given events, the panel renders them
     * and issues no request — they already arrived with the score, on the same
     * ~30s refresh. Given `undefined`, it falls back to the durable
     * finished-match route, which is right for every non-LaLiga league.
     *
     * ⚠ `[]` is a real answer and NOT the same as `undefined`: it means the live
     * route is holding an empty timeline, so the panel says "not published yet"
     * rather than going and asking a 3-hourly sweep that has nothing either.
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
     * nothing honest to print: the sweep path, a row before kick-off or after
     * full time, or a `status: 'unknown'` row whose in-play state the upstream
     * did not recognise. ⚠ **Never `0′`.**
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
  } | null;
  /** The most recent finished match of a followed club. */
  last?: {
    /**
     * ⚠ Needed for the events panel, and the reason this card's props stopped
     * being pure scalars. `home`/`away` here are `ScoreSide` — a name, a crest
     * and a monogram — which is everything the SCORE line needs and nothing the
     * events panel does: it derives each event's side by comparing `teamSlug`,
     * and a `ScoreSide` carries no slug.
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
  } | null;
  /** The soonest upcoming match of a followed club. */
  next?: {
    home: ScoreSide;
    away: ScoreSide;
    kickoffUtc: string;
    kickoffTbd: boolean;
    meta: string;
    /** Already formatted in the reader's zone and clock. `--:--` when TBD. */
    kickoffLabel: string;
    /** "SAT 5 SEP" — the reader's own day. */
    dateLabel: string;
    /** "CEST · YOUR TIME" — states WHOSE clock this is. */
    zoneLabel: string;
    venue: string | null;
  } | null;
  copy: {
    inProgress: string;
    kickoffIn: string;
    lastResult: string;
    noScore: string;
    scoreAge: (hoursAgo: number | null) => string;
    tbd: string;
  };
  events: Copy['events'];
}

/**
 * The footer row that opens a match's timeline.
 *
 * ⚠ **The whole row is the tap target, as the design has it** — not the chevron.
 * It carries the panel's name, which is also why `MatchEvents` is handed
 * `showTitle={false}` on both cards: left on, the eyebrow printed the same words
 * again one line below this.
 *
 * ⚠ Shared by the live and last-result cards rather than written twice (ADR
 * 0050). Two copies of an accessibility contract is two chances for one of them
 * to lose its `expanded` state, which is the half VoiceOver actually announces.
 */
function EventsDisclosure({
  open,
  onToggle,
  copy,
}: {
  open: boolean;
  onToggle: () => void;
  copy: Copy['events'];
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={open ? copy.collapse : copy.expand}
      style={({ pressed }) => [styles.disclosure, pressed && { opacity: 0.75 }]}>
      <Text variant="eyebrowSm" color="textFaint">
        {copy.title}
      </Text>
      <Chevron expanded={open} />
    </Pressable>
  );
}

export function MatchBoard({ live, last, next, copy, events }: MatchBoardProps) {
  /**
   * One boolean, not the `openId` the list surfaces carry.
   *
   * ⚠ Still correct now that BOTH cards expand (ADR 0050): the live card
   * early-returns, so the two are never on screen together and there is no
   * second row for a shared flag to open by accident.
   */
  const [showEvents, setShowEvents] = useState(false);
  if (live) {
    return (
      <View style={[styles.card, styles.flush, styles.liveCard]}>
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
          {live.isLive ? null : (
            <FeedAge lastUpdateAt={live.lastUpdateAt} render={copy.scoreAge} />
          )}
          {/* ⚠⚠ The honesty note stays INSIDE the padded block and ABOVE the
              disclosure. It is the line that says which of the three truths this
              card is telling (HANDOFF trap 8), and pushing it under an expanded
              panel is how it stops being read. */}
          <Text variant="footnote" color="textFaint">
            {live.note}
          </Text>
        </View>

        {live.id !== null ? (
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

  return (
    <View style={styles.stack}>
      {last ? (
        <View style={[styles.card, styles.flush, styles.resultCard]}>
          <View style={styles.pad}>
            <View style={styles.headRow}>
              <Text variant="eyebrowSm" color="textFaint">
                {copy.lastResult} · {last.meta}
              </Text>
              {last.outcome ? <Pill label={last.outcome} /> : null}
            </View>
            <ScoreLine home={last.home} away={last.away} noScoreLabel={copy.noScore} />
          </View>

          <EventsDisclosure
            open={showEvents}
            onToggle={() => setShowEvents((open) => !open)}
            copy={events}
          />

          {showEvents ? (
            <MatchEvents
              fixtureId={last.id}
              home={last.homeTeam}
              away={last.awayTeam}
              copy={events}
              // ⚠ The footer row above already reads `MATCH EVENTS`. Left on,
              // the panel printed its own eyebrow directly beneath it — the
              // same words twice, one line apart.
              showTitle={false}
            />
          ) : null}
        </View>
      ) : null}

      {next ? (
        /**
         * ⚠ STACKED, not a row. Names sit UNDER their crest so each gets half the
         * card's width — a row layout truncated both sides of Real Madrid v Real
         * Sociedad to "Real…" against "Real…", which names neither club.
         */
        <View style={[styles.card, styles.nextCard]}>
          <View style={styles.headRow}>
            <Text variant="eyebrowSm" color="accent">
              {next.meta}
            </Text>
            {next.venue ? (
              <Text variant="eyebrowSm" color="textFaint" numberOfLines={1} style={styles.venue}>
                {next.venue}
              </Text>
            ) : null}
          </View>

          {/* One VoiceOver stop for the whole pairing, as UpcomingCard already
              does — otherwise it reads as four: crest, name, "V", name. */}
          <View
            style={styles.pair}
            accessible
            accessibilityLabel={`${next.home.name} v ${next.away.name}`}>
            <View style={styles.pairSide}>
              <Crest
                src={next.home.crest}
                fallback={next.home.abbr}
                size={Size.crestNext}
                filled={!next.home.crest}
              />
              <Text variant="bodyStrong" center numberOfLines={1}>
                {next.home.name}
              </Text>
            </View>
            <View style={styles.versus}>
              <VersusBadge />
            </View>
            <View style={styles.pairSide}>
              <Crest
                src={next.away.crest}
                fallback={next.away.abbr}
                size={Size.crestNext}
                filled={!next.away.crest}
              />
              <Text variant="bodyStrong" center numberOfLines={1}>
                {next.away.name}
              </Text>
            </View>
          </View>

          <View style={styles.kickoffRow}>
            <Text variant="kickoff" tabular>
              {next.kickoffLabel}
            </Text>
            <View style={styles.kickoffMeta}>
              <Text variant="eyebrowLg" color="textSecondary">
                {next.dateLabel}
              </Text>
              {/* ⚠ States whose clock this is. Every time on screen is the
                  reader's own zone, and saying so is what stops "9:00 PM" being
                  read as the stadium's local time — which is why it is set to
                  be read rather than skimmed. */}
              <Text variant="eyebrowLg" color="textFaint">
                {next.zoneLabel}
              </Text>
            </View>
          </View>

          <View style={styles.rule} />
          {next.kickoffTbd ? (
            <Text variant="footnote" color="textFaint">
              {copy.tbd}
            </Text>
          ) : (
            <View style={styles.countdownRow}>
              <Text variant="eyebrowSm" color="textFaint">
                {copy.kickoffIn}
              </Text>
              <Countdown kickoffUtc={next.kickoffUtc} />
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.three },
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  liveCard: { borderColor: Colors.dark.live },
  /**
   * ⚠ An expandable card drops the shared `card` padding and gap: its events
   * panel must run edge to edge inside the rounded corners, so the padding moves
   * onto `pad` and the card clips instead.
   *
   * ⚠ `overflow: 'hidden'` is the load-bearing half. Without it the panel's
   * ground squares off the two bottom corners the card just rounded, which reads
   * as a rendering fault rather than a style choice.
   */
  flush: { padding: 0, gap: 0, overflow: 'hidden' },
  pad: { padding: Spacing.four, gap: Spacing.three },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.hairlineMid,
  },
  /** Kept beside `liveCard` / `nextCard` as this card's own slot; the flush
   *  geometry the two expandable cards share lives in `flush`. */
  resultCard: {},
  nextCard: { borderColor: Colors.dark.accentRing },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.dark.hairlineMid },
  venue: { flexShrink: 1, textAlign: 'right' },
  pair: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  pairSide: { flex: 1, alignItems: 'center', gap: Spacing.two },
  /** Centres the ring on the crest line — derived, so a crest resize follows. */
  versus: { marginTop: (Size.crestNext - Size.versusBadge) / 2 },
  kickoffRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
  kickoffMeta: { flex: 1, gap: Spacing.one, paddingBottom: Spacing.one },
  /**
   * ⚠ WRAPS rather than shrinks. `1d 18h 04m 12s` is four rigid groups, and at
   * the largest Dynamic Type sizes squeezing them slid every digit over its own
   * unit letter. Given the room it drops to its own line instead, which is the
   * one failure mode here that stays readable.
   */
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
    rowGap: Spacing.two,
  },
});
