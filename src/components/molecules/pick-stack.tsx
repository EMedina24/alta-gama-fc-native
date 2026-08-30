/**
 * The picked clubs, as an overlapping stack of crests inside the onboarding
 * CTA (ADR 0076). This is the feedback ADR 0056 said only the footer's count
 * could give: a club picked in another league is visibly still held.
 *
 * ⚠ Sits INSIDE the primary button, so the discs are `onAccent` — a dark disc
 * on lime, never lime on lime (SPEC §2). Caps at three; the label carries the
 * true count.
 */
import { StyleSheet, View } from 'react-native';

import { Crest } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface PickStackItem {
  slug: string;
  src: string | null;
  fallback: string;
}

export interface PickStackProps {
  items: readonly PickStackItem[];
}

const SHOWN = 3;

export function PickStack({ items }: PickStackProps) {
  if (items.length === 0) return null;
  return (
    <View style={styles.row} accessible={false}>
      {items.slice(0, SHOWN).map((item, i) => (
        <View key={item.slug} style={[styles.disc, i > 0 && styles.overlap]}>
          <Crest src={item.src} fallback={item.fallback} size={Size.ctaDiscCrest} tone="faint" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  disc: {
    width: Size.ctaDisc,
    height: Size.ctaDisc,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dark.onAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlap: { marginLeft: -Spacing.two - 2 },
});
