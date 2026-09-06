/**
 * The NEXT UP DECK (ADR 0113): every same-day fixture of a followed club,
 * stacked in the crown where the single card stands today. The stack itself —
 * gesture, springs, depth worklets, haptic, dots, the one-VoiceOver-stop
 * contract — is `CardDeck`, extracted verbatim when the live plates joined the
 * pattern (ADR 0126); what lives HERE is what makes a deck of NEXT UP cards.
 *
 * ⚠⚠ **Deck cards are OPAQUE (`surface="opaque"`), and that is load-bearing.**
 * Anything behind a GLASS card shows through it — text ghosts, featureless
 * fills glow (trap 59) — which had forced the waiting layers down to
 * near-black slivers that read as a pasted slab. On an opaque lead the
 * waiting cards are simply VISIBLE, real cards dimmed by a scrim that fades
 * off the next one as the drag reveals it — the approved mock's exact look.
 * The single NEXT UP card keeps its liquid glass (ADR 0096); opacity is the
 * deck's own deviation, recorded in ADR 0113.
 *
 * ⚠ **Every card stays MOUNTED, always** — `CardDeck` hides waiting layers
 * without unmounting them, and for THIS deck that is not a nicety: a card's
 * own `Countdown` is the only thing on the screen that can observe its
 * kickoff (ADR 0052/0078, traps 21/35), and a hidden card whose match kicks
 * off must still announce it so the crown hands over to the live tiers. The
 * cost is one wall-second tick per card, each re-rendering only its own
 * countdown row.
 *
 * ⚠ **The shuffle is a peek, not a preference.** The screen keys this
 * organism by the deck's membership, so any data change remounts it with the
 * soonest kickoff back on top. Nothing here persists.
 *
 * ⚠ No data fetching (ADR 0013): the screen resolves every card's props; this
 * organism only words the labels and picks the surface.
 */
import { CardDeck } from './card-deck';
import { NextUpCard, type NextUpCardProps } from './next-up-card';

/** One fully-resolved card — exactly what the screen hands `NextUpCard`. */
export interface DeckCard extends Omit<NextUpCardProps, 'copy'> {
  /** The fixture's own id — layer identity, and half the caller's reset key. */
  id: string;
}

export interface NextUpDeckProps {
  /** Same-day cards, soonest first. The screen never sends fewer than two. */
  cards: readonly DeckCard[];
  copy: NextUpCardProps['copy'] & {
    deckOf: (position: number, total: number) => string;
    deckNext: string;
    deckPrevious: string;
  };
}

export function NextUpDeck({ cards, copy }: NextUpDeckProps) {
  return (
    <CardDeck
      cards={cards}
      renderCard={(card) => <NextUpCard {...card} surface="opaque" copy={copy} />}
      // ⚠ The label carries what the merged stop hides: the pairing, the
      // kickoff, and the position the decorative dots only draw.
      label={(lead, position, total) =>
        [
          `${lead.home.name} v ${lead.away.name}`,
          lead.kickoffTbd ? copy.tbd : `${lead.dateLabel} ${lead.kickoffLabel}`,
          copy.deckOf(position, total),
        ].join(', ')
      }
      actions={{ next: copy.deckNext, previous: copy.deckPrevious }}
    />
  );
}
