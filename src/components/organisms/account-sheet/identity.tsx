/**
 * The account sheet's identity block (ADR 0081): the avatar, who you are, and
 * — signed out — the one primary this sheet has.
 *
 * ⚠ Laid out as a ROW, avatar beside the heading, which is the arrangement the
 * original handoff drew (`screenshots/10-sheet-account.png`) and never got
 * built. It is also the one that fits: this sheet opens at the full detent and
 * still scrolls, so the identity cannot spend a stacked block's height.
 *
 * ⚠ The `VERIFIED` pill in that screenshot is still deliberately NOT drawn.
 * Nothing in `GET /cronogol/me` reports verification, and a pill asserting it
 * from a provider guess is worse than no pill (ADR 0038).
 *
 * ⚠ The heading is `name ?? email ?? someone`. An Apple account whose one
 * naming chance was missed has neither, and an empty heading reads as a broken
 * sheet.
 */
import { StyleSheet, View } from 'react-native';

import { Avatar, Text } from '@/components/atoms';
import { Size, Spacing } from '@/constants/theme';

export interface IdentityProps {
  /** `null` while signed out — the avatar falls back to the mark. */
  initials: string | null;
  heading: string;
  /** The email signed in, the invitation signed out. `null` draws nothing. */
  sub: string | null;
  signedIn: boolean;
}

export function Identity({ initials, heading, sub, signedIn }: IdentityProps) {
  return (
    <View style={styles.row}>
      {/* The ring is the sheet's mark of a signed-in reader, and its one
          lime element while signed in — the sign-in button takes that budget
          when it is on screen instead (SPEC §2). */}
      <Avatar initials={initials} size={Size.avatarLg} ring={signedIn} />
      <View style={styles.text}>
        <Text variant="title3" numberOfLines={2}>
          {heading}
        </Text>
        {sub ? (
          <Text variant="footnote" color="textDim" numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.two,
  },
  text: { flex: 1, minWidth: 0, gap: Spacing.one },
});
