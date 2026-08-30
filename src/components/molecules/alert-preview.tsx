/**
 * A sample lock-screen notification, on the alert primer (ADR 0076): the
 * reader sees what they are saying yes to before the system prompt spends
 * itself. Static — the copy is a SAMPLE, not a fixture.
 *
 * Tilted a degree so it reads as a card lying on the page, not a row of it.
 */
import { StyleSheet, View } from 'react-native';

import { Eyebrow, Mark, Text } from '@/components/atoms';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export interface AlertPreviewProps {
  eyebrow: string;
  title: string;
  body: string;
  time: string;
}

export function AlertPreview({ eyebrow, title, body, time }: AlertPreviewProps) {
  return (
    <View style={styles.card} accessible accessibilityLabel={`${eyebrow}. ${title}. ${body}`}>
      <View style={styles.icon}>
        <Mark width={Size.alertIconTile * 0.62} strokeWidth={2.6} />
      </View>
      <View style={styles.text}>
        <View style={styles.head}>
          <Eyebrow small color="moved">
            {eyebrow}
          </Eyebrow>
          <Text variant="caption" color="textMuted">
            {time}
          </Text>
        </View>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="footnote" color="textSecondary">
          {body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    paddingRight: Spacing.four,
    marginHorizontal: Spacing.two,
    borderRadius: Radius.card,
    backgroundColor: Colors.dark.raised,
    borderWidth: 1,
    borderColor: Colors.dark.hairlineStrong,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    transform: [{ rotate: '-1.2deg' }],
  },
  icon: {
    width: Size.alertIconTile,
    height: Size.alertIconTile,
    borderRadius: Radius.seg + 1,
    backgroundColor: Colors.dark.washGraphite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0, gap: Spacing.half + 1 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
