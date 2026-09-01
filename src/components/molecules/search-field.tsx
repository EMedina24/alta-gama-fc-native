/**
 * The app's search field — a magnifier and an input in a double-bezel `Tray`
 * (ADR 0090): the near-black inner pill reads on the crown's bright band,
 * where the Clubs screen now carries it.
 *
 * Extracted from the onboarding picker (ADR 0082), which had it inline, so the
 * Clubs screen does not become a second copy. Both screens search the same
 * hundred clubs and must look like it.
 *
 * ⚠ `clearButtonMode="while-editing"` is the iOS ✕, not a control of ours. It is
 * the reason there is no clear button in this markup.
 */
import { StyleSheet, TextInput, View } from 'react-native';

import { SearchGlyph } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { Tray } from './tray';

export interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  /** Also the accessibility label — the field has no visible one. */
  placeholder: string;
}

export function SearchField({ value, onChangeText, placeholder }: SearchFieldProps) {
  return (
    <Tray radius={Radius.cardLg}>
      <View style={styles.field}>
        <SearchGlyph />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.dark.textFaint}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          accessibilityLabel={placeholder}
        />
      </View>
    </Tray>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    minHeight: Size.minTouch + 2,
    // The ground and radius are the Tray inner's now (ADR 0090); this row
    // only lays out the glyph and the input.
    paddingHorizontal: Spacing.four - 2,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: Size.minTouch + 2,
    color: Colors.dark.text,
    fontSize: 15,
  },
});
