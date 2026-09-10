/**
 * The shell every Season stats card shares: a `Tray`, an eyebrow, an optional
 * right-hand meta line, and the card's own body (ADR 0141).
 *
 * ⚠ It is a `Tray` and not a new surface. The design's card — outer 26 radius
 * over a 5pt glass band, inner 21 over `#13161a`, a one-pixel top light —
 * is `Tray`'s geometry to the point, so a second implementation would be a
 * duplicate that drifts (ADR 0090/0091).
 *
 * ⚠ **A card with nothing to say is not rendered by this component; it is not
 * rendered by its CALLER.** There is deliberately no `empty` prop: the rule
 * (ADR 0143) is that a null event-derived field means "we do not know", and the
 * honest rendering of that is the card's absence plus one line elsewhere
 * saying why — not a card full of dashes, and not a card that decides on its
 * own that it has no content.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Eyebrow, Text } from '@/components/atoms';
import { Tray } from './tray';
import { Spacing } from '@/constants/theme';

export interface StatCardProps {
  label: string;
  /** A quiet right-aligned line on the eyebrow row — "MD9 → MD29". */
  meta?: string;
  /** A richer right-hand block, where `meta`'s single line is not enough. */
  accessory?: ReactNode;
  children: ReactNode;
}

export function StatCard({ label, meta, accessory, children }: StatCardProps) {
  return (
    <Tray>
      <View style={styles.body}>
        <View style={styles.head}>
          <Eyebrow small>{label}</Eyebrow>
          {accessory ??
            (meta ? (
              <Text variant="eyebrowSm" color="textMuted" tabular>
                {meta}
              </Text>
            ) : null)}
        </View>
        {children}
      </View>
    </Tray>
  );
}

const styles = StyleSheet.create({
  body: { padding: Spacing.four, gap: Spacing.three },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
