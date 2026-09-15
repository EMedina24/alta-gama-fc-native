/**
 * The LIVE CAROUSEL (ADR 0176, succeeding 0126's deck): every followed match
 * in play RIGHT NOW, paged in the crown where the solo plate stands — the
 * same `CardCarousel` NEXT UP rides, so two matches at once page exactly
 * like two kickoffs on one day. The screen renders this only at two-plus
 * boards; one match is the solo `LivePlate`, exactly as before.
 *
 * ⚠ Plates are GLASS — the solo plate's own `plateDark` paint. The deck's
 * opaque variant retired with the stack (ADR 0176): side by side, nothing
 * sits behind a plate to ghost through it, and the baked brand crown it
 * composited would be the wrong crown over a league/club background (0175).
 *
 * ⚠ **One events panel, on the current page only.** `openId` is which card
 * holds it — cleared on every page settle, because a panel travelling with
 * a page change would re-anchor under a different match's score. Off-page
 * cards never take touches (`CardCarousel` gates them), so a neighbouring
 * disclosure cannot open an off-screen card's panel. While a panel is open
 * the carousel un-merges its VoiceOver stop so the timeline's rows are
 * explorable; the `activate` action is how a merged stop reaches the toggle
 * at all.
 *
 * ⚠ **Cards keep their own truth.** A mixed set — a route card at 67′ beside
 * a sweep card captioned "as of the last check" — is the point of the tier
 * union (ADR 0126): each plate's note states its own source, and this
 * organism adds nothing over `LivePlate`'s honesty contract.
 *
 * ⚠ **The swipe is a peek, not a preference.** The screen keys this organism
 * by the carousel's membership, so a match ending or joining remounts it
 * with the earliest kickoff back on page 0. Nothing here persists.
 *
 * ⚠ No data fetching (ADR 0013): the screen resolves every plate's props;
 * this organism only words the labels and holds `openId`.
 */
import { useState } from 'react';

import type { Copy } from '@/lib/i18n/copy';
import { CardCarousel } from './card-carousel';
import { LivePlate, type LivePlateProps } from './live-plate';

/** One fully-resolved plate — exactly what the screen's `liveCard()` builds. */
export interface LiveCarouselCard
  extends Omit<LivePlateProps, 'copy' | 'events' | 'id' | 'eventsOpen' | 'onToggleEvents'> {
  /**
   * The fixture's own id — page identity, the events-panel key and the
   * caller's reset key. ⚠ Required, unlike the solo plate's nullable `id`:
   * every board the carousel pages is built from a real fixture or live row,
   * and a page without identity cannot be keyed or gated.
   */
  id: string;
}

export interface LiveCarouselProps {
  /** In-play boards, earliest kickoff first. The screen never sends fewer than two. */
  cards: readonly LiveCarouselCard[];
  copy: LivePlateProps['copy'] & {
    deckOf: (position: number, total: number) => string;
    deckNext: string;
    deckPrevious: string;
  };
  events: Copy['events'];
}

export function LiveCarousel({ cards, copy, events }: LiveCarouselProps) {
  /** Which card holds the events panel open — the current page or nobody. */
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <CardCarousel
      cards={cards}
      merged={openId === null}
      renderCard={(card, { isTop }) => (
        <LivePlate
          {...card}
          copy={copy}
          events={events}
          // ⚠ `isTop` as well as `openId`: a remount-free page change (none
          // exists today, but the guard is one term) must never leave an
          // off-screen card holding an expanded panel.
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
      // A kicked-off card has no panel to open (`LivePlate` withholds the
      // disclosure); the action is simply inert there, as the chevron is absent.
      onActivate={(lead) => {
        if (lead.awaitingUpdate) return;
        setOpenId((open) => (open === lead.id ? null : lead.id));
      }}
      // ⚠ On SETTLE, never mid-drag — a reflow under a moving finger is worse
      // than a tall card in flight (ADR 0126's rule, kept by 0176).
      onSettle={() => setOpenId(null)}
    />
  );
}
