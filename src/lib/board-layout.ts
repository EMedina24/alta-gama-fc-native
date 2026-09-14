/**
 * The Board's CARD CATALOGUE and the pure rules over a reader's layout (ADR
 * 0174) — which panels the Today board can draw, in what order, and which of
 * them are put away.
 *
 * ⚠ **Pure, and deliberately native-free.** It is imported by the store, by the
 * screen and by `scripts/board-layout-harness.mjs`, which runs it in plain node
 * — the repo's rule for logic worth pinning. Nothing here may import a
 * component, a theme token or a native module.
 *
 * ⚠⚠ **The catalogue is the ORDER's vocabulary, not the screen's.** A stored
 * layout is a list of ids written by a build that may be older than this one, so
 * every read goes through `normalizeLayout`: unknown ids are dropped and ids the
 * reader has never seen are INSERTED at their default neighbourhood. Without
 * that second half, a card added in a later release would be invisible forever
 * to every install that already stored a layout — the layout would pin the
 * catalogue it was written against.
 *
 * ⚠ `built: false` is a card this app DECLARES but cannot yet draw — `table` and
 * `season`, which have no board organism (ADR 0174 §6). They are held in the
 * order and filtered at the render layer, never filtered out of the stored
 * value: building one is then a one-flag change and nobody's arrangement
 * resets. They are also not COUNTED — the hint bar's "N OF M ON" says what the
 * reader can actually see and put back, and a total naming two cards that appear
 * in neither the stack nor the tray is a number with nothing behind it.
 */

export type BoardCardId =
  | 'last'
  | 'news'
  | 'results'
  | 'upcoming'
  | 'counters'
  | 'table'
  | 'season';

export interface BoardCard {
  id: BoardCardId;
  /** Off on a fresh install — the reader adds it from the tray. */
  defaultHidden: boolean;
  /** Whether this build has an organism for it. See the header. */
  built: boolean;
}

/**
 * The catalogue, in DEFAULT ORDER — this array's order is the default layout.
 *
 * ⚠ The order is [0063](../../.claude/decisions/0063-next-up-leads-the-board.md)'s
 * editorial ranking, minus the lead card: live and NEXT UP are the CROWN's
 * payload (0088/0095), pinned, and are not cards here at all.
 */
export const BOARD_CARDS: readonly BoardCard[] = [
  { id: 'last', defaultHidden: false, built: true },
  { id: 'news', defaultHidden: false, built: true },
  { id: 'results', defaultHidden: false, built: true },
  { id: 'upcoming', defaultHidden: false, built: true },
  { id: 'counters', defaultHidden: false, built: true },
  { id: 'table', defaultHidden: true, built: false },
  { id: 'season', defaultHidden: true, built: false },
];

export const DEFAULT_ORDER: readonly BoardCardId[] = BOARD_CARDS.map((card) => card.id);

export const DEFAULT_HIDDEN: readonly BoardCardId[] = BOARD_CARDS.filter(
  (card) => card.defaultHidden,
).map((card) => card.id);

/** How many cards this build can actually draw — the hint bar's total. */
export const BUILT_COUNT = BOARD_CARDS.filter((card) => card.built).length;

export interface BoardLayout {
  /** Every catalogue id exactly once, the reader's order — hidden ones included. */
  order: readonly BoardCardId[];
  /** A subset of `order`. Never holds an id that is not in it. */
  hidden: readonly BoardCardId[];
}

export const DEFAULT_LAYOUT: BoardLayout = { order: DEFAULT_ORDER, hidden: DEFAULT_HIDDEN };

function findCard(id: BoardCardId): BoardCard {
  // Total by construction: `id` is only ever a value that `isBoardCardId` admitted.
  return BOARD_CARDS.find((card) => card.id === id) as BoardCard;
}

export function isBoardCardId(value: unknown): value is BoardCardId {
  return typeof value === 'string' && BOARD_CARDS.some((card) => card.id === value);
}

export function isBuilt(id: BoardCardId): boolean {
  return findCard(id).built;
}

/** The ids a raw stored array contributes: catalogue members, deduped, in order. */
function readIds(raw: unknown): BoardCardId[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<BoardCardId>();
  const ids: BoardCardId[] = [];
  for (const entry of raw) {
    if (!isBoardCardId(entry) || seen.has(entry)) continue;
    seen.add(entry);
    ids.push(entry);
  }
  return ids;
}

/**
 * A stored layout, made whole against THIS build's catalogue.
 *
 * ⚠⚠ A card the stored order has never heard of is inserted **after the last
 * card that precedes it in `DEFAULT_ORDER` and is actually present** — not
 * appended, and not at a raw default index, which the reader's own reordering
 * has already invalidated. That keeps a new card beside the cards it was
 * designed to sit with, whatever the reader did to the rest.
 *
 * ⚠ A newly inserted card takes its OWN `defaultHidden`, never "visible because
 * it is not in the stored hidden list" — absence there means the reader never
 * had an opinion, not that they turned it on.
 */
export function normalizeLayout(rawOrder: unknown, rawHidden: unknown): BoardLayout {
  const stored = readIds(rawOrder);
  const order = [...stored];
  const hidden = new Set(readIds(rawHidden).filter((id) => stored.includes(id)));

  for (const card of BOARD_CARDS) {
    if (order.includes(card.id)) continue;

    // The nearest earlier neighbour from the DEFAULT order that survived.
    const before = DEFAULT_ORDER.slice(0, DEFAULT_ORDER.indexOf(card.id))
      .filter((id) => order.includes(id))
      .pop();
    const at = before === undefined ? 0 : order.indexOf(before) + 1;

    order.splice(at, 0, card.id);
    if (card.defaultHidden) hidden.add(card.id);
  }

  // ⚠ Emitted in `order`'s order, not insertion order: two layouts that mean the
  // same thing must serialise identically, or the store's element-wise
  // comparator (ADR 0166) reports a change that never happened.
  return { order, hidden: order.filter((id) => hidden.has(id)) };
}

/** `order` with the card at `from` moved to `to`. Out-of-range is a no-op. */
export function moveCard(
  order: readonly BoardCardId[],
  from: number,
  to: number,
): readonly BoardCardId[] {
  if (from === to) return order;
  if (from < 0 || from >= order.length) return order;
  if (to < 0 || to >= order.length) return order;
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** The cards drawn on the board, in order — visible, and buildable by this app. */
export function visibleCards(layout: BoardLayout): readonly BoardCardId[] {
  return layout.order.filter((id) => !layout.hidden.includes(id) && isBuilt(id));
}

/** The cards offered in the add tray — put away, and buildable by this app. */
export function trayCards(layout: BoardLayout): readonly BoardCardId[] {
  return layout.order.filter((id) => layout.hidden.includes(id) && isBuilt(id));
}

/** `hidden`, with one card put away or brought back. Order follows `order`. */
export function setHidden(
  layout: BoardLayout,
  id: BoardCardId,
  hide: boolean,
): readonly BoardCardId[] {
  const next = new Set(layout.hidden);
  if (hide) next.add(id);
  else next.delete(id);
  return layout.order.filter((entry) => next.has(entry));
}

/**
 * The full order, with the VISIBLE cards rearranged into `visible`'s sequence.
 *
 * ⚠⚠ The reader drags rows, and rows are only the visible, eligible cards — but
 * what is stored is the whole catalogue's order, hidden cards included. This is
 * the join: the slots the visible cards occupy are rewritten in the new
 * sequence, and every other card keeps its absolute position. A hidden card
 * therefore stays between the same two neighbours it was put away between,
 * which is what makes "add it back" return it where it was rather than
 * somewhere plausible.
 *
 * ⚠ `visible` must be a permutation of the visible cards already in `order`.
 * Anything else is ignored rather than inserted — this is called from a gesture,
 * and a drag must never be able to invent a card.
 */
export function applyVisibleOrder(
  order: readonly BoardCardId[],
  visible: readonly BoardCardId[],
): readonly BoardCardId[] {
  const moving = visible.filter((id) => order.includes(id));
  const slots: number[] = [];
  order.forEach((id, i) => {
    if (moving.includes(id)) slots.push(i);
  });
  if (slots.length !== moving.length) return order;

  const next = [...order];
  slots.forEach((slot, i) => {
    next[slot] = moving[i];
  });
  return next;
}
