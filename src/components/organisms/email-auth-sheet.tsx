/**
 * The email/password form sheet (ADR 0103), reached from the sign-in sheet's
 * quiet third option. Two modes — Entrar / Crear cuenta — one form, ported
 * from the web's `auth-form.tsx`.
 *
 * ⚠ Two-view-deep sticky bar and `flex: 1` collapsing inside a `formSheet`:
 * see the header comment in [`account-sheet.tsx`](./account-sheet.tsx). The
 * same two traps apply here.
 *
 * ⚠ The NOTICE region is not the ERROR region. An unconfirmed account, a sent
 * confirmation, a reset request — those are neutral (`textSecondary`), never
 * red. Painting them `danger` tells a user who did everything right that
 * something is wrong.
 *
 * ⚠ Enumeration resistance: the reset notice reads the same whether the
 * address has an account or not, and wrong-password/unknown-email arrive here
 * as one already-merged message. Nothing in this layout may split them apart.
 */
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { FormField, SegmentedControl } from '@/components/molecules';
import { Colors, Spacing } from '@/constants/theme';
import type { Copy } from '@/lib/i18n/copy';

/** ⚠ Protocol values (they key autofill hints and the route's flow) — never localised. */
export type EmailAuthMode = 'signin' | 'create';

export interface EmailAuthSheetProps {
  copy: Copy;
  mode: EmailAuthMode;
  /** The route clears error/notice on a switch. */
  onMode: (mode: EmailAuthMode) => void;
  busy: boolean;
  /** Already-localised, mapped from a GoTrue code — never Supabase prose. */
  error: string | null;
  /** Neutral outcomes: confirmSent / confirmFirst / resent / resetSent. */
  notice: string | null;
  /** Draws the resend button under the notice. */
  canResend: boolean;
  /** The 60s lock — label swaps and the button goes inert. */
  resendLocked: boolean;
  onSubmit: (email: string, password: string) => void;
  onResend: (email: string) => void;
  /** The route answers an empty address with `emailFirst`. */
  onForgotPassword: (email: string) => void;
  onClose: () => void;
}

export function EmailAuthSheet({
  copy,
  mode,
  onMode,
  busy,
  error,
  notice,
  canResend,
  resendLocked,
  onSubmit,
  onResend,
  onForgotPassword,
  onClose,
}: EmailAuthSheetProps) {
  const e = copy.emailAuth;
  const create = mode === 'create';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);

  const submittable = email.trim().length > 0 && password.length > 0;
  const submit = () => {
    if (submittable && !busy) onSubmit(email.trim(), password);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      stickyHeaderIndices={[0]}
      // Tapping Entrar while the keyboard is up must submit, not just dismiss.
      keyboardShouldPersistTaps="handled">
      <View style={styles.bar}>
        <View style={styles.barRow}>
          <Text variant="callout" color="textSecondary">
            {copy.account.signIn}
          </Text>
          <Button label={copy.sheets.close} tone="quiet" full={false} onPress={onClose} />
        </View>
      </View>

      <SegmentedControl
        options={[
          { value: 'signin', label: e.signIn },
          { value: 'create', label: e.create },
        ]}
        value={mode}
        onChange={onMode}
        accessibilityLabel={e.modeLabel}
      />

      <View style={styles.intro}>
        <Text variant="title3">{create ? e.headingCreate : e.headingSignIn}</Text>
        <Text variant="footnote" color="textDim">
          {create ? e.subCreate : e.subSignIn}
        </Text>
      </View>

      <FormField
        label={e.emailLabel}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!busy}
      />
      <FormField
        ref={passwordRef}
        label={e.passwordLabel}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        // ⚠ `newPassword` in create mode is what makes iOS offer to generate
        // and save a strong password; `current-password` is what makes it
        // offer the saved one when signing in.
        autoComplete={create ? 'new-password' : 'current-password'}
        textContentType={create ? 'newPassword' : 'password'}
        returnKeyType="go"
        onSubmitEditing={submit}
        editable={!busy}
      />

      {/* The sheet's one accent (SPEC §2). Segment and submit share a label,
          exactly as the web's form does. */}
      <Button
        label={create ? e.create : e.signIn}
        onPress={submit}
        loading={busy}
        disabled={!submittable}
      />

      {create ? null : (
        <Button
          label={e.forgotPassword}
          tone="quiet"
          full={false}
          onPress={() => onForgotPassword(email.trim())}
          disabled={busy}
        />
      )}

      {error ? (
        <Text variant="footnote" color="danger">
          {error}
        </Text>
      ) : null}

      {notice ? (
        <View style={styles.noticeBlock}>
          <Text variant="footnote" color="textSecondary">
            {notice}
          </Text>
          {canResend ? (
            <Button
              label={resendLocked ? e.resendLocked : e.resendEmail}
              tone="secondary"
              full={false}
              onPress={() => onResend(email.trim())}
              disabled={resendLocked || busy}
            />
          ) : null}
        </View>
      ) : null}

      <Text variant="footnote" color="textFaint">
        {copy.auth.legal}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { marginHorizontal: -Spacing.five, backgroundColor: Colors.dark.sheetGround },
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
  noticeBlock: { gap: Spacing.two, alignItems: 'flex-start' },
});
