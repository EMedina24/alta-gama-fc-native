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
 *
 * ⚠ A DARK PLATE, not glass (ADR 0186) — LivePlate's shell one step lighter
 * (`plateBody`). This is the first body card, and on an idle board (no live
 * match, no NEXT UP) the crown collapses to eyebrow + title while its gradient
 * layer keeps its 432pt (`CrownRamp`, ADR 0094), so the card sits on the
 * lime→green band at y ≈ 141–283. On 6 % white glass the inks measured `text`
 * 2.7 and the losing side's `textDim` 1.1. Quiet inks step up with the ground:
 * the label, the outcome pill (`tone="plate"`) and the disclosure are
 * `textSecondary`, because `textFaint` is ≤ 2.2 even on the plate.
 *
 * ⚠ It is a plate on EVERY day — under NEXT UP it sits on the mesh and reads a
 * step darker than the glass cards below it. Ed's call: one card, one surface.
 *
 * ⚠ The events panel's `recess` stacks on the plate to ≈ 0.71 black — darker
 * than the card, lighter than LivePlate's own stack (≈ 0.86) — so the
 * expansion still reads as recessed and the panel's inks sit on a ground the
 * live plate has already proved.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CompetitionMark, Pill, Text, type CompetitionMarkKind } from '@/components/atoms';
import { EventsDisclosure, ScoreLine, type ScoreSide } from '@/components/molecules';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import type { TeamRef, TimelineEventView } from '@/lib/cronogol/types';
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
  /** "MD 3 · SAT 29 AUG" — for a marked cup tie, the date alone (ADR 0133). */
  meta: string;
  /**
   * A competition lockup between the label and `meta` (ADR 0133), in the
   * row's quiet ink. The screen resolves it (`competitionMarkKind`); a
   * competition without a mark keeps its name in `meta` instead.
   */
  mark?: CompetitionMarkKind | null;
  /** Already mapped through `phrases.formLetters` — never a raw `W`/`D`/`L`. */
  outcome: string | null;
  copy: { lastResult: string; noScore: string };
  events: Copy['events'];
  /**
   * Whether this match's league can ever publish a timeline. False removes the
   * disclosure entirely rather than opening it on the "not published yet" copy,
   * which would be a promise: Puerto Rico's federation enters no player events
   * at all, so `count: 0` there is permanent and not a sweep that has not run.
   *
   * ⚠ A capability of the LEAGUE, never a reading of one fixture's payload —
   * an empty array on a league that does publish is trap 32's honest pending
   * state and keeps its chevron.
   */
  matchEvents?: boolean;
  /**
   * A timeline handed in instead of fetched — the `_debug` gallery's seam,
   * mirroring `LivePlate.suppliedEvents`: given events, the panel renders them
   * and issues no request off this card's fixture id. The live screen never
   * sets it; `undefined` is the real path.
   */
  suppliedEvents?: readonly TimelineEventView[];
  /**
   * The events panel, CONTROLLED (the ADR 0126 pattern, borrowed for the
   * gallery so an expanded card can be reached by deep link + screenshot,
   * tap-free). Absent, the card keeps its own state and is exactly what it
   * always was. Both or neither: a controlled `eventsOpen` without
   * `onToggleEvents` would be a chevron that ignores the finger.
   */
  eventsOpen?: boolean;
  onToggleEvents?: () => void;
}

export function LastResultCard({
  id,
  homeTeam,
  awayTeam,
  home,
  away,
  meta,
  mark = null,
  outcome,
  copy,
  events,
  matchEvents = true,
  suppliedEvents,
  eventsOpen,
  onToggleEvents,
}: LastResultCardProps) {
  const [ownOpen, setOwnOpen] = useState(false);
  const showEvents = eventsOpen ?? ownOpen;
  const toggleEvents = onToggleEvents ?? (() => setOwnOpen((open) => !open));

  return (
    <View style={styles.card}>
      {/* The lit top edge — a border on an overlay, the repo's inset-highlight
          idiom (`live-plate.tsx`, `next-up-card.tsx`). */}
      <View pointerEvents="none" style={styles.plateTop} />
      <View style={styles.pad}>
        <View style={styles.headRow}>
          {mark ? (
            // The mark stands where the competition's name would have been
            // spelled (ADR 0133), between the label and the date, with the
            // separators the text form would have worn.
            <View style={styles.metaRow}>
              <Text variant="eyebrowSm" color="textSecondary">
                {copy.lastResult} ·
              </Text>
              {/* White like the club names — the mark keeps one voice on both
                  cards (Ed's call, ADR 0133), even between quiet texts. */}
              <CompetitionMark kind={mark} height={Size.competitionMark} color="text" />
              <Text variant="eyebrowSm" color="textSecondary">
                · {meta}
              </Text>
            </View>
          ) : (
            <Text variant="eyebrowSm" color="textSecondary">
              {copy.lastResult} · {meta}
            </Text>
          )}
          {outcome ? <Pill label={outcome} tone="plate" /> : null}
        </View>
        <ScoreLine home={home} away={away} noScoreLabel={copy.noScore} />
      </View>

      {matchEvents ? (
        <EventsDisclosure
          open={showEvents}
          onToggle={toggleEvents}
          copy={events}
        />
      ) : null}

      {matchEvents && showEvents ? (
        <MatchEvents
          fixtureId={id}
          home={homeTeam}
          away={awayTeam}
          supplied={suppliedEvents}
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
   * A dark PLATE (ADR 0186) — LivePlate's shell with `plateBody` for its
   * ground — and FLUSH: the events panel must run edge to edge inside the
   * rounded corners, so the padding lives on `pad`.
   *
   * ⚠ `overflow: 'hidden'` is load-bearing twice: without it the panel's
   * ground squares off the two bottom corners the card just rounded, which
   * reads as a rendering fault, and `plateTop` would draw past the shell.
   */
  card: {
    backgroundColor: Colors.dark.plateBody,
    borderRadius: Radius.card,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.plateLine,
    overflow: 'hidden',
  },
  /**
   * The lit top edge — NEXT UP's `topEdge` form, not LivePlate's: all four
   * sides at 1pt, three transparent, or the chord runs straight across the
   * rounded corners.
   */
  plateTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: 'transparent',
    borderTopColor: Colors.dark.plateTop,
  },
  pad: { padding: Spacing.four, gap: Spacing.three },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  /** Label · mark · date, one breath apart (ADR 0133). */
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexShrink: 1 },
});
