/**
 * VoiceOver's way to a club from a match row (ADR 0191).
 *
 * ⚠ **Why this exists:** an expandable row is ONE accessible stop — its
 * `accessibilityLabel` reads the whole match, which is what stops VoiceOver
 * walking crest, name, goal six times. The price is that the crest links
 * nested inside it cannot be focused at all. Custom actions put them back on
 * the row's rotor ("Open Brentford", "Open Chelsea") without splitting it.
 *
 * ⚠ Only a side that passes the gate gets an action — the same rule as the
 * crest itself: never offer a link that cannot be honoured.
 */
import type { AccessibilityActionEvent, AccessibilityActionInfo } from 'react-native';

import type { TeamRef } from '@/lib/cronogol/types';

export interface ClubLinkA11y {
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
}

export function clubLinkA11y(
  sides: readonly { team: TeamRef | null; name: string }[],
  open: ((slug: string) => void) | undefined,
  canOpen: ((slug: string) => boolean) | undefined,
  label: (name: string) => string,
): ClubLinkA11y {
  if (!open || !canOpen) return {};
  const linkable = sides.filter(
    (side): side is { team: TeamRef; name: string } => !!side.team && canOpen(side.team.slug),
  );
  if (linkable.length === 0) return {};
  return {
    accessibilityActions: linkable.map((side) => ({
      name: `open:${side.team.slug}`,
      label: label(side.name),
    })),
    onAccessibilityAction: (event) => {
      const slug = event.nativeEvent.actionName.replace(/^open:/, '');
      if (linkable.some((side) => side.team.slug === slug)) open(slug);
    },
  };
}
