/**
 * A labelled text field: eyebrow label over a glass input — the pattern the
 * Export sheet drew inline (`xi-export-sheet.tsx`), extracted for the
 * email/password form (ADR 0103; ADR 0038 rejected that form partly because
 * this molecule did not exist).
 *
 * ⚠ Always `autoCapitalize="none"` and no autocorrect: every caller so far is
 * an email address or a password, and iOS "helpfully" capitalising either is a
 * failed sign-in that looks like a wrong credential.
 */
import type { Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/atoms';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';

export interface FormFieldProps {
  /** The eyebrow above the input; doubles as the field's accessibility label. */
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  autoComplete?: TextInputProps['autoComplete'];
  /** Drives iOS keychain/strong-password integration — pass `newPassword` on
   *  a create-account password so the system offers to generate one. */
  textContentType?: TextInputProps['textContentType'];
  keyboardType?: TextInputProps['keyboardType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  editable?: boolean;
  /** For focus hand-off (email → password) — React 19 ref-as-prop. */
  ref?: Ref<TextInput>;
}

export function FormField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  autoComplete,
  textContentType,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  editable = true,
  ref,
}: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text variant="eyebrowSm" color="textFaint">
        {label}
      </Text>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoComplete={autoComplete}
        textContentType={textContentType}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        editable={editable}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label}
        style={styles.input}
        placeholderTextColor={Colors.dark.textFaint}
        selectionColor={Colors.dark.accent}
        keyboardAppearance="dark"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  input: {
    ...Type.headline,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.glassFill,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
