/**
 * The NEXT UP CAROUSEL (ADR 0176, succeeding 0113's deck): every same-day
 * fixture of a followed club, paged in the crown where the single card
 * stands. The mechanics — snap, dots, the one-VoiceOver-stop contract —
 * are `CardCarousel`; what lives HERE is what makes a carousel of NEXT UP
 * cards.
 *
 * ⚠ Cards are GLASS, the single card's own surface — the deck's opaque
 * variant retired with the stack (ADR 0176): side by side, nothing sits
 * behind a card, and a baked brand ground would paint the wrong crown over
 * a league/club background (ADR 0175).
 *
 * ⚠ **Every card stays MOUNTED, always** — `CardCarousel` renders all pages,
 * and for THIS carousel that is not a nicety: a card's own `Countdown` is
 * the only thing on the screen that can observe its kickoff (ADR 0052/0078,
 * traps 21/35), and an off-screen card whose match kicks off must still
 * announce it so the crown hands over to the live tiers.
 *
 * ⚠ **The swipe is a peek, not a preference.** The screen keys this organism
 * by the carousel's membership, so any data change remounts it with the
 * soonest kickoff back on page 0. Nothing here persists.
 *
 * ⚠ No data fetching (ADR 0013): the screen resolves every card's props;
 * this organism only words the labels.
 */
import { CardCarousel } from './card-carousel';
import { NextUpCard, type NextUpCardProps } from './next-up-card';

/** One fully-resolved card — exactly what the screen hands `NextUpCard`. */
export interface CarouselCard extends Omit<NextUpCardProps, 'copy'> {
  /** The fixture's own id — page identity, and half the caller's reset key. */
  id: string;
}

export interface NextUpCarouselProps {
  /** Same-day cards, soonest first. The screen never sends fewer than two. */
  cards: readonly CarouselCard[];
  copy: NextUpCardProps['copy'] & {
    deckOf: (position: number, total: number) => string;
    deckNext: string;
    deckPrevious: string;
  };
}

export function NextUpCarousel({ cards, copy }: NextUpCarouselProps) {
  return (
    <CardCarousel
      cards={cards}
      renderCard={(card) => <NextUpCard {...card} copy={copy} />}
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
