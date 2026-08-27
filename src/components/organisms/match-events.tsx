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
 * ⚠ In-progress matches have no events at all, so they get no chevron and
 * never reach this component. That is the design's rule 3 struck out — live
 * events are a separate backend project.
 */
import { StyleSheet, View } from 'react-native';

import { SkeletonRows, Text } from '@/components/atoms';
import { EventRow } from '@/components/molecules';
import { Colors, Size, Spacing } from '@/constants/theme';
import { abbreviate, crestSrc } from '@/lib/cronogol/derive';
import { detailLine, eventKind, eventSide, minuteLabel } from '@/lib/cronogol/events';
import type { TeamRef } from '@/lib/cronogol/types';
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
   * ⚠ `false` where the SURFACE already names the panel. The board's
   * last-result card discloses through a labelled footer row rather than a bare
   * chevron, so with this on, `SUCESOS DEL PARTIDO` printed twice, once above
   * the other. The list surfaces disclose with a chevron beside `FT` / `FIN` and
   * so do need it.
   */
  showTitle?: boolean;
}

export function MatchEvents({
  fixtureId,
  home,
  away,
  copy,
  bleed = false,
  showTitle = true,
}: MatchEventsProps) {
  const query = useFixtureEvents(fixtureId);
  const events = query.data?.events ?? [];

  return (
    <View style={[styles.panel, bleed && styles.bleed]}>
      {showTitle ? (
        <Text variant="eyebrowSm" color="textFaint">
          {copy.title}
        </Text>
      ) : null}

      {query.isPending ? (
        <SkeletonRows count={3} height={Size.rowSkeleton} />
      ) : query.isError ? (
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
        <View style={styles.rows}>
          {events.map((event) => {
            const side = eventSide(event, home, away);
            const team = side === 'home' ? home : side === 'away' ? away : null;

            return (
              <EventRow
                key={event.id}
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
