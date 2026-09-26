/**
 * Edit profile (ADR 0208) — the reader's display name, from Settings' glass
 * "Edit profile" pill. The first screen in the app that WRITES the name; until
 * now only Apple's one-time handover did (`features/auth/apple.ts`).
 *
 * ⚠⚠ `PATCH /cronogol/me` REQUIRES `notifyFixtureChanges` on every call, even
 * when only the name moved — an omitted value is a 400, by design. It is sent
 * back exactly as `GET /cronogol/me` reported it, so saving a name can never
 * flip that setting. Save stays disabled until the account has loaded, because
 * without it there is no honest value to send.
 *
 * ⚠ The name is capped at 60 and trimmed server-side, and an explicit `null` is
 * a 400 — so an empty field is not "clear my name", it is nothing to save.
 *
 * ⚠ The answer is written straight into the account query, so Settings' header
 * and every tab's avatar re-letter the moment the sheet closes, rather than
 * after a refetch.
 *
 * ⚠ `fitToContents` and no `flex: 1` (trap 19): one field and two buttons.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { FormField, StatusBanner } from '@/components/molecules';
import { Spacing } from '@/constants/theme';
import { NotSignedInError, patchAccount } from '@/lib/cronogol/account';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useAccount } from '@/queries/use-account';
import { keys } from '@/queries/keys';
import { useSession } from '@/store/session';

/** The backend's own cap (`UpdateAccountDto.displayName`). */
const NAME_MAX = 60;

export default function EditProfileSheet() {
  const router = useRouter();
  const { copy } = useI18n();
  const queryClient = useQueryClient();
  const session = useSession();
  const account = useAccount();
  const current = account.data?.displayName ?? '';
  const [name, setName] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const canSave =
    account.data !== undefined && trimmed.length > 0 && trimmed !== current && !saving;

  const save = () => {
    if (!canSave || !account.data || !session) return;
    setSaving(true);
    setError(null);
    patchAccount({
      displayName: trimmed,
      notifyFixtureChanges: account.data.notifyFixtureChanges,
    })
      .then((next) => {
        queryClient.setQueryData(keys.account(session.userId), next);
        router.back();
      })
      .catch((cause) => {
        // A dead session has nothing to save into; the sheet goes, and
        // Settings is already showing the signed-out header underneath.
        if (cause instanceof NotSignedInError) {
          router.back();
          return;
        }
        setError(copy.settings.saveFailed);
      })
      .finally(() => setSaving(false));
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text variant="headline" accessibilityRole="header">
        {copy.settings.editProfile}
      </Text>
      <FormField
        label={copy.settings.nameLabel}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={NAME_MAX}
        returnKeyType="done"
        onSubmitEditing={save}
        editable={!saving}
      />
      {error ? <StatusBanner kind="error" text={error} /> : null}
      <Button label={copy.settings.save} onPress={save} disabled={!canSave} loading={saving} />
      <Button label={copy.sheets.close} tone="quiet" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.five, paddingTop: Spacing.six, gap: Spacing.four },
});
