/**
 * The sign-in sheet.
 *
 * ⚠⚠ **Guideline 4.8 governs this layout, not taste.** Shipping Google without
 * an equivalent private option is a rejection, and "equivalent" is about
 * PRESENTATION as well as presence: Apple must be at least as prominent — same
 * width, same order of reading, not below a fold, not styled as the lesser
 * option. Apple goes FIRST here and both buttons are the same height. Do not
 * "improve" this by promoting Google.
 *
 * ⚠ Apple's button must be Apple's own component — its chrome, corner radius and
 * label wording are prescribed, and a hand-drawn lookalike is a rejection of its
 * own. `HEIGHT` is shared so the Google button matches it exactly.
 *
 * ⚠ Two-view-deep sticky bar and `flex: 1` collapsing inside a `formSheet`: see
 * the header comment in [`account-sheet.tsx`](./account-sheet.tsx). The same two
 * traps apply here and for the same reasons.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Copy } from '@/lib/i18n/copy';

/** Apple's button and ours, at one height. See the 4.8 note above. */
const HEIGHT = 50;

export interface SignInSheetProps {
  copy: Copy;
  /**
   * ⚠ False in practice only on a simulator with no Apple ID signed in —
   * `isAvailableAsync()` is true on every device that can run this app, since the
   * deployment target is well above iOS 13.
   *
   * ⚠ When false the sheet falls back to Google alone. That is **not** a Guideline
   * 4.8 problem: 4.8 governs what the app OFFERS, and Apple is offered wherever
   * the OS can honour it. Hiding Google to match would leave a simulator with no
   * way to sign in at all, which is worse for no policy gain.
   */
  appleAvailable: boolean;
  busy: boolean;
  /** Chosen from an `AuthFailure` by the route, already localised. */
  error: string | null;
  onApple: () => void;
  onGoogle: () => void;
  onClose: () => void;
}

export function SignInSheet({
  copy,
  appleAvailable,
  busy,
  error,
  onApple,
  onGoogle,
  onClose,
}: SignInSheetProps) {
  const a = copy.auth;

  return (
    <ScrollView contentContainerStyle={styles.wrap} stickyHeaderIndices={[0]}>
      <View style={styles.bar}>
        <View style={styles.barRow}>
          <Text variant="callout" color="textSecondary">
            {copy.account.signIn}
          </Text>
          <Button label={copy.sheets.close} tone="quiet" full={false} onPress={onClose} />
        </View>
      </View>

      <View style={styles.intro}>
        <Text variant="title3">{a.title}</Text>
        <Text variant="footnote" color="textDim">
          {a.body}
        </Text>
      </View>

      <View style={styles.actions}>
        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            // ⚠ The app is dark-only (`userInterfaceStyle: 'dark'`), so the WHITE
            // variant is the legible one. BLACK would vanish into the sheet.
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={Radius.control}
            style={styles.apple}
            onPress={onApple}
          />
        ) : null}

        <View style={styles.google}>
          <Button
            label={a.google}
            tone="secondary"
            loading={busy}
            onPress={onGoogle}
          />
        </View>
      </View>

      {error ? (
        <Text variant="footnote" color="danger">
          {error}
        </Text>
      ) : null}

      <Text variant="footnote" color="textFaint">
        {a.legal}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { marginHorizontal: -Spacing.five, backgroundColor: Colors.dark.card },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.five,
    paddingRight: Spacing.one,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.one,
  },
  wrap: { paddingHorizontal: Spacing.five, paddingBottom: Spacing.eight, gap: Spacing.three },
  intro: { gap: Spacing.one, marginBottom: Spacing.two },
  actions: { gap: Spacing.two },
  // ⚠ Apple's button draws nothing without an explicit height — it has no
  // intrinsic size, so omitting this renders a zero-height, invisible control.
  apple: { height: HEIGHT },
  // The Button atom sizes from `minHeight: Size.minTouch` (44). Matching Apple's
  // height is what keeps the two visually equivalent, per the 4.8 note.
  google: { minHeight: HEIGHT, justifyContent: 'center' },
});
