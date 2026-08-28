/**
 * One match's timeline: the wire's six event types reduced to the seven marks
 * the panel draws, and the two fields it composes.
 *
 * ⚠ **Pure — no native import, no React, no `Date`.** It runs in a plain-JS
 * harness, which is how the push contract and the reminder rules were proven
 * before a build existed.
 *
 * ⚠⚠ **There is no sort function here, and none is to be added.** Order comes
 * from the server and encodes each source's own chronology. Events share a
 * minute constantly — a substitution pair, a goal and the booking that followed
 * — so a client-side sort on `minute` flips those pairs between renders
 * (`CRONOGOL-API.md` → events → point 4).
 *
 * ⚠ **Feed order is not always ascending, and that is not our bug to fix here.**
 * Observed 2026-08-26 on LaLiga jornada 1, Alavés–Getafe
 * (`c56084e3-df56-420d-9a05-714b3eadaaa5`): a 46' substitution is served at
 * index 5 and a **45+3'** booking at index 6, so the panel renders `46′` above
 * `45+3′`. The upstream evidently ordered on `minute` alone and read `45+3` as
 * 45. A stable sort on the COMPOSED time would fix that specific inversion
 * without the flipping point 4 warns about — but it is a reversal of an explicit
 * backend instruction and belongs in a new ADR, not in a quiet edit here.
 */
import type { TeamRef, TimelineEventView } from './types';

/**
 * The marks the panel draws. Seven, from the wire's six `type`s.
 *
 * ⚠ Wider than the design's four (`goal` / `yellow` / `red` / `sub`). `var` and
 * `missed-penalty` are real — about one every four matches — and a disallowed
 * goal is the thing that explains a scoreline which otherwise looks wrong.
 * `own-goal` is split out because painting it in the scoring side's lime
 * credits the wrong team at a glance. ADR 0045.
 */
export type EventKind =
  | 'goal'
  | 'own-goal'
  | 'yellow'
  | 'red'
  | 'sub'
  | 'var'
  | 'missed-penalty'
  | 'unknown';

/**
 * `"63"` · `"45+2"` · `null`.
 *
 * ⚠⚠ **Never `minute + minuteExtra`.** `45+2` is the 45th minute plus two; `47`
 * is a minute that did not happen.
 *
 * ⚠ `minuteExtra` is populated by **Serie A only**. LaLiga and the Premier
 * League fold stoppage into `minute`, so a 90+4 goal arrives from them as
 * `minute: 94, minuteExtra: null` — and there is nothing to normalise, because
 * the payload does not say whether a LaLiga `94` was 90+4. Render what you are
 * given.
 *
 * ⚠ `null` rather than `'0'` when the source did not say. The row loses its
 * minute; it never claims kick-off.
 */
export function minuteLabel(event: TimelineEventView): string | null {
  if (event.minute === null) return null;
  return event.minuteExtra ? `${event.minute}+${event.minuteExtra}` : String(event.minute);
}

/**
 * Which mark to draw.
 *
 * ⚠ **Switch on `type`; `subtype` is an OPEN STRING, not a union.** It only
 * ever narrows here, and every unrecognised value falls through to the type's
 * default — a closed match would reject real data the day a seventh VAR name
 * appears.
 *
 * ⚠⚠ **Never returns null and never drops a row.** `'unknown'` means the source
 * described something the backend has no name for yet; it is `0` rows today
 * only because the mapper was tuned against a sample, and two values already
 * escaped it once. Dropping is how a goal disappears.
 *
 * ⚠ `second-yellow` is a RED. It is a sending-off, not a booking.
 */
export function eventKind(event: TimelineEventView): EventKind {
  switch (event.type) {
    case 'goal':
      return event.subtype === 'own' ? 'own-goal' : 'goal';
    case 'card':
      return event.subtype === 'yellow' ? 'yellow' : 'red';
    case 'substitution':
      return 'sub';
    case 'var':
      return 'var';
    case 'missed-penalty':
      return 'missed-penalty';
    default:
      return 'unknown';
  }
}

/**
 * The panel's tabs. Four, from the eight marks above (ADR 0046).
 *
 * ⚠ `other` is not a leftovers bin, it is the thing that makes the control safe.
 * The design asked for three — `goals` / `cards` / `subs` — against its own
 * four-kind union. Ours is eight, and ADR 0045 decision 1 is emphatic that a row
 * is never dropped; a three-group control has nowhere to put `var`,
 * `missed-penalty` or `unknown`, and "nowhere" means the row stops rendering.
 */
export type EventGroup = 'goals' | 'cards' | 'subs' | 'other';

/** Tab order, and the order `initialGroup` looks for something to show. */
export const EVENT_GROUPS = ['goals', 'cards', 'subs', 'other'] as const;

/**
 * Which tab a mark files under.
 *
 * ⚠⚠ **The `default` branch is the point, not a fallback.** It carries
 * `eventKind`'s never-drop rule forward: a ninth mark added to `EventKind`
 * tomorrow lands in `other` and is still read, rather than vanishing out of a
 * control that only knows the eight named here. Never replace it with an
 * exhaustive list of cases.
 *
 * ⚠ `yellow` and `red` share one group deliberately — a card is a card to
 * someone scanning, and splitting them leaves two one-row tabs. The **glyph
 * colour** is what tells them apart, at row level. Never rely on the tab.
 *
 * ⚠ `own-goal` is a GOAL here even though it draws its own mark: it is on the
 * scoresheet, and a reader opening `Goals` on a 1-0 won by an own goal must not
 * find the tab empty.
 */
export function groupOf(kind: EventKind): EventGroup {
  switch (kind) {
    case 'goal':
    case 'own-goal':
      return 'goals';
    case 'yellow':
    case 'red':
      return 'cards';
    case 'sub':
      return 'subs';
    default:
      return 'other';
  }
}

/**
 * How many events in each group — the number every tab prints, including the
 * `0`s.
 *
 * ⚠ A zero is INFORMATION, not an absence: no bookings in a four-goal game is
 * worth seeing, which is why the tab renders it rather than hiding itself.
 */
export function groupCounts(events: readonly TimelineEventView[]): Record<EventGroup, number> {
  const counts: Record<EventGroup, number> = { goals: 0, cards: 0, subs: 0, other: 0 };
  for (const event of events) counts[groupOf(eventKind(event))] += 1;
  return counts;
}

/**
 * The tab a freshly opened panel lands on: the first non-empty one, in
 * `EVENT_GROUPS` order.
 *
 * ⚠ A 0-0 with two bookings opens on `cards`. Landing on `goals` unconditionally
 * shows an empty list for a match that has events, which reads as a broken panel.
 *
 * ⚠ Falls back to `goals` only when every count is zero — a state the panel does
 * not render tabs in at all, so the value is a formality, not a display.
 */
export function initialGroup(counts: Record<EventGroup, number>): EventGroup {
  return EVENT_GROUPS.find((group) => counts[group] > 0) ?? 'goals';
}

/**
 * One group's events.
 *
 * ⚠ A `filter`, which preserves relative order — that is the whole reason it is
 * a filter. The no-sort rule at the top of this file still stands: narrowing the
 * feed does not reorder it, and nothing here may start to.
 */
export function eventsInGroup(
  events: readonly TimelineEventView[],
  group: EventGroup,
): readonly TimelineEventView[] {
  return events.filter((event) => groupOf(eventKind(event)) === group);
}

/**
 * Which side of the card the event belongs to, for the crest column.
 *
 * The API says which CLUB (`teamSlug`), not which side. This is the derivation
 * for the neutral surfaces — `JornadaFixtureView` and `WindowFixtureView`, which
 * both name `homeTeam` and `awayTeam`.
 *
 * ⚠ There is a SECOND derivation, for the team-relative `FixtureView` on the
 * club page: it has `homeAway` and an `opponent` that is a **name, not a slug**,
 * so there is nothing to compare `teamSlug` against and the side must be read
 * off the slug you requested. That surface is not built (ADR 0045) — build it
 * here, next to this one, rather than at the call site.
 *
 * ⚠ `teamSlug` is typed nullable and legitimately is null: a VAR decision can
 * belong to neither side, and a club can have no crosswalk row for the event's
 * provider. `null` back means **render the row with no crest** — never guess.
 */
export function eventSide(
  event: TimelineEventView,
  home: TeamRef | null,
  away: TeamRef | null,
): 'home' | 'away' | null {
  if (event.teamSlug === null) return null;
  if (home && event.teamSlug === home.slug) return 'home';
  if (away && event.teamSlug === away.slug) return 'away';
  return null;
}

/** The strings the detail line is built from. Mirrors `Copy['events']`. */
export interface EventCopy {
  assist: (name: string) => string;
  off: (name: string) => string;
  penalty: string;
  ownGoal: string;
  secondYellow: string;
  varLabels: Readonly<Record<string, string>>;
  missedLabels: Readonly<Record<string, string>>;
}

/**
 * The name on the PRIMARY line.
 *
 * ⚠ On a substitution that is the player coming **ON**, not the one going off —
 * that is the name the reader is looking for.
 */
export function primaryName(event: TimelineEventView): string {
  return event.player.name;
}

/**
 * The second line, or `null` when the mark says everything.
 *
 * ⚠ `related` is **one field with two meanings**, disambiguated by `type`: the
 * assister on a goal, the player going off on a substitution. Reading it on the
 * wrong type is how an assist becomes a substitution.
 *
 * ⚠ A null `related` on a goal means **UNASSISTED**, which is about a third of
 * goals — not missing data, and not a line to leave blank.
 *
 * ⚠ A penalty never also carries an assist, so the two cannot collide.
 *
 * ⚠ An unrecognised `subtype` on a `var` or `missed-penalty` returns `null`
 * rather than the raw slug. A reader should see the bare mark, never
 * `penalty-not-awarded`.
 */
export function detailLine(event: TimelineEventView, copy: EventCopy): string | null {
  switch (eventKind(event)) {
    case 'goal':
      if (event.subtype === 'penalty') return copy.penalty;
      return event.related ? copy.assist(event.related.name) : null;
    case 'own-goal':
      return copy.ownGoal;
    case 'red':
      return event.subtype === 'second-yellow' ? copy.secondYellow : null;
    case 'sub':
      return event.related ? copy.off(event.related.name) : null;
    case 'var':
      return (event.subtype && copy.varLabels[event.subtype]) || null;
    case 'missed-penalty':
      return (event.subtype && copy.missedLabels[event.subtype]) || null;
    default:
      return null;
  }
}

/**
 * The React key for one timeline row.
 *
 * ⚠⚠ **Composed, never `id` — and that is not a workaround for the live shape
 * lacking one** (ADR 0051). The panel switches SOURCE mid-match: live events
 * while the match is played, the durable stored rows once it ends. Keying the
 * first on an index and the second on `id` would remount every row at exactly
 * that handover. One rule for both keeps it seamless, and the durable `id` is
 * simply not needed to tell two rows apart on screen.
 *
 * ⚠ `index` is the tiebreaker, not the identity: two substitutions can share a
 * minute, a team and even a period, and a genuine duplicate must still render
 * twice rather than collapsing into one row.
 */
export function eventKey(event: TimelineEventView, index: number): string {
  return [
    event.type,
    event.minute ?? '',
    event.minuteExtra ?? '',
    event.teamSlug ?? '',
    event.player.name,
    index,
  ].join('|');
}
