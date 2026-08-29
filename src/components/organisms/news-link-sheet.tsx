/**
 * The link-out sheet: says WHOSE article this is before it opens (ADR 0064).
 *
 * ⚠ The app is not the author, so a third-party headline never opens as if
 * it were our own screen — the sheet names the publisher, quotes the
 * headline, and the one accent button is `Open at MARCA`. First-party pieces
 * never reach this sheet; the screen opens them directly.
 *
 * ⚠ No `Grabber`: the route is a native `formSheet` and draws its own.
 */
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/atoms';
import { NewsMeta } from '@/components/molecules';
import { Spacing } from '@/constants/theme';

export interface NewsLinkSheetProps {
  title: string;
  topic: string | null;
  publisher: string;
  age: string;
  note: string;
  openLabel: string;
  shareLabel: string;
  cancelLabel: string;
  onOpen: () => void;
  onShare: () => void;
  onCancel: () => void;
}

export function NewsLinkSheet({
  title,
  topic,
  publisher,
  age,
  note,
  openLabel,
  shareLabel,
  cancelLabel,
  onOpen,
  onShare,
  onCancel,
}: NewsLinkSheetProps) {
  return (
    <View style={styles.sheet}>
      <NewsMeta topic={topic} publisher={publisher} age={age} />
      <Text variant="title3">{title}</Text>
      <Text variant="footnote" color="textDim">
        {note}
      </Text>
      <View style={styles.actions}>
        <Button label={openLabel} onPress={onOpen} full />
        <View style={styles.secondary}>
          <View style={styles.half}>
            <Button label={shareLabel} tone="secondary" onPress={onShare} full />
          </View>
          <View style={styles.half}>
            <Button label={cancelLabel} tone="secondary" onPress={onCancel} full />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.seven,
    gap: Spacing.three,
  },
  actions: { gap: Spacing.two, paddingTop: Spacing.two },
  secondary: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
});
