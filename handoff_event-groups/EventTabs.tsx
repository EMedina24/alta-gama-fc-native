// Match events grouping — reference implementation.
// Values match export/match-events-grouping/GROUPING.md.

export type EventKind = 'goal' | 'yellow' | 'red' | 'sub';
export type EventGroup = 'goals' | 'cards' | 'subs';

export interface MatchEvent {
  minute: string;                 // "63" | "90+2" — verbatim
  kind: EventKind;
  side: 'home' | 'away';
  player: string;                 // scorer / booked / coming on
  assist?: string;                // goal only
  replaced?: string;              // sub only
  penalty?: boolean;
  secondYellow?: boolean;         // red only
}

export const GROUPS: EventGroup[] = ['goals', 'cards', 'subs'];

// yellow + red share one group: a card is a card to someone scanning, and splitting
// them would leave two one-row tabs. Row glyph colour still distinguishes them.
export function groupOf(kind: EventKind): EventGroup {
  if (kind === 'goal') return 'goals';
  if (kind === 'sub') return 'subs';
  return 'cards';
}

export function countsFor(events: MatchEvent[]): Record<EventGroup, number> {
  return {
    goals: events.filter(e => groupOf(e.kind) === 'goals').length,
    cards: events.filter(e => groupOf(e.kind) === 'cards').length,
    subs: events.filter(e => groupOf(e.kind) === 'subs').length,
  };
}

// The group a freshly opened row should land on.
export function initialGroup(events: MatchEvent[]): EventGroup {
  const n = countsFor(events);
  return GROUPS.find(g => n[g] > 0) ?? 'goals';
}

export const TAB_STYLE = {
  track:        { borderRadius: 10, padding: 3, gap: 3, marginBottom: 12 },
  trackBg:      { onPanel: '#15171A', inLiveCard: '#101317' },
  segment:      { flex: 1, height: 28, borderRadius: 8, gap: 6 },
  segmentOnBg:  '#242830',
  label:        { weight: '700', size: 11, tracking: '0.02em',
                  active: '#F4F6F6', idle: '#7C858B', empty: '#3D444A' },
  count:        { weight: '700', size: 11 - 1, tabular: true,
                  active: '#C8F25A', idle: '#59626A', empty: '#3D444A' },
} as const;

/**
 * Row state for the three segments. An empty group is rendered dimmed and is NOT
 * interactive — it is never hidden, because "no bookings in a four-goal game" is
 * information worth showing.
 */
export function tabsFor(
  events: MatchEvent[],
  active: EventGroup,
  labels: Record<EventGroup, string>,
) {
  const n = countsFor(events);
  const shown: EventGroup = n[active] > 0 ? active : initialGroup(events);
  return GROUPS.map(g => {
    const isActive = g === shown;
    const isEmpty = n[g] === 0;
    return {
      group: g,
      label: labels[g],
      count: n[g],
      active: isActive,
      disabled: isEmpty,
      background: isActive ? TAB_STYLE.segmentOnBg : 'transparent',
      labelColor: isActive ? TAB_STYLE.label.active
                : isEmpty  ? TAB_STYLE.label.empty
                : TAB_STYLE.label.idle,
      countColor: isActive ? TAB_STYLE.count.active
                : isEmpty  ? TAB_STYLE.count.empty
                : TAB_STYLE.count.idle,
    };
  });
}

/** Events for the shown group, in feed order. Never re-sort inside a group. */
export function eventsFor(events: MatchEvent[], active: EventGroup): MatchEvent[] {
  const n = countsFor(events);
  const shown: EventGroup = n[active] > 0 ? active : initialGroup(events);
  return events.filter(e => groupOf(e.kind) === shown);
}
