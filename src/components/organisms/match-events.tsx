/**
 * The panel a finished match expands into: goals with assists, cards and
 * substitutions, on a minute-stamped timeline.
 *
 * ⚠ **Fetches on mount, which means on expand.** The list must never pre-fetch
 * — a matchday would be ten requests for nine panels nobody opened. Each
 * surface keeps one row open at a time, so at most one is in flight.
 *
 * ⚠⚠ **An empty result does NOT mean a goalless match.** The ingest is
 * finished-only and three-hourly, so a 4-1 that ended twenty minutes ago
 * returns `count: 0` — indistinguishable from a real 0-0. The copy says "not
 * published yet" and must never be tidied into "no goals".
 *
 * ⚠ This inverts design rule 1 — *"a match with no published events shows no
 * chevron"* — deliberately, and ADR 0045 records why: honouring it literally
 * requires knowing the count before the tap, which requires the pre-fetch the
 * line above forbids. Disclosure is gated on STATUS (finished), not on data.
 *
 * ⚠ **Feed order, never sorted.** Events share a minute constantly and the
 * array encodes each source's own chronology; a client-side sort on `minute`
 * flips substitution pairs between renders.
 *
 * ⚠⚠ **An IN-PROGRESS match reaches this component now** (ADR 0050), reversing
 * the line that stood here. It is still true that `/cronogol/fixtures/{id}/events`
 * serves nothing during play — checked against a real live match on 2026-08-28 —
 * so what a live panel shows today is `notPublished`, which is the honest answer
 * for exactly the reason above. What changed is that the absence is now known to
 * be TEMPORARY: the upstream does publish during play and the backend is
 * building on it (`senpai-backend/.claude/cronogol/live-phase-2.md` strand A).
 *
 * ⚠ **`supplied` is the seam for where that lands.** See the prop.
 *
 * ⚠ **One group at a time, behind the tabs** (ADR 0046). A 4-1 with six bookings
 * and ten substitutions is twenty rows, and a panel that long pushes the matches
 * under it off screen — which is the one thing an expansion inside a list must
 * not do.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SkeletonRows, Text } from '@/components/atoms';
import { EventRow, EventTabs } from '@/components/molecules';
import { Colors, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc } from '@/lib/cronogol/derive';
import {
  detailLine,
  eventKey,
  eventKind,
  eventSide,
  eventsInGroup,
  groupCounts,
  initialGroup,
  minuteLabel,
  type EventGroup,
} from '@/lib/cronogol/events';
import type { TeamRef, TimelineEventView } from '@/lib/cronogol/types';
import type { Copy } from '@/lib/i18n/copy';
import { useFixtureEvents } from '@/queries/use-fixture-events';

export interface MatchEventsProps {
  /** Our own fixture id — the `id` already on every fixture view. */
  fixtureId: string;
  home: TeamRef | null;
  away: TeamRef | null;
  copy: Copy['events'];
  /**
   * Repeats the row's gutter bleed. ⚠ Required on the matchday list, whose rows
   * run `marginHorizontal: -Spacing.five` — without it this panel's ground stops
   * short of both screen edges under rows that do not.
   */
  bleed?: boolean;
  /**
   * Draw the panel's own eyebrow.
   *
   * ⚠⚠ Even at `true` this only reaches the screen when there are no tabs — the
   * group control labels the panel, and the two together printed `SUCESOS DEL
   * PARTIDO` directly above `Goles · Tarjetas · Cambios · Otros` (ADR 0046). It
   * still draws for pending / error / not-published, which have no groups.
   *
   * ⚠ `false` where the SURFACE already names the panel. The board's
   * last-result card discloses through a labelled footer row rather than a bare
   * chevron, so with this on, `SUCESOS DEL PARTIDO` printed twice, once above
   * the other. The list surfaces disclose with a chevron beside `FT` / `FIN` and
   * so do need it.
   */
  showTitle?: boolean;
  /**
   * Events already in hand, bypassing the fetch entirely.
   *
   * ⭐ **This is now the LIVE path, and the seam did its job** (ADR 0051). The
   * backend chose the third of `live-phase-2.md`'s three landing places —
   * events inline on `GET /cronogol/live` — and consuming it cost exactly this
   * prop. Nothing in `EventTabs`, `EventRow` or `lib/cronogol/events` moved.
   *
   * ⚠ An empty array is NOT the same as `undefined`. `[]` means "I hold the
   * answer and it is empty" — the `notPublished` branch. `undefined` means
   * "fetch it yourself", which is every existing caller.
   *
   * ⚠ It is also how `/_debug/gallery` draws an expanded panel with no network.
   */
  supplied?: readonly TimelineEventView[];
}

export function MatchEvents({
  fixtureId,
  home,
  away,
  copy,
  bleed = false,
  showTitle = true,
  supplied,
}: MatchEventsProps) {
  const held = supplied !== undefined;
  // ⚠ `null` disables the query outright — a supplied set must cost no request.
  const query = useFixtureEvents(held ? null : fixtureId);
  const events = supplied ?? query.data?.events ?? [];

  /**
   * ⚠ **`null` until the reader taps, and the shown group is DERIVED from it.**
   * The counts arrive with the fetch, so a state seeded with a group would have
   * to be corrected by an effect once the data landed — one render of an empty
   * `Goals` on a 0-0 with two bookings, then a jump. Deriving lands it right on
   * the first render that has data, with nothing to sequence.
   *
   * ⚠ It resets itself per match. This component is rendered only while its row
   * is open and each surface keeps one row open at a time, so opening another
   * match unmounts this instance — the reader never inherits the previous
   * match's tab.
   */
  const [picked, setPicked] = useState<EventGroup | null>(null);
  const counts = groupCounts(events);
  // The `> 0` guard is what stops a stale pick stranding the panel on an empty
  // list if the same instance ever saw its group emptied under it.
  const active = picked !== null && counts[picked] > 0 ? picked : initialGroup(counts);

  return (
    <View style={[styles.panel, bleed && styles.bleed]}>
      {/* ⚠ The eyebrow yields to the tabs. See `showTitle`. */}
      {showTitle && events.length === 0 ? (
        <Text variant="eyebrowSm" color="textFaint">
          {copy.title}
        </Text>
      ) : null}

      {/* ⚠⚠ `held` FIRST, and it is not a tidy-up. A disabled query reports
          `isPending` for ever, so without this a supplied set would paint
          skeletons on top of data we are already holding. */}
      {!held && query.isPending ? (
        <SkeletonRows count={3} height={Size.rowSkeleton} />
      ) : !held && query.isError ? (
        /* ⚠ A failed request is NOT an empty one. Falling through to
           `notPublished` would have the app state, as fact, that the backend
           holds nothing for a match it never managed to ask about. */
        <Text variant="micro" color="textMuted">
          {copy.error}
        </Text>
      ) : events.length === 0 ? (
        <Text variant="micro" color="textMuted">
          {copy.notPublished}
        </Text>
      ) : (
        <>
          <EventTabs
            counts={counts}
            active={active}
            labels={copy.groups}
            onSelect={setPicked}
          />
          <View style={styles.rows}>
            {eventsInGroup(events, active).map((event, index) => {
              const side = eventSide(event, home, away);
              const team = side === 'home' ? home : side === 'away' ? away : null;

              return (
                <EventRow
                  key={eventKey(event, index)}
                  minute={minuteLabel(event)}
                  kind={eventKind(event)}
                  name={event.player.name}
                  detail={detailLine(event, copy)}
                  crest={crestSrc(team?.logoUrls ?? null, team?.logoUrl ?? null, 'xsmall')}
                  // ⚠ Null keeps the column's width but draws nothing — a VAR
                  // decision can belong to neither club, and a guessed side is
                  // worse than a blank one.
                  abbr={team ? abbreviate(team.name, team.slug, team.shortName) : null}
                />
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    // One step BELOW the card it opens inside — an expansion reads as recessed
    // into its row, not stacked on top of it.
    backgroundColor: Colors.dark.sunken,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  // See `bleed` above. Mirrors `fixture-list.tsx`'s own row geometry.
  bleed: { paddingHorizontal: Spacing.five, marginHorizontal: -Spacing.five },
  rows: { gap: Spacing.three },
});
