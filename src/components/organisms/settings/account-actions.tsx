/**
 * Settings' account card (ADR 0208): Sign out and Delete account, in red, in
 * their own group at the foot of the screen — the Medina mock's Sign out card,
 * with Delete beside it.
 *
 * ⚠ Drawn ONLY when signed in. Signed out there is no account to leave or
 * delete; "turn off alerts" (under NOTIFICATIONS) is the one destructive thing
 * a signed-out reader has.
 *
 * ⚠⚠ Delete stays, although the mock has no such row: Apple's Guideline
 * 5.1.1(v) requires in-app deletion for any app that creates accounts. It is
 * a TWO-STEP confirm because the server has no undo — the first press arms it
 * and brings up the note, which is what makes the second press informed
 * consent rather than a double tap.
 *
 * ⚠ The arm is local state on purpose: leaving the screen disarms it, so a
 * confirm cannot survive out of sight of the warning that explains it.
 *
 * ⚠ A failed delete shows a red PANEL (ADR 0074) that says the account is
 * STILL ALIVE; the route keeps the reader signed in, because signing them out
 * would look exactly like success.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Orb, Text } from '@/components/atoms';
import { ListGroup, SettingsRow, StatusBanner } from '@/components/molecules';
import { Motion, Spacing } from '@/constants/theme';
import type { Copy } from '@/lib/i18n/copy';
import { hapticArmed } from '@/lib/haptics';

export interface AccountActionsProps {
  copy: Copy['account'];
  onSignOut: () => void;
  /** ⚠ Fires only on the SECOND press. The first arms the confirm. */
  onDeleteAccount: () => void;
  deleting: boolean;
  /** Localised already. Non-null means the account is STILL ALIVE. */
  deleteError: string | null;
}

export function AccountActions({
  copy: a,
  onSignOut,
  onDeleteAccount,
  deleting,
  deleteError,
}: AccountActionsProps) {
  const reduceMotion = useReducedMotion();
  const [armed, setArmed] = useState(false);

  return (
    <View style={styles.stack}>
      <ListGroup>
        <SettingsRow title={a.signOut} tone="danger" onPress={onSignOut} />
        <SettingsRow
          title={armed ? a.deleteAccountConfirm : a.deleteAccount}
          tone="danger"
          trailing={
            deleting ? <Orb state="solving" tone="accent" accessibilityLabel={a.deleteAccount} /> : null
          }
          onPress={() => {
            if (deleting) return;
            if (!armed) {
              // The one tap on this screen that commits to something the server
              // cannot undo. It should not feel like the others.
              void hapticArmed();
              setArmed(true);
              return;
            }
            onDeleteAccount();
          }}
        />
      </ListGroup>

      {deleteError ? <StatusBanner kind="error" text={deleteError} /> : null}

      {/* ⚠ Only once armed — see the header. An entering FADE is safe here: this
          note is a sibling of the glass group, never its ancestor. */}
      {armed ? (
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(Motion.base)}>
          <Text variant="footnote" color="textFaint" style={styles.note}>
            {a.deleteAccountNote}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.two },
  note: { paddingHorizontal: Spacing.four },
});
