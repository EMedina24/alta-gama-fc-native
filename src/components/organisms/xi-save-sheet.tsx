/**
 * Name and save the XI (ADR 0211, 0214) — one field and one lime button.
 *
 * ⚠ A blank name saves as "Lineup n", in the reader's language (the prototype
 * hardcoded English). The route re-checks that the XI may be saved, because a
 * deep link can open this sheet over a pitch that is not ready.
 */
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { SheetClose } from '@/components/molecules/sheet-close';
import { Colors, Radius, Spacing, Xi } from '@/constants/theme';

export interface XiSaveSheetProps {
  title: string;
  meta: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  saveLabel: string;
  /** Why Save is unavailable; null when it is available. */
  blocked: string | null;
  onSave: () => void;
  onClose: () => void;
  closeLabel: string;
}

export function XiSaveSheet(props: XiSaveSheetProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <View style={styles.title}>
          <Text variant="headline">{props.title}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {props.meta}
          </Text>
        </View>
        <SheetClose onPress={props.onClose} accessibilityLabel={props.closeLabel} />
      </View>
      {props.blocked ? (
        <Text variant="footnote" color="textSecondary">
          {props.blocked}
        </Text>
      ) : (
        <TextInput
          value={props.value}
          onChangeText={props.onChange}
          placeholder={props.placeholder}
          placeholderTextColor={Colors.dark.textFaint}
          maxLength={props.maxLength}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={props.onSave}
          style={styles.field}
          accessibilityLabel={props.placeholder}
        />
      )}
      <Button label={props.saveLabel} onPress={props.onSave} disabled={props.blocked !== null} tall />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: Spacing.four, paddingTop: Spacing.five, gap: Spacing.four, paddingBottom: Spacing.six },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { flex: 1, minWidth: 0, gap: 2 },
  field: {
    height: Xi.fieldH,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.three + 2,
    fontSize: Xi.fieldFont,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.glassFill,
  },
});
