/**
 * The LIVE DECK (ADR 0126): every followed match in play RIGHT NOW, stacked in
 * the crown where the solo plate stands — the same `CardDeck` stack NEXT UP
 * uses (ADR 0113), so two matches at once shuffle exactly like two kickoffs on
 * one day. The screen renders this only at two-plus boards; one match is the
 * solo `LivePlate`, exactly as before.
 *
 * ⚠⚠ **Deck plates are OPAQUE (`surface="opaque"`), 0113's rule for 0113's
 * reason:** anything behind a translucent card shows through it (trap 59), and
 * `plateDark` is 80% paint, not a wall. The opaque variant composites the same
 * paint over the baked crown, so the lead looks like the solo plate while the
 * waiting layers ghost nothing.
 *
 * ⚠ **One events panel, on the lead only.** `openId` is which card holds it —
 * cleared on every shuffle commit, because a panel mid-flight would re-anchor
 * under a different match's score. Waiting layers never take touches
 * (`CardDeck` gates them), so a peeking disclosure strip cannot open a hidden
 * card's panel. While a panel is open the deck un-merges its VoiceOver stop so
 * the timeline's rows are explorable; the `activate` action is how a merged
 * stop reaches the toggle at all.
 *
 * ⚠ **Cards keep their own truth.** A mixed deck — a route card at 67′ beside
 * a sweep card captioned "as of the last check" — is the point of the tier
 * union (ADR 0126): each plate's note states its own source, and this
 * organism adds nothing over `LivePlate`'s honesty contract.
 *
 * ⚠ **The shuffle is a peek, not a preference.** The screen keys this
 * organism by the deck's membership, so a match ending or joining remounts it
 * with the earliest kickoff back on top. Nothing here persists.
 *
 * ⚠ No data fetching (ADR 0013): the screen resolves every plate's props;
 * this organism only words the labels, picks the surface and holds `openId`.
 */
import { useState } from 'react';

import type { Copy } from '@/lib/i18n/copy';
import { CardDeck } from './card-deck';
import { LivePlate, type LivePlateProps } from './live-plate';

/** One fully-resolved plate — exactly what the screen's `liveCard()` builds. */
export interface LiveDeckCard
  extends Omit<
    LivePlateProps,
    'copy' | 'events' | 'id' | 'surface' | 'eventsOpen' | 'onToggleEvents'
  > {
  /**
   * The fixture's own id — layer identity, the events-panel key and the
   * caller's reset key. ⚠ Required, unlike the solo plate's nullable `id`:
   * every board the deck stacks is built from a real fixture or live row,
   * and a layer without identity cannot be measured or gated.
   */
  id: string;
}

export interface LiveDeckProps {
  /** In-play boards, earliest kickoff first. The screen never sends fewer than two. */
  cards: readonly LiveDeckCard[];
  copy: LivePlateProps['copy'] & {
    deckOf: (position: number, total: number) => string;
    deckNext: string;
    deckPrevious: string;
  };
  events: Copy['events'];
}

export function LiveDeck({ cards, copy, events }: LiveDeckProps) {
  /** Which card holds the events panel open — the lead or nobody. */
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <CardDeck
      cards={cards}
      merged={openId === null}
      renderCard={(card, { isTop }) => (
        <LivePlate
          {...card}
          surface="opaque"
          copy={copy}
          events={events}
          // ⚠ `isTop` as well as `openId`: a remount-free lead change (none
          // exists today, but the guard is one term) must never leave a
          // waiting layer holding an expanded panel under the stack.
          eventsOpen={isTop && openId === card.id}
          onToggleEvents={() => setOpenId((open) => (open === card.id ? null : card.id))}
        />
      )}
      // ⚠ The label carries what the merged stop hides: the pill's claim, the
      // pairing with its score (or the honest no-score), the minute, and the
      // position the decorative dots only draw.
      label={(lead, position, total) =>
        [
          copy.inProgress,
          lead.home.goals !== null && lead.away.goals !== null
            ? `${lead.home.name} ${lead.home.goals}, ${lead.away.name} ${lead.away.goals}`
            : `${lead.home.name} v ${lead.away.name}, ${copy.noScore}`,
          lead.minute,
          copy.deckOf(position, total),
        ]
          .filter(Boolean)
          .join(', ')
      }
      actions={{ next: copy.deckNext, previous: copy.deckPrevious, activate: events.title }}
      // A kicked-off lead has no panel to open (`LivePlate` withholds the
      // disclosure); the action is simply inert there, as the chevron is absent.
      onActivate={(lead) => {
        if (lead.awaitingUpdate) return;
        setOpenId((open) => (open === lead.id ? null : lead.id));
      }}
      // ⚠ On COMMIT, never mid-drag — a reflow under a moving finger is worse
      // than a tall card in flight.
      onShuffle={() => setOpenId(null)}
    />
  );
}
