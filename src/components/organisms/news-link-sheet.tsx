/**
 * The link-out sheet: says WHOSE article this is before it opens (ADR 0064;
 * excerpt + byline added at ADR 0129, from Ed's mock).
 *
 * ⚠ The app is not the author, so a third-party headline never opens as if
 * it were our own screen — the sheet names the publisher, quotes the
 * headline, shows the publisher's own summary, credits the byline, and the
 * one accent button is `Open at MARCA`. First-party pieces never reach this
 * sheet; the screen opens them directly.
 *
 * ⚠ The excerpt is a QUOTE, already truncated server-side on a word boundary
 * — clamped here at most, never re-cut. Null draws NOTHING (no dash, no gap
 * placeholder): one story in ten has none.
 *
 * ⚠ The initial chip is a one-off, deliberately: `Avatar` is the ACCOUNT
 * avatar (42pt minimum, signed-out semantics) and `Crest` is a club mark —
 * borrowing either would couple this byline to a contract it does not hold.
 *
 * ⚠ No `Grabber`: the route is a native `formSheet` and draws its own.
 */
import { StyleSheet, View } from 'react-native';

import { Button, Hairline, Text } from '@/components/atoms';
import { NewsMeta } from '@/components/molecules';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface NewsLinkSheetProps {
  title: string;
  topic: string | null;
  publisher: string;
  age: string;
  /** The publisher's own summary — null draws nothing. */
  excerpt: string | null;
  /** Fully formed — `By Javier Marcos · MARCA · 2 Sep, 06:22`. */
  byline: string;
  /** The chip's single letter — the byline name's initial. */
  initial: string;
  note: string;
  openLabel: string;
  shareLabel: string;
  /** `Save` / `Saved` — save lives on this sheet since ADR 0130. */
  saveLabel: string;
  saved: boolean;
  cancelLabel: string;
  onOpen: () => void;
  onShare: () => void;
  onToggleSave: () => void;
  onCancel: () => void;
}

export function NewsLinkSheet({
  title,
  topic,
  publisher,
  age,
  excerpt,
  byline,
  initial,
  note,
  openLabel,
  shareLabel,
  saveLabel,
  saved,
  cancelLabel,
  onOpen,
  onShare,
  onToggleSave,
  onCancel,
}: NewsLinkSheetProps) {
  return (
    <View style={styles.sheet}>
      <NewsMeta topic={topic} publisher={publisher} age={age} />
      <Text variant="title3">{title}</Text>
      {excerpt ? (
        <Text variant="body" color="textSecondary" style={styles.excerpt}>
          {excerpt}
        </Text>
      ) : null}
      <Hairline strength="mid" />
      <View style={styles.bylineRow}>
        <View style={styles.initialChip}>
          <Text variant="eyebrowSm" color="accent">
            {initial}
          </Text>
        </View>
        <Text variant="footnote" color="textSecondary" numberOfLines={1} style={styles.byline}>
          {byline}
        </Text>
      </View>
      <Text variant="footnote" color="textDim">
        {note}
      </Text>
      <View style={styles.actions}>
        <Button label={openLabel} onPress={onOpen} full />
        <View style={styles.secondary}>
          <View style={styles.third}>
            <Button label={shareLabel} tone="secondary" onPress={onShare} full />
          </View>
          <View style={styles.third}>
            <Button label={saveLabel} tone={saved ? 'primary' : 'secondary'} onPress={onToggleSave} full />
          </View>
          <View style={styles.third}>
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
  excerpt: { lineHeight: 22 },
  bylineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minWidth: 0 },
  initialChip: {
    width: Spacing.seven,
    height: Spacing.seven,
    borderRadius: Radius.chipSm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.accentWash,
  },
  byline: { flexShrink: 1, minWidth: 0 },
  actions: { gap: Spacing.two, paddingTop: Spacing.two },
  secondary: { flexDirection: 'row', gap: Spacing.two },
  third: { flex: 1 },
});
