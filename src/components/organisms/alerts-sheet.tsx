/**
 * The subscribe / unsubscribe confirm.
 *
 * ⚠ **One sheet, both directions.** When already subscribed the primary action
 * flips to `Unsubscribe` — there is no separate destructive screen, because
 * unfollowing is reversible and the feed regenerates.
 *
 * ⚠ The unsubscribe copy must state that a calendar the reader already added
 * stays on their device. Revoking makes the `.ics` serve an empty calendar; it
 * cannot remove the subscription from their calendar app, and no server can.
 */
import { StyleSheet, View } from 'react-native';

import { Button, Crest, Eyebrow, Text } from '@/components/atoms';
import { Size, Spacing } from '@/constants/theme';

export interface AlertsSheetProps {
  clubName: string;
  crest: string | null;
  abbr: string;
  matches: number;
  subscribed: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  copy: {
    eyebrow: (club: string, matches: number) => string;
    title: (club: string) => string;
    body: string;
    bullets: readonly [string, string, string];
    confirm: string;
    unsubscribe: string;
    cancel: string;
    footnote: string;
    unsubscribeTitle: (club: string) => string;
    unsubscribeBody: string;
  };
}

export function AlertsSheet({
  clubName,
  crest,
  abbr,
  matches,
  subscribed,
  onConfirm,
  onCancel,
  copy,
}: AlertsSheetProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Crest src={crest} fallback={abbr} size={Size.crestCard} filled={!crest} />
        <Eyebrow>{copy.eyebrow(clubName, matches)}</Eyebrow>
      </View>

      <Text variant="title3">
        {subscribed ? copy.unsubscribeTitle(clubName) : copy.title(clubName)}
      </Text>
      <Text variant="body" color="textDim">
        {subscribed ? copy.unsubscribeBody : copy.body}
      </Text>

      {!subscribed ? (
        <View style={styles.bullets}>
          {copy.bullets.map((bullet) => (
            <View key={bullet} style={styles.bullet}>
              <Text variant="callout" color="accent" style={styles.check}>
                ✓
              </Text>
              <Text variant="body" style={styles.bulletText}>
                {bullet}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={subscribed ? copy.unsubscribe : copy.confirm}
          tone={subscribed ? 'danger' : 'primary'}
          onPress={onConfirm}
        />
        <Button label={copy.cancel} tone="quiet" onPress={onCancel} />
      </View>

      {!subscribed ? (
        <Text variant="footnote" color="textFaint">
          {copy.footnote}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: Spacing.five, gap: Spacing.three },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bullets: { gap: Spacing.two, marginVertical: Spacing.two },
  bullet: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  check: { width: 16 },
  bulletText: { flex: 1 },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
});
