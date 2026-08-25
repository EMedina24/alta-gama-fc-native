/**
 * The H/A tag and its venue line.
 *
 * ⚠ `L`/`V` in Spanish (local/visitante), not `H`/`A` — it comes off
 * `phrases.home`/`phrases.away`, so this component never sees a language.
 */
import { StyleSheet, View } from 'react-native';

import { Pill, Text } from '@/components/atoms';
import { Spacing } from '@/constants/theme';

export interface HomeAwayTagProps {
  /** Already localised by the caller. */
  tag: string;
  venue?: string | null;
  city?: string | null;
}

export function HomeAwayTag({ tag, venue, city }: HomeAwayTagProps) {
  // ⚠ `city` is null on every LaLiga, PL and Bundesliga club — only Serie A
  // states it. `filter(Boolean)` is what keeps the separator from dangling.
  const place = [venue, city].filter(Boolean).join(' · ');
  return (
    <View style={styles.row}>
      <Pill label={tag} />
      {place ? (
        <Text variant="footnote" color="textDim" numberOfLines={1} style={styles.place}>
          {place}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  place: { flexShrink: 1 },
});
