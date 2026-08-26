/**
 * The `Vs` between the two crests of the next-up card (ADR 0034).
 *
 * A ring rather than a bare glyph: at `Size.crestNext` the two crests are the
 * loudest things on the card, and a 14.5pt lowercase `v` floating between them
 * read as a leftover rather than a mark. The ring is accent — it echoes the
 * card's own border, the only other accent on it — but the lettering inside is
 * white: two accent elements that close together fought each other, and the
 * ring is the shape that carries the colour.
 *
 * ⚠ `accessible={false}` — the pairing is labelled once, on the parent. A
 * VoiceOver stop that says only "Vs" between two club names is noise.
 */
import { StyleSheet, View } from 'react-native';

import { Text } from './text';
import { Colors, Radius, Size } from '@/constants/theme';

export function VersusBadge() {
  return (
    <View style={styles.badge} accessible={false}>
      <Text variant="eyebrow" color="text" style={styles.glyph}>
        Vs
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: Size.versusBadge,
    height: Size.versusBadge,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.dark.accentRing,
    backgroundColor: Colors.dark.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * ⚠ Overrides two things `Type.eyebrow` carries for column heads and that a
   * two-letter mark does not want: the uppercase transform (this reads `Vs`,
   * not `VS`) and the 1.8 tracking, which at two glyphs inside a ring set them
   * so far apart they read as `V S`. Neither is a theme value — the tokens
   * still own every size and colour here.
   */
  glyph: { textTransform: 'none', letterSpacing: 0.3 },
});
